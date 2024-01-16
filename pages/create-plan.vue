<template>
    <div class="flex flex-col items-center w-full gap-10 lg:flex-row lg:items-start lg:justify-center">
        <div class="flex flex-col items-center min-w-min">
            <button v-if="planStatus == 'idle'" class="btn btn-accent btn-wide mb-5"
                @click="computeBasePlan(false)">Basis-Sitzplan berechnen</button>
            <button v-else-if="planStatus == 'base-plan'" class="btn btn-accent btn-wide mb-5" @click="planStatus = 'conflicts'
                ">Konflikte anzeigen</button>
            <button v-else-if="planStatus == 'conflicts' && conflicts.length == 0" class="btn btn-accent btn-wide mb-5"
                @click="showLargeTables()">Zu große Tische
                anzeigen</button>
            <button v-else-if="planStatus == 'conflicts' && conflicts.length > 0"
                class="btn btn-accent btn-wide mb-5 btn-disabled">Zu große Gruppen
                anzeigen</button>
            <button v-else-if="planStatus == 'upper-tables' && conflicts.length == 0" class="btn btn-accent btn-wide mb-5"
                @click="planStatus = 'remaining-users'">Übrige Mitglieder anzeigen</button>
            <button v-else class="btn btn-accent btn-wide mb-5" @click="uploadPlan()">Sitzplan speichern</button>
            <div v-if="planStatus == 'idle'"
                class="collapse collapse-arrow border border-base-300 bg-primary mt-5 max-w-prose">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium text-[#ECFEF5]">
                    Erweiterte Einstellungen
                </div>
                <div class="collapse-content flex flex-col items-center text-[#ECFEF5]">
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
                <span class="badge badge-secondary" v-if="conflicts.length == 0">Keine Konflikte vorhanden</span>
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
                            für {{ members[conflict[0]] }} entscheiden</button>
                        <button class="btn btn-accent btn-wide mt-5" @click="solveConflictOneSide(false, conflict)">Konflikt
                            für {{ members[conflict[1]] }} entscheiden</button>
                        <button class="btn btn-accent btn-wide mt-5" @click="removeConflict(conflict)">Konflikt
                            ignorieren</button>
                    </div>
                </div>
            </div>
            <div v-else-if="planStatus == 'upper-tables'">
                <h2 class="text-3xl font-bold mr-5 mb-7">Zu große Tische</h2>
                <span class="badge badge-secondary" v-if="tooLargeGroups.length == 0">Keine zu großen Gruppen
                    vorhanden</span>
                <div v-else>
                    <div v-for="(group, index) in tooLargeGroups" :key="index" class="flex flex-col items-center mb-5">
                        <div class="flex flex-col items-center">
                            <span class="text-xl font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">
                                {{ group.length }} Mitglieder
                            </span>
                        </div>
                        <button v-if="group.length <= remainingTables.sort((a, b) => b[1] - a[1])[0][1]"
                            class="btn btn-accent btn-wide my-5" @click="distributeTooLargeGroup(index)">Gruppe
                            verteilen</button>
                        <button v-else class="btn btn-accent btn-wide my-5 btn-disabled">Gruppe verteilen</button>
                        <div class="grid grid-cols-2 gap-5">
                            <div v-for="user in group" :key="user">
                                <button v-if="preferenceUsers.includes(user)" class="btn btn-error btn-wide"
                                    @click="removeMemberFromTooLargeGroup(index, user)">{{ members[user] }} entfernen
                                </button>
                                <button v-else class="btn btn-primary btn-wide"
                                    @click="removeMemberFromTooLargeGroup(index, user)">{{ members[user] }} entfernen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else-if="planStatus == 'remaining-users'">
                <h2 class="text-3xl font-bold mr-5 mb-7">Übrige Mitglieder</h2>
                <div class="grid grid-cols-3 gap-5 max-w-fit">
                    <div v-for="(group, index) in remainingGroups" :key="group[0]" class="mt-5  flex flex-col items-center">
                        <button v-if="group.length > 1" class="btn btn-accent mb-3 w-full"
                            @click="handleModal(group)">Gruppe
                            manuell verteilen</button>
                        <button v-if="group.length > 1" class="btn btn-accent mb-3 w-full"
                            @click="distributeRemainingGroup(group)">Gruppe automatisch
                            verteilen</button>
                        <div v-if="group.length > 1" class="flex bg-primary rounded-md p-3 flex-col items-center w-full">
                            <div v-for="user in group" class="my-2">
                                <span class="badge badge-neutral">{{ members[user] }}</span>
                            </div>
                        </div>
                        <button v-else class="btn btn-secondary w-full" @click="handleModal(group)">{{ members[group[0]] }}
                            verteilen
                        </button>
                    </div>
                </div>
            </div>
            <Plan class="mt-9" v-if="richCurrentBestPlan !== null" :results="richCurrentBestPlan" :all-users="users" />
        </div>
        <dialog ref="modal" class="modal">
            <div class="modal-box min-w-fit flex flex-col items-center">
                <h2 class="text-3xl font-bold mr-5 mb-7">Gruppe verteilen</h2>
                <div class="flex bg-primary rounded-md p-3 flex-col items-center max-w-fit">
                    <div v-for="user in distributingGroup" class="my-2">
                        <span class="badge badge-neutral">{{ members[user] }}</span>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="grid grid-cols-3 gap-5 max-w-fit">
                    <div v-for="tableIndex in modalFreeTables" :key="tableIndex" class="mt-5  flex flex-col items-center">
                        <button class="btn btn-accent mb-3 w-full"
                            @click="distributeGroupToTable(distributingGroup, tableIndex)">
                            Hierhin verteilen
                        </button>
                        <div class="flex bg-primary rounded-md p-3 flex-col items-center w-full">
                            <span class="text-2xl font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">{{
                                availableTables[tableIndex]
                            }}</span>
                            <span v-for="user in Array.from(currentBestPlan[tableIndex])"
                                class="badge badge-neutral my-2">{{
                                    members[user] }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>Schließen</button>
            </form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
import { getDoc, doc, getFirestore, collection, getDocs, setDoc, arrayUnion, updateDoc } from "firebase/firestore/lite";
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

let remainingTables = $computed(() => {
    return availableTables.map((table, index) => [index, table - currentBestPlan[index].size] as [number, number]);
});
let conflictingUsers = $ref<Set<string>>(new Set());

type Conflict = [string, string, string[], string[]];
let conflicts = $ref<Conflict[]>([]);

let tooLargeGroups = $ref<string[][]>([]);

let members = await useMembers();

let remainingGroups = $computed(() => {
    let localRemainingUsers: string[] = JSON.parse(JSON.stringify(remainingUsers));
    let remainingPreferenceUsers = preferenceUsers.filter((user) => !seatedUsers.has(user));
    remainingPreferenceUsers.forEach((user) => {
        localRemainingUsers = localRemainingUsers.filter((u) => u !== user);
    });
    let groups = [] as string[][];
    remainingPreferenceUsers.forEach((user) => {
        let group = [] as string[];
        group.push(user);
        preferences[user].forEach((preference) => {
            if (!group.includes(preference)) {
                group.push(preference);
                localRemainingUsers = localRemainingUsers.filter((u) => u !== preference);
            }
        });
        groups.push(group);
    });
    localRemainingUsers.forEach((user) => {
        groups.push([user]);
    });
    groups = groups.sort((a, b) => b.length - a.length);
    return groups;
});

const preferenceUsers = $computed(() => {
    return users.filter((user) => preferences[user] !== undefined && preferences[user].length > 0);
});

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
    let remainingAvailableTables: number[] = JSON.parse(JSON.stringify(availableTables.sort((a, b) => b - a)));
    let results: [number, [string, boolean, boolean][]][] = [];
    solution
        .filter((table) => table.size > 0)
        .sort((a, b) => a.size - b.size)
        .forEach((table, index) => {
            const newTable = remainingAvailableTables
                .map((remainingTable, index) => [remainingTable - table.size, index] as [number, number])
                .filter((table) => table[0] >= 0)
                .sort((a, b) => a[0] - b[0]);
            const remainingAvailableTableIndex = newTable[0][1];
            const result: [number, [string, boolean, boolean][]] = [remainingAvailableTables[remainingAvailableTableIndex], Array.from(table).map((user) => {
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
            results.push(result);
            remainingAvailableTables.splice(remainingAvailableTableIndex, 1);
        });
    remainingAvailableTables.forEach((table) => results.push([table, []]));
    results = results.sort((a, b) => b[1].length - a[1].length);
    return results;
};

// const checkTables = (tables: number[], solution: Solution) => {
//     const solutionTables = solution.map((table) => table.size).sort((a, b) => a - b);
//     const sortedTables = tables.map((table) => table).sort((a, b) => a - b);
//     for (let i = 0; i < solutionTables.length; i++) {
//         if (solutionTables[i] > sortedTables[i]) {
//             return false;
//         }
//     }
//     return true;
// };

// const getPossibleTables = (solution: Solution) => {
//     return solution.map((table, index) => [table, index] as [Set<string>, number]).filter((table) => {
//         const tableArray = Array.from(table[0]);
//         if (table[0].size === 0) {
//             return true;
//         }
//         if (table[0].size !== availableTables[table[1]]) {
//             return true;
//         }

//         let wishedForUsers = new Set<string>();
//         tableArray.forEach((user) => {
//             if (preferences[user] !== undefined) {
//                 if (preferences[user].length > 0) {
//                     wishedForUsers.add(user);
//                     preferences[user].forEach((preference) => {
//                         wishedForUsers.add(preference);
//                     });
//                 }
//             }
//         });
//         for (let user of tableArray) {
//             if (!wishedForUsers.has(user)) {
//                 return true;
//             }
//         }

//         for (let user of tableArray) {
//             if (preferences[user] !== undefined) {
//                 for (let preference of preferences[user]) {
//                     if (!table[0].has(preference)) {
//                         return true;
//                     }
//                 }
//             }
//         };

//         return false;
//     });
// };

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
            .filter((table) => proposedSolution[table[1]].size == 0 && table[0] >= 0);
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
            .filter((table) => proposedSolution[table[1]].size == 0 && table[0] >= 0);
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

const showLargeTables = () => {
    const smallestTableSize = availableTables.sort((a, b) => a - b)[0];

    const groups = users
        .filter((user) => !seatedUsers.has(user))
        .map((user) => {
            let group = [] as string[];
            group.push(user);
            if (preferences[user] !== undefined) {
                preferences[user].forEach((preference) => {
                    if (!group.includes(preference)) {
                        group.push(preference);
                    }
                });
            }
            return group;
        })
        .sort((a, b) => b.length - a.length)
        .filter((group) => group.length > 1 && group.length > smallestTableSize);
    console.log("groups", groups);
    const sortedAvailableTables = currentBestPlan
        .map((table, index) => {
            return [availableTables[index] - table.size, index] as [number, number];
        })
        .sort((a, b) => b[0] - a[0])
        .filter((table) => table[0] >= 0);
    console.log("sortedAvailableTables", sortedAvailableTables);
    groups.forEach((group, index) => {
        if (index >= sortedAvailableTables.length) {
            console.log("too large", group.length, group);
            tooLargeGroups.push(group);
        }
        if (group.length > sortedAvailableTables[index][0]) {
            console.log("too large", group.length, group);
            tooLargeGroups.push(group);
        }
    });
    planStatus = "upper-tables";
};

const removeMemberFromTooLargeGroup = (groupIndex: number, user: string) => {
    tooLargeGroups[groupIndex] = tooLargeGroups[groupIndex].filter((member) => member !== user);
    if (tooLargeGroups[groupIndex].length === 0) {
        tooLargeGroups.splice(groupIndex, 1);
    }
};

const distributeTooLargeGroup = (index: number) => {
    const group = tooLargeGroups[index];
    const sortedAvailableTables = currentBestPlan
        .map((table, index) => {
            return [availableTables[index] - table.size - group.length, index] as [number, number];
        })
        .sort((a, b) => a[0] - b[0])
        .filter((table) => table[0] >= 0);
    console.log("sortedAvailableTables", sortedAvailableTables);
    if (sortedAvailableTables.length > 0) {
        const tableIndex = sortedAvailableTables[0][1];
        group.forEach((user) => {
            if (seatedUsers.has(user)) {
                return;
            }
            currentBestPlan[tableIndex].add(user);
            seatedUsers.add(user);
        });
        tooLargeGroups.splice(index, 1);
    } else {
        useBanner("Kein passender Tisch frei", "error");
    }
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

const distributeRemainingGroup = (group: string[]) => {
    console.log("plan before distribution", currentBestPlan);
    let sortedAvailableTables = currentBestPlan
        .map((table, index) => {
            return [availableTables[index] - table.size - group.length, index] as [number, number];
        })
        .sort((a, b) => a[0] - b[0])
        .filter((table) => table[0] >= 0)
        .filter((table, index) => {
            return currentBestPlan[table[1]].size === 0;
        });
    if (sortedAvailableTables.length > 0) {
        const tableIndex = sortedAvailableTables[0][1];
        group.forEach((user) => {
            if (seatedUsers.has(user)) {
                return;
            }
            currentBestPlan[tableIndex].add(user);
            seatedUsers.add(user);
        });
    } else {
        useBanner("Kein passender Tisch frei", "error");
    }
    console.log("plan after distribution", currentBestPlan);
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
    console.log("plan after formatting", richCurrentBestPlan);
    console.log("plan after formatting", currentBestPlan);
};

const modal = ref<HTMLDialogElement | null>(null);
let distributingGroup = $ref<string[]>([]);
const modalFreeTables = $computed(() => {
    if (distributingGroup.length === 0) {
        return [];
    }
    return currentBestPlan
        .map((table, index) => {
            return [availableTables[index] - table.size - distributingGroup.length, index] as [number, number];
        })
        .sort((a, b) => a[0] - b[0])
        .filter((table) => table[0] >= 0)
        .map((table) => table[1]);
});
const handleModal = (group: string[]) => {
    distributingGroup = group;
    modal.value?.showModal();
};

const distributeGroupToTable = (group: string[], tableIndex: number) => {
    group.forEach((user) => {
        if (seatedUsers.has(user)) {
            return;
        }
        currentBestPlan[tableIndex].add(user);
        seatedUsers.add(user);
    });
    modal.value?.close();
    richCurrentBestPlan = formatRichPlan(currentBestPlan);
};

const uploadPlan = async () => {
    const resultsJson = JSON.stringify(richCurrentBestPlan);
    const date = (new Date()).toISOString();
    await setDoc(doc(db, "organizations/" + organization + "/plans/" + date), {
        results: resultsJson,
        allUsers: users,
    }).catch((error) => {
        console.error("Error while saving results", error);
        useBanner("Sitzplan konnte nicht gespeichert werden", "error");
    }).then(async (docref) => {
        await updateDoc(doc(db, "organizations", organization), {
            plans: arrayUnion(date)
        }).then(() => {
            useBanner("Sitzplan erfolgreich gespeichert", "success");
        }).catch((error) => {
            useBanner("Sitzplan konnte nicht gespeichert werden", "error");
            console.error("Error while saving results", error);
        });
    });
};

definePageMeta({
    title: "Sitzplan generieren",
    middleware: "admin-auth"
})
</script>
