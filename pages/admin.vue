<template>
    <div>
        <div v-if="authenticated === false" class="alert alert-error">Kein Administrator-Account
        </div>
        <div v-else-if="authenticationPending" class="skeleton h-[min(600px,60vh)] w-[min(90vw,370px)]"></div>
        <div v-else>
            <button class="btn btn-primary btn-outline btn-wide" v-if="organization === ''"
                @click="createOrganization()">Organisation
                erstellen</button>
            <div v-else class="flex flex-col items-center w-full max-w-prose">
                <div class="collapse collapse-arrow border border-base-300 bg-primary text-[#ECFEF5] my-5 max-w-prose">
                    <input type="checkbox" value="true" />
                    <div class="collapse-title text-xl font-medium">
                        Mitglieder
                    </div>
                    <div class="collapse-content flex flex-col items-center">
                        <button class="btn btn-accent btn-wide" @click="updateMemberList()">Liste aktualisieren</button>
                        <div class="overflow-x-auto pt-3">
                            <table class="table">
                                <tbody>
                                    <tr class="hover" v-for="member in membersList">
                                        <td><button
                                                class="btn btn-info btn-square btn-sm transition ease-in-out xl:hover:scale-110"
                                                @click="handleModal(member[0])">
                                                <Icon name="material-symbols:info" size="2em" color="black" />
                                            </button></td>
                                        <td> {{ member[1] }}</td>
                                        <td><button
                                                class="btn btn-error btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                                @click="removeMember(member[0])">
                                                <Icon name="mdi:trash" size="2em" color="black" />
                                            </button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <h3 class="text-2xl font-bold pt-8 pb-3">Neue Mitglieder hinzufügen</h3>
                <input type="file" @change="setMembersFromCSV($event)" accept=".csv" capture
                    class="file-input file-input-bordered file-input-accent w-full max-w-xs mb-3" />
                <textarea class="textarea textarea-bordered w-full mb-3"
                    placeholder='{"mail1@example.com":"name1","mail2@example.com":"name2"}'
                    v-model="newMembersInput"></textarea>
                <button class="btn btn-primary btn-wide mb-3"
                    @click="addMembers(JSON.parse(newMembersInput), false)">Mitglieder
                    manuell hinzufügen</button>

                <h2 class="text-3xl font-bold pt-8 pb-3">Tische</h2>
                <button class="btn btn-primary btn-wide mb-3" @click="pushTables()">Tische hochladen</button>
                <div v-if="EnoughPlaces" class="alert alert-warning flex justify-center">Nicht genug Plätze für alle
                    Mitglieder
                </div>
                <div class="overflow-x-auto pt-3">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kapazität</th>
                                <th>Anzahl</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="hover" v-for="table in tables" :key="table.id">
                                <td><input type="text" v-model="table.capacity" class="input w-16" /></td>
                                <td><input type="text" v-model="table.count" class="input w-16" /></td>
                                <td><button class=" btn btn-error btn-sm btn-square transition ease-in-out
                                        xl:hover:scale-110" @click="removeTable(table)">
                                        <Icon name="mdi:trash" size="2em" color="black" />
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3"><button
                                        class="btn btn-success btn-sm btn-wide transition ease-in-out xl:hover:scale-110"
                                        @click="addTable()">
                                        <Icon name="material-symbols:add" size="2em" color="black" />
                                    </button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <dialog ref="modal" class="modal">
                    <div class="modal-box">
                        <h2 class="text-2xl font-bold pb-3">Tischwünsche</h2>
                        <h3 class="text-xl font-bold pt-3 pb-3">{{ openedMember }}</h3>
                        <div v-if="preferredMembers.length != 0" class="overflow-x-auto">
                            <table class="table">
                                <tbody>
                                    <tr class="hover" v-for="member in preferredMembers">
                                        <td>{{ member }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p v-else>Keine Tischwünsche abgegeben</p>
                    </div>
                    <form method="dialog" class="modal-backdrop">
                        <button>Schließen</button>
                    </form>
                </dialog>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getFirestore, doc, getDoc } from "firebase/firestore/lite";

const auth = useFirebaseAuth();
const user = $(useCurrentUser());
const db = getFirestore(useFirebaseApp());
let organization = $(useLocalStorage("organization", ""));
const isAdmin = $(useLocalStorage<any | null>("is_admin", null));
const parsedIsAdmin = $computed(() => {
    if (isAdmin === "true") {
        return true;
    } else if (isAdmin === "false") {
        return false;
    } else if (isAdmin === true) {
        return true;
    } else if (isAdmin === false) {
        return false;
    } else {
        return null;
    }
});

const { data: authenticated, pending: authenticationPending } = $(await useLazyAsyncData(async () => {
    console.log("Checking if admin", parsedIsAdmin);
    // if (parsedIsAdmin !== null && parsedIsAdmin === true) {
    //     console.log("Already admin");
    //     return true;
    // }
    try {
        console.log("Checking authentication");
        if (auth) {
            console.log("Auth object exists");
            while (user === undefined) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                console.log("Waiting for user");
            }
            console.log("User object exists");
            if (user === null) {
                console.log("Currently not logged in");
                const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
                if (isSignInWithEmailLink(auth, window.location.href)) {
                    console.log("Trying to log in")
                    let email = $(useLocalStorage("emailForSignIn", ""));
                    // if (email === "") {
                    //     email = window.prompt("Bitte gib deine Email-Adresse ein") || "";
                    // }
                    console.log("email: " + email);
                    if (email && email !== "") {
                        try {
                            const result = await signInWithEmailLink(auth, email, window.location.href);
                            console.log(result);
                            useBanner("Anmeldung erfolgreich", "success");
                            let isAdmin = $(useLocalStorage<boolean | null>("is_admin", null));
                            isAdmin = true;
                            navigateTo("/admin");
                            return true;
                        } catch (error: any) {
                            useBanner("Anmeldung fehlgeschlagen", "error");
                            console.log(error);
                            return false;
                        }
                    } else {
                        useBanner("Anmeldung fehlgeschlagen", "error");
                        console.log("No email provided");
                        return false;
                    }
                } else {
                    useBanner("Anmeldung fehlgeschlagen", "error");
                    console.log("Not a sign in link, but not already authenticated");
                    return false;
                }
            } else {
                console.log("Currently logged in, checking permissions");
                try {
                    const docRef = doc(db, "admins/" + user?.email);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        organization = docSnap.data().organization;
                        return true;
                    }
                } catch (error) {
                    useBanner("Ein Fehler ist aufgetreten", "error");
                    console.log(error);
                    return false;
                }
            }
        } else {
            console.log("Auth object does not exist");
            useBanner("Ein Fehler ist aufgetreten", "error");
            return false;
        }
    } catch (error) {
        useBanner("Ein Fehler ist aufgetreten", "error");
        console.log(error);
        return false;
    }
}));


let membersList = $(useLocalStorage("membersList", [] as [string, string][]));
let membersJSON = $(useLocalStorage("members", {} as { [key: string]: string }));

const updateMemberList = async (noBanner = false) => {
    if (organization !== "") {
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const members_json: { [key: string]: string } = JSON.parse(docSnap.data().members_json);
            console.log(members_json);
            membersList = Object.entries(members_json);
            membersJSON = members_json;
            if (!noBanner) {
                useBanner("Mitgliederliste aktualisiert", "success");
            }
        } else {
            if (!noBanner) {
                useBanner("Mitglieder konnten nicht aktualisiert werden", "error");
            }
        }
    }
};

const createOrganization = async () => {
    const temporaryOrganization = window.prompt("Bitte gib den Namen deiner neuen Organisation ein") || "";
    if (user === null || user === undefined) {
        useBanner("Du musst angemeldet sein, um eine Organisation zu erstellen", "error");
        return;
    }
    if (temporaryOrganization !== "") {
        const { doc, setDoc, updateDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + temporaryOrganization);
        await setDoc(docRef, {
            admin: user.email,
            admin_uid: user.uid,
            members: [],
            tables: [],
        }).then(async () => {
            await updateDoc(doc(db, "admins/" + user.email), {
                organization: temporaryOrganization,
            }).then(() => {
                organization = temporaryOrganization;
                useBanner("Organisation erstellt", "success");
            }).catch((error) => {
                useBanner("Organisation konnte nicht erstellt werden", "error");
                console.log(error);
            })
        }).catch((error) => {
            useBanner("Organisation konnte nicht erstellt werden", "error");
            console.log(error);
        });
    }
};

let newMembersInput = $(useLocalStorage("newMembers", ""));

const addMembers = async (members: { [key: string]: string }, replace: boolean) => {
    if (organization !== "") {
        const { doc, getDoc, updateDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        let newMembers = members;
        if (!replace) {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                newMembers = { ...JSON.parse(docSnap.data().members_json), ...members };
            }
        }
        await updateDoc(docRef, {
            members: Object.keys(newMembers),
            members_json: JSON.stringify(newMembers),
        }).then(() => {
            useBanner("Mitglieder hinzugefügt", "success");
            updateMemberList(true);
        }).catch((error) => {
            useBanner("Mitglieder konnten nicht hinzugefügt werden", "error");
            console.log(error);
        });
    }
};

const setMembersFromCSV = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    console.log(file);
    if (file) {
        const input = await CSVtoJSON(await file.text());
        const members: { [key: string]: string } = {};
        input.forEach((entry: { [key: string]: string }) => {
            if (entry["Email"] === undefined || entry["Email"] === "undefined") {
                return;
            }
            if (entry["Zusatz"] && entry["Zusatz"] !== "") {
                members[entry["Email"].toLowerCase()] = `${entry["Vorname"]} ${entry["Name"]} ${entry["Zusatz"]}`;
            } else {
                members[entry["Email"].toLowerCase()] = `${entry["Vorname"]} ${entry["Name"]}`;
            }
        });
        await addMembers(members, true);
    } else {
        console.log("No file selected");
    }
};


const removeMember = async (member: string) => {
    if (organization !== "") {
        const { doc, updateDoc, arrayRemove } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        delete membersJSON[member];
        await updateDoc(docRef, {
            members: arrayRemove(member),
            members_json: JSON.stringify(membersJSON),
        }).then(() => {
            useBanner("Mitglied entfernt", "success");
            updateMemberList(true);
        }).catch((error) => {
            useBanner("Mitglied konnte nicht entfernt werden", "error");
            console.log(error);
        });
    }
};

const modal = ref<HTMLDialogElement | null>(null);
let openedMember = $ref<string | null>();
let preferredMembers = $ref<string[]>([]);

const handleModal = async (member: string) => {
    openedMember = member;
    const { doc, getDoc } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + member);
    await getDoc(docRef).catch((error) => {
        console.log(error);
        useBanner("Tischwünsche konnten nicht aktualisiert werden", "error");
    }).then((docSnap) => {
        if (docSnap && docSnap.exists()) {
            preferredMembers = docSnap.data().positive;
        } else {
            preferredMembers = [];
        }
        modal.value?.showModal();
    });
};

let tables = $(useLocalStorage("tables", [] as { id: number, capacity: number, count: number }[]));

const EnoughPlaces = $computed(() => {
    let places = 0;
    for (const table of tables) {
        places += table.capacity * table.count;
    }
    return places < membersList.length;
});

const addTable = async () => {
    const newId = Math.floor(Math.random() * 999);
    tables.push({
        id: newId,
        capacity: 0,
        count: 0,
    });
};

const removeTable = async (table: { id: number, capacity: number, count: number }) => {
    const index = tables.findIndex((t) => t.id === table.id);
    if (index !== -1) {
        tables.splice(index, 1);
    }
};

const pushTables = async () => {
    console.log("Pushing tables");
    if (organization !== "") {
        const { doc, updateDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        tables = tables.map((table) => {
            return {
                id: table.id,
                capacity: parseInt(table.capacity as unknown as string),
                count: parseInt(table.count as unknown as string),
            };
        });
        const newTables: number[] = tables
            .map((table) => Array(table.count as number).fill(table.capacity as number))
            .flat();
        await updateDoc(docRef, {
            tables: newTables,
        }).then(() => {
            console.log("Tables pushed");
            useBanner("Tische hochgeladen", "success");
        }).catch((error) => {
            useBanner("Ein Fehler ist aufgetreten", "error");
            console.log(error);
        });
    }
};

const fetchTables = async (noBanner: boolean = true) => {
    console.log("Fetching tables");
    if (organization !== "") {
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log(docSnap.data());
            tables = [];
            for (const table of docSnap.data().tables) {
                const index = tables.findIndex((t) => t.capacity === table);
                if (index === -1) {
                    tables.push({
                        id: Math.floor(Math.random() * 999),
                        capacity: table,
                        count: 1,
                    });
                } else {
                    tables[index].count++;
                }
            }
        } else {
            console.log("Organization does not exist");
        }
        if (!noBanner) {
            useBanner("Tische synchronisiert", "success");
        }
        return tables;
    }
    return [];
};

const getOrganization = async () => {
    try {
        if (organization === "") {
            while (authenticationPending) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                console.log("Waiting for authentication");
            }
            console.log("Waiting for authentication done");
            const docRef = doc(db, "admins/" + user?.email);
            console.log(docRef);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                organization = docSnap.data().organization;
            }
        }
        await updateMemberList(true);
        await fetchTables();
        return organization;
    } catch (error) {
        useBanner("Ein Fehler ist aufgetreten", "error");
        console.log(error);
        return "";
    }
};
await useLazyAsyncData(getOrganization);

definePageMeta({
    title: "Admin-Übersicht",
    middleware: "admin-auth"
})
</script>