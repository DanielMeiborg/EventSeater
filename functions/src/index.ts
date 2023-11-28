import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https"
import { Optimizer } from "./genetic";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app"
import { HttpsError } from "firebase-functions/v1/auth";
import * as _ from "lodash";

initializeApp();

export const computePlan =
    onCall({ region: "europe-west3", cors: true, timeoutSeconds: 300 }, async (request) => {
        type Solution = Set<string>[];
        const firestore = getFirestore();
        const organization = request.data.organization;
        const organizationAdmin = (await firestore.doc("organizations/" + organization).get()).data()?.admin_uid;
        if (organizationAdmin !== request.auth?.uid) {
            logger.error("User", request.auth?.uid, "is not admin of organization", organization);
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
                logger.error("No organization provided");
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
                    preferences[doc.id] = doc.data().members;
                });
                if (users.length === 0) {
                    logger.error("No users found");
                    throw new HttpsError("invalid-argument", "No users found");
                }
                if (availableTables.length === 0) {
                    logger.error("No tables found");
                    throw new HttpsError("invalid-argument", "No tables found");
                }
            } else {
                logger.error("Organization document not found");
                throw new HttpsError("invalid-argument", "Organization document not found");
            }
        }

        availableTables = availableTables.map((table) => table).sort((a, b) => a - b);
        let max_generations = 128;
        let initial_population_size = 50;
        let selection_strength = 7;

        if (request.data.max_generations !== undefined) {
            max_generations = request.data.max_generations;
        }
        if (request.data.initial_population_size !== undefined) {
            initial_population_size = request.data.initial_population_size;
        }
        if (request.data.selection_strength !== undefined) {
            selection_strength = request.data.selection_strength;
        }

        const checkTables = (tables: number[], solution: Solution) => {
            const solutionTables = solution.map((table) => table.size).sort((a, b) => a - b);
            const sortedTables = tables.map((table) => table).sort((a, b) => a - b);
            for (let i = 0; i < solutionTables.length; i++) {
                if (solutionTables[i] > sortedTables[i]) {
                    return false;
                }
            }
            return true;
        };

        const fitness = (solution: Solution) => {
            if (!checkTables(availableTables, solution)) {
                return -1000;
            }
            let score = 0;
            users.forEach((user) => {
                const personalPreferences = preferences[user] || [];
                let table: Set<string> | undefined = solution.find((table) => table.has(user));
                if (table === undefined) {
                    score = -1000;
                    logger.warn("user not seated", user);
                    return;
                }

                personalPreferences.forEach((preference) => {
                    if (table !== undefined) {
                        if (!table.has(preference)) {
                            score--;
                            // logger.debug("preference not fulfilled", user, preference, preferences[user]);
                        }
                    } else {
                        score = -1000;
                        logger.warn("user not seated", user);
                    }
                });
            });
            const possibleTables = getPossibleTables(solution);
            const tinyTables = solution.filter((table) => table.size < 4 && table.size > 0).map((table) => (4 - table.size) ** 2);
            score -= _.sum(tinyTables) / 1000;
            score -= (availableTables.length - possibleTables.length) / 100000;
            return score;
        }

        const getPossibleTables = (solution: Solution) => {
            return solution.map((table, index) => [table, index] as [Set<string>, number]).filter((table) => {
                const tableArray = Array.from(table[0]);
                if (table[0].size === 0) {
                    return true;
                }
                if (table[0].size !== availableTables[table[1]]) {
                    return true;
                }

                let wishedForUsers = new Set<string>();
                tableArray.forEach((user) => {
                    if (preferences[user] !== undefined) {
                        if (preferences[user].length > 0) {
                            wishedForUsers.add(user);
                            preferences[user].forEach((preference) => {
                                wishedForUsers.add(preference);
                            });
                        }
                    }
                });
                for (let user of tableArray) {
                    if (!wishedForUsers.has(user)) {
                        return true;
                    }
                }

                for (let user of tableArray) {
                    if (preferences[user] !== undefined) {
                        for (let preference of preferences[user]) {
                            if (!table[0].has(preference)) {
                                return true;
                            }
                        }
                    }
                };

                return false;
            });
        };

        const mutate = (solution: Solution) => {
            let newSolution = solution.sort((a, b) => a.size - b.size);

            let freeTables = [] as number[];
            const sortedTables = availableTables.map((table) => table).sort((a, b) => a - b);
            for (let i = 0; i < newSolution.length; i++) {
                if (newSolution[i].size < sortedTables[i]) {
                    freeTables.push(i);
                }
            }

            const possibleTables = getPossibleTables(newSolution);
            // logger.debug("mutate possibleTables", possibleTables.length);
            if (possibleTables.length === 0) {
                return newSolution;
            }
            const occupiedPossibleTables = possibleTables.filter((table) => table[0].size > 0);
            const [table, tableIndex] = occupiedPossibleTables[Math.floor(Math.random() * occupiedPossibleTables.length)];
            const userIndex = Math.floor(Math.random() * table.size);
            const user = Array.from(table)[userIndex];

            if (freeTables.length === 0 || Math.random() > 0.5) {
                const [otherTable, otherTableIndex] = occupiedPossibleTables[Math.floor(Math.random() * occupiedPossibleTables.length)];
                const otherUserIndex = Math.floor(Math.random() * otherTable.size);
                const otherUser = Array.from(otherTable)[otherUserIndex];
                newSolution[otherTableIndex].delete(otherUser);
                newSolution[tableIndex].delete(user);
                newSolution[otherTableIndex].add(user);
                newSolution[tableIndex].add(otherUser);
                newSolution = newSolution.sort((a, b) => a.size - b.size);
                if (!checkTables(availableTables, newSolution)) {
                    logger.warn("swap mutate not valid");
                }
                // logger.debug("swap mutate", fitness(newSolution) > startingScore, startingScore, fitness(newSolution));
                return newSolution;
            }

            const freePossibleTables = possibleTables.filter((table) => freeTables.includes(table[1]));
            const newTableIndex = freePossibleTables[Math.floor(Math.random() * freePossibleTables.length)][1];
            newSolution[tableIndex].delete(user);
            newSolution[newTableIndex].add(user);
            newSolution = newSolution.sort((a, b) => a.size - b.size);
            if (!checkTables(availableTables, newSolution)) {
                logger.warn("move mutate not valid", solution.map((table) => table.size).sort((a, b) => a - b));
            }
            // logger.debug("move mutate", fitness(newSolution) > startingScore, startingScore, fitness(newSolution));
            return newSolution;
        };

        let scores = [] as number[];

        const endCondition = (solution: Solution, score: number, generation: number) => {
            scores.push(score);
            return generation >= max_generations || score === 0;
        };

        let optimizer = new Optimizer<Solution>({
            evaluate: fitness,
            endCondition: endCondition,
            mutate: mutate,
            selectionStrength: selection_strength,
        });

        const startTime = Date.now();


        logger.debug("Base solution");
        let baseSolution = availableTables.map(() => new Set()) as Solution;
        let baseSeatedUsers = new Set<string>();
        let demandedUsers = [] as [string, string][];
        let conflictingUsers = new Set<string>();
        // (user1, user2, union of preferences)
        let conflicts = [] as [string, string, string[]][];
        users.forEach((user) => {
            if (preferences[user] !== undefined) {
                if (preferences[user].length > 0) {
                    demandedUsers.push([user, user]);
                    preferences[user].forEach((preference) => {
                        const demandedUserIndex = demandedUsers.findIndex((demand) => demand[1] === preference);
                        if (demandedUserIndex === -1) {
                            demandedUsers.push([user, preference]);
                        } else {
                            conflictingUsers.add(user);
                            conflictingUsers.add(demandedUsers[demandedUserIndex][0]);
                            const conflictA = conflicts.find((conflict) => conflict[0] === user && conflict[1] === demandedUsers[demandedUserIndex][0]);
                            const conflictB = conflicts.find((conflict) => conflict[0] === demandedUsers[demandedUserIndex][0] && conflict[1] === user);
                            if (conflictA === undefined && conflictB === undefined) {
                                let combinedPreferences = _.cloneDeep(preferences[user]);
                                preferences[demandedUsers[demandedUserIndex][0]].forEach((preference) => {
                                    if (!combinedPreferences.includes(preference)) {
                                        combinedPreferences.push(preference);
                                    } else {
                                        combinedPreferences = combinedPreferences.filter(x => x !== preference);
                                        combinedPreferences.unshift(preference);
                                    }
                                });
                                conflicts.push([user, demandedUsers[demandedUserIndex][0], combinedPreferences]);
                            }
                        }
                    });
                }
            }
        });
        logger.debug("conflictingUsers", conflictingUsers);
        logger.debug("conflicts", conflicts);
        const notConflictingUsers = users.filter((user) => !conflictingUsers.has(user));
        for (let user of notConflictingUsers) {
            if (baseSeatedUsers.has(user)) {
                continue;
            }
            const userPreferenceList = preferences[user] || [];
            if (userPreferenceList.length === 0) {
                continue;
            }
            const validDemands = userPreferenceList.filter((preference) => !baseSeatedUsers.has(preference));
            const sortedAvailableTables = baseSolution
                .map((table, index) => {
                    return [availableTables[index] - table.size - validDemands.length - 1, index] as [number, number];
                })
                .sort((a, b) => a[0] - b[0])
                .filter((table) => table[0] === 0);
            if (sortedAvailableTables.length > 0) {
                const tableIndex = sortedAvailableTables[0][1];
                baseSolution[tableIndex].add(user);
                baseSeatedUsers.add(user);
                userPreferenceList.forEach((preference) => {
                    if (baseSeatedUsers.has(preference)) {
                        return;
                    }
                    baseSolution[tableIndex].add(preference);
                    baseSeatedUsers.add(preference);
                });
            }
        }
        logger.debug("Base solution with behaving users", baseSolution.map((table) => table.size).sort(), baseSolution);
        for (let conflict of conflicts) {
            logger.debug("conflict", conflict);
            const combinedPreferences = conflict[2];
            const sortedAvailableTables = baseSolution
                .map((table, index) => {
                    return [availableTables[index] - table.size - combinedPreferences.length - 2, index] as [number, number];
                })
                .sort((a, b) => a[0] - b[0])
                .filter((table) => table[0] === 0);
            logger.debug("sortedAvailableTables", sortedAvailableTables);
            if (sortedAvailableTables.length > 0) {
                const tableIndex = sortedAvailableTables[0][1];
                baseSolution[tableIndex].add(conflict[0]);
                baseSeatedUsers.add(conflict[0]);
                baseSolution[tableIndex].add(conflict[1]);
                baseSeatedUsers.add(conflict[1]);
                combinedPreferences.forEach((preference) => {
                    if (baseSeatedUsers.has(preference)) {
                        return;
                    }
                    baseSolution[tableIndex].add(preference);
                    baseSeatedUsers.add(preference);
                });
                conflicts = conflicts.filter(otherConflict => otherConflict[0] !== conflict[0]);
            }
        }
        logger.debug("Base solution with conflict groups", baseSolution.map((table) => table.size).sort(), baseSolution);

        availableTables.forEach((tableSize, index) => {
            if (conflicts.length === 0) {
                return;
            }
            const usedCapacity = baseSolution[index].size;
            const freeCapacity = tableSize - usedCapacity;
            if (usedCapacity >= freeCapacity) {
                return;
            }
            logger.debug("freeCapacity, usedCapacity", freeCapacity, usedCapacity);
            const sortedConflicts = conflicts.filter((conflict) => conflict[2].length + 2 <= freeCapacity).sort((a, b) => b[2].length - a[2].length);
            logger.debug("sortedConflicts", sortedConflicts);
            if (sortedConflicts.length === 0) {
                return;
            } else {
                const userA = sortedConflicts[0][0];
                const userB = sortedConflicts[0][1];
                const combinedPreferences = sortedConflicts[0][2];
                logger.log("userA, userB, combinedPreferences", userA, userB, combinedPreferences);
                conflicts = conflicts.filter((conflict) => conflict[0] !== userA);
                baseSolution[index].add(userA);
                baseSeatedUsers.add(userA);
                baseSolution[index].add(userB);
                baseSeatedUsers.add(userB);
                combinedPreferences.forEach((preference) => {
                    if (baseSeatedUsers.has(preference)) {
                        return;
                    }
                    baseSolution[index].add(preference);
                    baseSeatedUsers.add(preference);
                });
                logger.debug("newSolution", baseSolution);
            }
        });
        logger.debug("Base solution with next best lower fitting conflicts", baseSolution.map((table) => table.size).sort(), baseSolution);

        conflicts.forEach((conflict) => {
            const userA = conflict[0];
            const userB = conflict[1];
            const combinedPreferences = conflict[2];
            logger.log("conflict", conflict);
            const tables = availableTables.map((tableSize, index) => {
                const freeCapacity = tableSize - baseSolution[index].size;
                return [index, freeCapacity] as [number, number];
            }).sort((a, b) => b[1] - a[1]);
            logger.debug("tables", tables);
            if (tables.length === 0) {
                return;
            }
            let tableIndex = tables[0][0];
            if (tables[0][1] >= 2) {
                baseSolution[tableIndex].add(userA);
                baseSeatedUsers.add(userA);
                baseSolution[tableIndex].add(userB);
                baseSeatedUsers.add(userB);

                let addedUsers = [] as string[];
                for (let i = 0; i < combinedPreferences.length && baseSolution[tableIndex].size < availableTables[tableIndex]; i++) {
                    baseSolution[tableIndex].add(combinedPreferences[i]);
                    baseSeatedUsers.add(combinedPreferences[i]);
                    addedUsers.push(combinedPreferences[i]);
                }
                logger.debug("addedUsers", addedUsers);
            }
            logger.debug("new baseSolution", baseSolution);
        });
        logger.debug("Base solution with next best upper fitting conflicts", baseSolution.map((table) => table.size).sort(), baseSolution);

        for (let user of Array.from(conflictingUsers).sort((a, b) => preferences[a].length - preferences[b].length)) {
            if (baseSeatedUsers.has(user)) {
                continue;
            }
            const userPreferenceList = preferences[user] || [];
            if (userPreferenceList.length === 0) {
                continue;
            }
            const validDemands = userPreferenceList.filter((preference) => !baseSeatedUsers.has(preference));
            const sortedAvailableTables = baseSolution
                .map((table, index) => {
                    return [availableTables[index] - table.size - validDemands.length - 1, index] as [number, number];
                })
                .sort((a, b) => a[0] - b[0])
                .filter((table) => table[0] === 0);
            if (sortedAvailableTables.length > 0) {
                const tableIndex = sortedAvailableTables[0][1];
                baseSolution[tableIndex].add(user);
                baseSeatedUsers.add(user);
                userPreferenceList.forEach((preference) => {
                    if (baseSeatedUsers.has(preference)) {
                        return;
                    }
                    baseSolution[tableIndex].add(preference);
                    baseSeatedUsers.add(preference);
                });
            }
        }

        logger.debug("Base solution with conflicting users", baseSolution.map((table) => table.size).sort(), baseSolution);

        let userDemands = [] as [string, number][];
        _.shuffle(users).forEach((user) => {
            if (baseSeatedUsers.has(user)) {
                return;
            }
            const userPreferenceList = preferences[user];
            if (userPreferenceList !== undefined) {
                const validDemands = userPreferenceList.filter((preference) => !baseSeatedUsers.has(preference));
                userDemands.push([user, validDemands.length + 1]);
            }
        });
        logger.debug("userDemands", userDemands);
        availableTables.forEach((tableSize, index) => {
            if (userDemands.length === 0) {
                return;
            }
            const usedCapacity = baseSolution[index].size;
            const freeCapacity = tableSize - usedCapacity;
            if (usedCapacity >= freeCapacity) {
                return;
            }
            logger.debug("freeCapacity, usedCapacity", freeCapacity, usedCapacity);
            const sortedDemands = userDemands.filter((userDemand) => userDemand[1] + 1 <= freeCapacity).sort((a, b) => b[1] - a[1]);
            logger.debug("sortedDemands", sortedDemands);
            if (sortedDemands.length === 0) {
                return;
            } else {
                const user = sortedDemands[0][0];
                logger.log("user", user);
                userDemands = userDemands.filter((userDemand) => userDemand[0] !== user);
                baseSolution[index].add(user);
                baseSeatedUsers.add(user);
                preferences[user].forEach((preference) => {
                    if (baseSeatedUsers.has(preference)) {
                        return;
                    }
                    baseSolution[index].add(preference);
                    baseSeatedUsers.add(preference);
                });
                logger.debug("newSolution", baseSolution);
            }
        });
        userDemands.forEach((userDemand) => {
            const user = userDemand[0];
            const userPreferenceList = preferences[user];
            logger.log("user, userPreferenceList", user, userPreferenceList);
            const tables = availableTables.map((tableSize, index) => {
                const freeCapacity = tableSize - baseSolution[index].size;
                return [index, freeCapacity] as [number, number];
            }).sort((a, b) => b[1] - a[1]);
            logger.debug("tables", tables);
            if (tables.length === 0) {
                return;
            }
            let tableIndex = tables[0][0];
            if (tables[0][1] >= 1) {
                baseSolution[tableIndex].add(user);
                baseSeatedUsers.add(user);

                let addedUsers = [] as string[];
                for (let i = 0; i < userPreferenceList.length && baseSolution[tableIndex].size < availableTables[tableIndex]; i++) {
                    baseSolution[tableIndex].add(userPreferenceList[i]);
                    baseSeatedUsers.add(userPreferenceList[i]);
                    addedUsers.push(userPreferenceList[i]);
                }
                logger.debug("addedUsers", addedUsers);
            }
            logger.debug("new baseSolution", baseSolution);
        });

        const remainingUsers = users.filter((user) => !baseSeatedUsers.has(user));
        logger.debug("remaining users:", remainingUsers.length, remainingUsers);

        let population = [] as Solution[];
        for (let i = 0; i < initial_population_size; i++) {
            let newSolution = _.cloneDeep(baseSolution);
            let seatedUsers = _.cloneDeep(baseSeatedUsers);

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
            users.forEach((user) => {
                if (!seatedUsers.has(user)) {
                    logger.error("user not seated in initial population", user);
                }
            });
            if (!checkTables(availableTables, newSolution)) {
                logger.warn("initial population not valid");
            }
            // logger.debug("initial population", i, newSolution);
        }
        logger.debug("initial population 0", population[0]);

        function optimize(optimizer: Optimizer<Solution>) {
            return optimizer.findOptimal(population);
        };

        let foundSolution = optimize(optimizer);
        foundSolution.input = foundSolution.input.sort((a, b) => a.size - b.size);
        availableTables = availableTables.sort((a, b) => a - b);
        logger.log("solution", foundSolution.input);
        let bestScore = Math.ceil(fitness(foundSolution.input));
        logger.log("bestScore", bestScore);
        logger.log("Computation time", (Date.now() - startTime) / 1000);
        let results = foundSolution.input.map((table, index) => {
            return [availableTables[index], Array.from(table).map((user) => {
                if (preferences[user] === undefined) {
                    let wishedFor = false;
                    table.forEach((otherUser) => {
                        if (preferences[otherUser] === undefined) {
                        } else {
                            if (preferences[otherUser].includes(user)) {
                                wishedFor = true;
                            }
                        }
                    });
                    return [user, true, wishedFor];
                } else {
                    return [user, preferences[user].every((preference) => table.has(preference)), true]
                }
            })];
        });
        users.forEach((user) => {
            for (let table of foundSolution.input) {
                if (table.has(user)) {
                    return;
                }
            };
            logger.warn("user not seated", user);
        });
        const resultsJson = JSON.stringify(results);
        logger.log("results", resultsJson);
        const date = (new Date()).toISOString();
        await firestore.doc("organizations/" + request.data.organization + "/plans/" + date).create({
            results: resultsJson,
            bestScore: bestScore,
        }).catch((error) => {
            logger.error("Error while saving results", error);
            throw new HttpsError("internal", "Error while saving results");
        }).then(async (docref) => {
            await firestore.doc("organizations/" + request.data.organization).update({
                plans: FieldValue.arrayUnion(date)
            });
        });

        return { results, bestScore };
    });
