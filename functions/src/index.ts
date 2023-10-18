import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https"
import { Optimizer } from "./genetic";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app"
import { HttpsError } from "firebase-functions/v1/auth";

initializeApp();

export const computePlan =
    onCall({ region: "europe-west3", cors: true }, async (request) => {
        logger.log("request", request);
        type Solution = Set<string>[];
        const firestore = getFirestore();
        const organization = request.data.organization;
        const organizationAdmin = (await firestore.doc("organizations/" + organization).get()).data()?.admin_uid;
        if (organizationAdmin !== request.auth?.uid) {
            throw new HttpsError("permission-denied", "You are not allowed to compute plans for this organization");
        }

        let users = [] as string[];
        let preferences = {} as { [key: string]: string[] };
        let availableTables = [] as number[];
        if (request.data.jsonInput === true) {
            users = request.data.users;
            preferences = request.data.preferences;
            availableTables = request.data.availableTables;
        } else {
            if (organization === "" || organization === undefined) {
                throw new HttpsError("invalid-argument", "No organization provided");
            }
            const organizationSnap = await firestore.doc("organizations/" + organization).get();
            if (organizationSnap.exists) {
                logger.log("Document data:", organizationSnap.data());
                users = organizationSnap.data()?.members;
                availableTables = organizationSnap.data()?.tables;
                const preferencesSnap = await firestore.collection("organizations/" + organization + "/preferences").get();
                logger.log(preferencesSnap);
                preferencesSnap.docs.forEach((doc) => {
                    preferences[doc.id] = doc.data().positive;
                });
                if (users.length === 0) {
                    throw new HttpsError("invalid-argument", "No users found");
                }
                if (availableTables.length === 0) {
                    throw new HttpsError("invalid-argument", "No tables found");
                }
            } else {
                throw new HttpsError("invalid-argument", "Organization document not found");
            }
        }

        let max_generations = 512;
        let initial_population_size = 500;
        let mutation_chance = 0.5;
        let selection_strength = 7;

        if (request.data.max_generations !== undefined) {
            max_generations = request.data.max_generations;
        }
        if (request.data.initial_population_size !== undefined) {
            initial_population_size = request.data.initial_population_size;
        }
        if (request.data.mutation_chance !== undefined) {
            mutation_chance = request.data.mutation_chance;
        }
        if (request.data.selection_strength !== undefined) {
            selection_strength = request.data.selection_strength;
        }

        const fitness = (solution: Solution) => {
            let score = 0;
            users.forEach((user) => {
                const personalPreferences = preferences[user] || [];
                let table: Set<string> | undefined = solution.find((table) => table.has(user));
                if (table === undefined) {
                    score -= 100;
                    return;
                }

                personalPreferences.forEach((preference) => {
                    if (!table?.has(preference)) {
                        score--;
                    }
                });
            });
            return score;
        }

        const crossover = (a: Solution, b: Solution) => {
            let different = false;
            a.forEach((table, index) => {
                if (!different) {
                    table.forEach((user) => {
                        if (!b[index].has(user)) {
                            different = true;
                        }
                    });
                }
            });
            if (!different) {
                return mutate(a);
            }

            const usersAopinion = new Map<string, number>();
            const usersBopinion = new Map<string, number>();

            a.forEach((table, index) => {
                table.forEach((user) => {
                    usersAopinion.set(user, index);
                });
            });
            b.forEach((table, index) => {
                table.forEach((user) => {
                    usersBopinion.set(user, index);
                });
            });

            const usersNewOpinion = new Map<string, number>();
            let tablesCapacity = availableTables.map((tableSize) => tableSize);
            users.forEach((user) => {
                let tableIndex = 0;
                if (Math.random() > 0.5) {
                    tableIndex = usersAopinion.get(user) || 0;
                } else {
                    tableIndex = usersBopinion.get(user) || 0;
                }
                if (tablesCapacity[tableIndex] <= 0) {
                    tableIndex = tablesCapacity.findIndex((capacity) => capacity > 0);
                }
                usersNewOpinion.set(user, tableIndex);
                tablesCapacity[tableIndex]--;
            });

            const newSolution = [] as Set<string>[];
            for (let i = 0; i < a.length; i++) {
                newSolution[i] = new Set();
            }
            usersNewOpinion.forEach((opinion, user) => {
                newSolution[opinion].add(user);
            });

            return newSolution;
        };

        const mutate = (solution: Solution) => {
            let newSolution = solution.sort((a, b) => b.size - a.size);
            const tableIndex = Math.floor(Math.random() * newSolution.length);
            const table = newSolution[tableIndex];
            if (table.size === 0) {
                return newSolution;
            }
            const userIndex = Math.floor(Math.random() * table.size);
            const user = Array.from(table)[userIndex];

            let freeTables = [] as number[];
            availableTables.forEach((tableSize, index) => {
                if (tableSize > newSolution[index].size) {
                    freeTables.push(index);
                }
            });
            if (freeTables.length === 0) {
                let otherTableIndex = Math.floor(Math.random() * newSolution.length);
                let otherUserIndex = Math.floor(Math.random() * newSolution[otherTableIndex].size);
                let otherUser = Array.from(newSolution[otherTableIndex])[otherUserIndex];
                newSolution[otherTableIndex].delete(otherUser);
                newSolution[tableIndex].delete(user);
                newSolution[otherTableIndex].add(user);
                newSolution[tableIndex].add(otherUser);
                newSolution = newSolution.sort((a, b) => b.size - a.size);
                return newSolution;
            }
            const newTableIndex = freeTables[Math.floor(Math.random() * freeTables.length)];
            newSolution[tableIndex].delete(user);
            newSolution[newTableIndex].add(user);
            newSolution = newSolution.sort((a, b) => b.size - a.size);
            return newSolution;
        };

        let scores = [] as number[];

        const endCondition = (solution: Solution, score: number, generation: number) => {
            scores.push(score);
            return generation >= max_generations || score === 0;
        };

        let optimizer = new Optimizer<Solution>({
            evaluate: fitness,
            crossover: crossover,
            endCondition: endCondition,
            mutate: mutate,
            selectionStrength: selection_strength,
            mutationChance: mutation_chance,
        });

        const startTime = Date.now();

        const shuffleArray = (inputArray: any[]) => {
            let array = inputArray.map((x) => x);
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array
        }

        let population = [] as Solution[];

        for (let i = 0; i < initial_population_size; i++) {
            let currentlyAvailableTables = availableTables.map((x) => x).sort((a, b) => a - b);
            let basisSolution = currentlyAvailableTables.map(() => new Set()) as Solution;
            let seatedUsers = new Set<string>();
            for (let user of shuffleArray(users)) {
                if (seatedUsers.has(user)) {
                    continue;
                }
                const userPreferenceList = preferences[user] || [];
                if (userPreferenceList.length === 0) {
                    continue;
                }
                for (let tableIndex = 0; tableIndex < currentlyAvailableTables.length; tableIndex++) {
                    const tableSize = currentlyAvailableTables[tableIndex];
                    if (tableSize === 0) {
                        continue;
                    }
                    if (tableSize < userPreferenceList.length + 1) {
                        continue;
                    }
                    basisSolution[tableIndex].add(user);
                    seatedUsers.add(user);
                    currentlyAvailableTables[tableIndex]--;
                    userPreferenceList.forEach((preference) => {
                        if (seatedUsers.has(preference)) {
                            return;
                        }
                        basisSolution[tableIndex].add(preference);
                        seatedUsers.add(preference);
                        currentlyAvailableTables[tableIndex]--;
                    });
                    break;
                }
            }

            let newSolution = basisSolution.map((table) => new Set(table));
            users.forEach((user) => {
                if (seatedUsers.has(user)) {
                    return;
                }
                let freeTables = [] as number[];
                availableTables.forEach((tableSize, index) => {
                    let solutionTableUsed = newSolution[index]?.size || 0;
                    if (tableSize - solutionTableUsed >= 1) {
                        freeTables.push(index);
                    }
                });
                let tableIndex = freeTables[Math.floor(Math.random() * freeTables.length)];
                if (newSolution[tableIndex] === undefined) {
                    newSolution[tableIndex] = new Set();
                }
                newSolution[tableIndex].add(user);
                seatedUsers.add(user);
            });
            population[i] = newSolution;
        }
        function optimize(optimizer: Optimizer<Solution>) {
            return optimizer.findOptimal(population);
        };
        const foundSolution = optimize(optimizer);
        logger.log(foundSolution.input);
        let bestScore = fitness(foundSolution.input);
        logger.log("bestScore", bestScore);
        logger.log("Computation time", (Date.now() - startTime) / 1000);
        logger.log("Scores", scores);
        let results = foundSolution.input.map((table, index) => {
            logger.log("table, index", table, index);
            return [availableTables[index], Array.from(table).map((user) => {
                logger.log("user, preference", user, preferences[user]);
                if (preferences[user] === undefined) {
                    return [user, true];
                }
                return [user, preferences[user].every((preference) => table.has(preference))]
            })];
        });
        logger.log("results", results);
        const date = (new Date()).toISOString();
        await firestore.doc("organizations/" + request.data.organization + "/plans/" + date).create({
            users: users,
            preferences: JSON.stringify(preferences),
            availableTables: availableTables,
            results: JSON.stringify(results),
            bestScore: bestScore,
            date: date,
        }).catch((error) => {
            logger.error(error);
            throw new HttpsError("internal", "Error while saving results");
        }).then(async (docref) => {
            await firestore.doc("organizations/" + request.data.organization).update({
                plans: FieldValue.arrayUnion(date)
            });
        });

        return { results, bestScore };
    });
