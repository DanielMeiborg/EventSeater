<template>
    <div class="flex flex-col items-center w-full gap-10 lg:flex-row lg:items-start lg:justify-center">
        <div class="flex flex-col items-center min-w-min">
            <button v-if="planStatus == 'idle'" class="btn btn-accent btn-wide mb-5"
                @click="computeBasePlan(false)">Basis-Sitzplan berechnen</button>
            <button v-else-if="planStatus == 'base-plan'" class="btn btn-accent btn-wide mb-5" @click="planStatus = 'conflicts'
                ">Konflikte anzeigen</button>
            <button v-else-if="planStatus == 'conflicts' && conflicts.length == 0" class="btn btn-accent btn-wide mb-5"
                @click="distributeLowerFittingTables()">Kleinere Tische verteilen</button>
            <button v-else-if="planStatus == 'conflicts' && conflicts.length > 0"
                class="btn btn-accent btn-wide mb-5 btn-disabled">Kleinere Tische verteilen</button>
            <button v-else-if="planStatus == 'lower-tables'" class="btn btn-accent btn-wide mb-5"
                @click="planStatus = 'upper-tables'">Zu große Tische
                verteilen</button>
            <button v-else-if="planStatus == 'other-tables' && conflicts.length == 0" class="btn btn-accent btn-wide mb-5"
                @click="planStatus = 'remaining-users'">Übrige Mitglieder anzeigen</button>
            <!-- <p class="badge badge-secondary">{{ planStatus }}</p> -->
            <div class="collapse collapse-arrow border border-base-300 bg-primary mt-5 max-w-prose">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium text-[#ECFEF5]">
                    Erweiterte Einstellungen
                </div>
                <div class="collapse-content flex flex-col items-center text-[#ECFEF5]">
                    <!-- <div class="flex justify-between w-full mb-5">
                        <p class="min-w-max">Generationen</p> <span class="badge badge-accent mr-7 ml-3">{{
                            max_generations
                        }}</span><input v-model="maxGenerationsExponent" type="range" min="0" max="13"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Populationsgröße</p> <span class="badge badge-accent mr-7 ml-3">{{ initial_population_size
                        }}</span><input v-model="initial_population_size" type="range" min="1" max="1000"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Selektionsstärke</p> <span class="badge badge-accent mr-7 ml-3">{{ selection_strength
                        }}</span><input v-model="selection_strength" type="range" min="2" max="100" step="1"
                            class="range range-sm" />
                    </div> -->
                    <div class="flex justify-between w-full items-center flex-col md:flex-row">
                        <button class="btn btn-accent btn-wide min-w-max md:mr-7 md:mb-0 mb-3"
                            @click="computeBasePlan(true)">Basis-Sitzplan mit JSON-Input berechnen</button>
                        <textarea v-model="rawJson"
                            placeholder='{"users": ["a", "b", "c"], "preferences": {"a": ["b"]}, "tables": [2, 2]}'
                            class="textarea textarea-bordered textarea-accent w-full" />
                    </div>
                </div>
            </div>
        </div>
        <div class="flex flex-col items-center">
            <div v-if="planStatus == 'conflicts'">
                <h2 class="text-3xl font-bold mr-5 mb-7">Konflikte</h2>
                <p v-if="conflicts.length == 0">Keine Konflikte vorhanden</p>
                <div v-else>
                    <div v-for="conflict in conflicts" :key="conflict[0]" class="flex flex-col items-center mb-5">
                        <div class="flex flex-col items-center">
                            <span class="text-xl font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">
                                {{ members[conflict[0]] }} und {{ members[conflict[1]] }}</span>
                            <div class="flex justify-between gap-10">
                                <div class="flex flex-col items-center">
                                    <h3 class="text-lg font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">
                                        Überschneidungen
                                    </h3>
                                    <div class="flex flex-col justify-center items-center">
                                        <div v-for="user in conflict[3]" class="my-2">
                                            <span class="badge badge-primary">{{ members[user] }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-col items-center">
                                    <h3 class="text-lg font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">
                                        Kombinierter Tisch
                                    </h3>
                                    <div class="flex flex-col justify-center items-center">
                                        <div v-for="user in conflict[2]" class="my-2">
                                            <span class="badge badge-primary">{{ members[user] }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-accent btn-wide mt-5" @click="solveConflictUnion(conflict)">Konflikt
                            durch Kombination der Wünsche lösen</button>
                        <button class="btn btn-accent btn-wide mt-5" @click="solveConflictOneSide(true, conflict)">Konflikt
                            für {{ members[conflict[0]] }} lösen</button>
                        <button class="btn btn-accent btn-wide mt-5" @click="solveConflictOneSide(false, conflict)">Konflikt
                            für {{ members[conflict[1]] }} lösen</button>
                        <button class="btn btn-accent btn-wide mt-5" @click="removeConflict(conflict)">Konflikt
                            ignorieren</button>
                    </div>
                </div>
            </div>
            <div v-else-if="planStatus == 'remaining-users'">
                <h2 class="text-3xl font-bold mr-5 mb-7">Übrige Mitglieder</h2>
                <div class="grid grid-cols-3 gap-5">
                    <button v-for="user in remainingUsers" :key="user" class="btn btn-accent" @click="">{{ members[user]
                    }}</button>
                </div>
            </div>
            <Plan v-if="richCurrentBestPlan !== null && score !== null" :results="richCurrentBestPlan" :score="score" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { getDoc, doc, getFirestore, collection, getDocs } from "firebase/firestore/lite";
const db = getFirestore();

type Solution = Set<string>[];

let input = $(useLocalStorage("algorithm-input", ""));
let currentBestPlan = $ref<Solution>([]);
let richCurrentBestPlan = $ref<[number, [string, boolean, boolean][]][]>([]);
let planStatus = $ref("idle");
let rawJson = $ref("");
let score = $ref<number | null>(0);

let organization = $(useLocalStorage("organization", ""));

let users = $ref<string[]>([]);
let preferences = $ref<{ [user: string]: string[] }>({});
let availableTables = $ref<number[]>([]);

let seatedUsers = $ref<Set<string>>(new Set());

let remainingUsers = $computed(() => {
    return users.filter((user) => !seatedUsers.has(user));
});

let conflictingUsers = $ref<Set<string>>(new Set());

type Conflict = [string, string, string[], string[]];
let conflicts = $ref<Conflict[]>([]);

let members = await useMembers();

// const maxGenerationsExponent = $ref(7);
// const max_generations = $computed(() => Math.pow(2, maxGenerationsExponent));
// const initial_population_size = $ref(100);
// const mutation_chance = $ref(0.5);
// const selection_strength = $ref(7);

const parseJson = () => {
    users = [];
    preferences = {};
    availableTables = [];
    try {
        const parsed = JSON.parse(rawJson);
        if (parsed.users.length === 0 || parsed.tables.length === 0, parsed.preferences === undefined) {
            console.log(parsed);
            useBanner("JSON-Input ist ungültig", "error");
            return;
        }
        users = parsed.users;
        preferences = parsed.preferences;
        availableTables = parsed.tables;
    } catch (e) {
        console.log(e);
        useBanner("JSON-Input ist ungültig", "error");
    }
};

const formatRichPlan = (solution: Solution) => {
    let results: [number, [string, boolean, boolean][]][] = solution.map((table, index) => {
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
    return results;
};

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

// TODO: implement
const fitness = (solution: Solution) => {
    return 0;
}

const computeBasePlan = async (useJson: boolean) => {
    if (organization === "") {
        useBanner("Keine Organisation ausgewählt", "error");
        return;
    }

    if (useJson) {
        parseJson();
        if (users.length === 0) {
            useBanner("Keine Mitglieder gefunden", "error");
            return;
        }
        if (availableTables.length === 0) {
            useBanner("Keine Tische gefunden", "error");
            return;
        }
    } else {
        const organizationDoc = (await getDoc(doc(db, "organizations", organization))).data();
        users = organizationDoc?.members;
        availableTables = organizationDoc?.tables;
        const preferencesDoc = await getDocs(collection(db, "organizations", organization, "preferences"));
        preferencesDoc.forEach((doc) => {
            preferences[doc.id] = doc.data().members;
        });
    }
    const auth = useFirebaseAuth();
    if (auth?.currentUser === null) {
        useBanner("Nicht angemeldet", "error");
        console.log("not logged in");
        return;
    }
    console.log("users", users);
    console.log("preferences", preferences);
    console.log("availableTables", availableTables);

    console.log("Base solution");
    availableTables.forEach((table) => {
        currentBestPlan.push(new Set());
    });
    let demandedUsers = [] as [string, string][];
    users.forEach((user) => {
        if (preferences[user] !== undefined) {
            if (preferences[user].length > 0) {
                let conflictTargets = [] as string[];
                demandedUsers.push([user, user]);
                preferences[user].forEach((preference) => {
                    const demandedUserIndex = demandedUsers.findIndex((demand) => demand[1] === preference);
                    if (demandedUserIndex === -1) {
                        demandedUsers.push([user, preference]);
                    } else {
                        conflictTargets.push(preference);
                        conflictingUsers.add(user);
                        conflictingUsers.add(demandedUsers[demandedUserIndex][0]);
                        const conflictA = conflicts.find((conflict) => conflict[0] === user && conflict[1] === demandedUsers[demandedUserIndex][0]);
                        const conflictB = conflicts.find((conflict) => conflict[0] === demandedUsers[demandedUserIndex][0] && conflict[1] === user);
                        if (conflictA === undefined && conflictB === undefined) {
                            let combinedPreferences: string[] = JSON.parse(JSON.stringify(preferences[user]));
                            preferences[demandedUsers[demandedUserIndex][0]].forEach((preference) => {
                                if (!combinedPreferences.includes(preference)) {
                                    combinedPreferences.push(preference);
                                } else {
                                    combinedPreferences = combinedPreferences.filter(x => x !== preference);
                                    combinedPreferences.unshift(preference);
                                }
                            });
                            if (!combinedPreferences.includes(user)) {
                                combinedPreferences.push(user);
                            }
                            if (!combinedPreferences.includes(demandedUsers[demandedUserIndex][0])) {
                                combinedPreferences.push(demandedUsers[demandedUserIndex][0]);
                            }
                            conflicts.push([user, demandedUsers[demandedUserIndex][0], combinedPreferences, conflictTargets]);
                        }
                    }
                });
            }
        }
    });
    console.log("conflictingUsers", conflictingUsers);
    console.log("conflicts", conflicts);
    const notConflictingUsers = users.filter((user) => !conflictingUsers.has(user));
    for (let user of notConflictingUsers) {
        if (seatedUsers.has(user)) {
            continue;
        }
        const userPreferenceList = preferences[user] || [];
        if (userPreferenceList.length === 0) {
            continue;
        }
        const validDemands = userPreferenceList.filter((preference) => !seatedUsers.has(preference));
        const sortedAvailableTables = currentBestPlan
            .map((table, index) => {
                return [availableTables[index] - table.size - validDemands.length - 1, index] as [number, number];
            })
            .sort((a, b) => a[0] - b[0])
            .filter((table) => table[0] === 0);
        if (sortedAvailableTables.length > 0) {
            const tableIndex = sortedAvailableTables[0][1];
            currentBestPlan[tableIndex].add(user);
            seatedUsers.add(user);
            userPreferenceList.forEach((preference) => {
                if (seatedUsers.has(preference)) {
                    return;
                }
                currentBestPlan[tableIndex].add(preference);
                seatedUsers.add(preference);
            });
        }
    }
    planStatus = "base-plan";
    console.log("currentBestPlan", currentBestPlan);
    const currentBestPlanCopy = currentBestPlan.map((table) => new Set(table));
    richCurrentBestPlan = formatRichPlan(currentBestPlanCopy);
};

const solveConflictUnion = (conflict: Conflict) => {
    console.log("currentBestPlan", currentBestPlan);
    console.log("solveConflictUnion", conflict);
    for (let user in conflict[2]) {
        if (seatedUsers.has(user)) {
            useBanner("Mitglied " + members[user] + " ist bereits gesetzt", "error");
            return;
        }
    }
    console.log("union", conflict[2]);
    console.log("currentBestPlan", currentBestPlan);
    const sortedAvailableTables = currentBestPlan
        .map((table, index) => {
            return [availableTables[index] - table.size - conflict[2].length, index] as [number, number];
        })
        .sort((a, b) => a[0] - b[0])
        .filter((table) => table[0] >= 0);
    console.log("sortedAvailableTables", sortedAvailableTables);
    if (sortedAvailableTables.length > 0) {
        const tableIndex = sortedAvailableTables[0][1];
        conflict[2].forEach((preference) => {
            if (seatedUsers.has(preference)) {
                return;
            }
            currentBestPlan[tableIndex].add(preference);
            seatedUsers.add(preference);
        });
        const conflictIndex = conflicts.findIndex((c) => c[0] === conflict[0] && c[1] === conflict[1]);
        conflicts.splice(conflictIndex, 1);
    } else {
        useBanner("Kein passender Tisch frei", "error");
    }
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

const solveConflictOneSide = (firstUserDominant: boolean, conflict: Conflict) => {
    console.log("solveConflictOneSide", firstUserDominant, conflict);
    let dominantTable = [] as string[];
    let recessiveTable = [] as string[];
    if (firstUserDominant) {
        dominantTable = preferences[conflict[0]];
        dominantTable.push(conflict[0]);
        preferences[conflict[1]].forEach((preference) => {
            if (!dominantTable.includes(preference)) {
                recessiveTable.push(preference);
            }
        });
        if (!dominantTable.includes(conflict[1])) {
            recessiveTable.push(conflict[1]);
        }
    } else {
        dominantTable = preferences[conflict[1]];
        dominantTable.push(conflict[1]);
        preferences[conflict[0]].forEach((preference) => {
            if (!dominantTable.includes(preference)) {
                recessiveTable.push(preference);
            }
        });
        if (!dominantTable.includes(conflict[0])) {
            recessiveTable.push(conflict[0]);
        }
    }
    for (let user of dominantTable) {
        if (seatedUsers.has(user)) {
            useBanner("Mitglied " + members[user] + " ist bereits gesetzt", "error");
            return;
        }
    }
    for (let user of recessiveTable) {
        if (seatedUsers.has(user)) {
            useBanner("Mitglied " + members[user] + " ist bereits gesetzt", "error");
            return;
        }
    }
    console.log("dominantTable", dominantTable);
    console.log("recessiveTable", recessiveTable);
    let proposedSolution = $$(currentBestPlan).value;
    {
        // add dominant table
        const sortedAvailableTables = proposedSolution
            .map((table, index) => {
                return [availableTables[index] - table.size - dominantTable.length, index] as [number, number];
            })
            .sort((a, b) => a[0] - b[0])
            .filter((table) => table[0] >= 0);
        console.log("sortedAvailableTables", sortedAvailableTables);
        if (sortedAvailableTables.length > 0) {
            const tableIndex = sortedAvailableTables[0][1];
            dominantTable.forEach((preference) => {
                if (seatedUsers.has(preference)) {
                    return;
                }
                proposedSolution[tableIndex].add(preference);
                seatedUsers.add(preference);
            });
        } else {
            useBanner("Kein passender Tisch frei", "error");
            return;
        }
    }
    {
        // add recessive table
        const sortedAvailableTables = proposedSolution
            .map((table, index) => {
                return [availableTables[index] - table.size - recessiveTable.length, index] as [number, number];
            })
            .sort((a, b) => a[0] - b[0])
            .filter((table) => table[0] >= 0);
        console.log("sortedAvailableTables", sortedAvailableTables);
        if (sortedAvailableTables.length > 0) {
            const tableIndex = sortedAvailableTables[0][1];
            recessiveTable.forEach((preference) => {
                if (seatedUsers.has(preference)) {
                    return;
                }
                proposedSolution[tableIndex].add(preference);
                seatedUsers.add(preference);
            });
        } else {
            useBanner("Kein passender Tisch frei", "error");
            return;
        }
    }
    const conflictIndex = conflicts.findIndex((c) => c[0] === conflict[0] && c[1] === conflict[1]);
    conflicts.splice(conflictIndex, 1);
    currentBestPlan = proposedSolution;
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

const removeConflict = (conflict: Conflict) => {
    const conflictIndex = conflicts.findIndex((c) => c[0] === conflict[0] && c[1] === conflict[1]);
    conflicts.splice(conflictIndex, 1);
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

const distributeLowerFittingTables = () => {
    for (let user of users) {
        if (seatedUsers.has(user)) {
            continue;
        }
        const userPreferenceList = preferences[user] || [];
        if (userPreferenceList.length === 0) {
            continue;
        }
        const validDemands = userPreferenceList.filter((preference) => !seatedUsers.has(preference));
        const sortedAvailableTables = currentBestPlan
            .map((table, index) => {
                return [availableTables[index] - table.size - validDemands.length - 1, index] as [number, number];
            })
            .sort((a, b) => a[0] - b[0])
            .filter((table) => table[0] >= 0);
        if (sortedAvailableTables.length > 0) {
            const tableIndex = sortedAvailableTables[0][1];
            currentBestPlan[tableIndex].add(user);
            seatedUsers.add(user);
            userPreferenceList.forEach((preference) => {
                if (seatedUsers.has(preference)) {
                    return;
                }
                currentBestPlan[tableIndex].add(preference);
                seatedUsers.add(preference);
            });
        }
    }
    planStatus = "lower-tables";
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

definePageMeta({
    title: "Sitzplan generieren",
    middleware: "admin-auth"
})
</script>
