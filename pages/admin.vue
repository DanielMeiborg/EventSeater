<template>
    <div>
        <div v-if="authenticated === false || authenticationPending" class="alert alert-error">Kein Administrator-Account
        </div>
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
                                    <tr class="hover" v-for="member in members">
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
                <button class="btn btn-primary btn-wide mb-3" @click="syncTables()">Tische synchronisieren</button>
                <div v-if="EnoughPlaces" class="alert alert-warning flex justify-center">Nicht genug Plätze für alle
                    Mitglieder
                </div>
                <div class="overflow-x-auto pt-3">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kapazität</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="hover" v-for="table in tables" :key="table.id">
                                <td>{{ table.capacity }}</td>
                                <td><button
                                        class="btn btn-error btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                        @click="removeTable(table)">
                                        <Icon name="mdi:trash" size="2em" color="black" />
                                    </button></td>
                            </tr>
                            <tr>
                                <td><input type="text" v-model="newTableCapacity"
                                        class="input input-bordered w-full max-w-xs"
                                        @keydown.enter.exact.prevent="addTable()" />
                                </td>
                                <td><button
                                        class="btn btn-success btn-sm btn-square transition ease-in-out xl:hover:scale-110"
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

const { data: authenticated, pending: authenticationPending } = $(await useAsyncData(async () => {
    if (auth) {
        if (user === null) {
            console.log("Currently not logged in");
            const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
            if (isSignInWithEmailLink(auth, window.location.href)) {
                console.log("Trying to log in")
                let email = $(useLocalStorage("emailForSignIn", ""));
                if (email === "") {
                    email = window.prompt("Bitte gib deine Email-Adresse ein") || "";
                }
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
        useBanner("Ein Fehler ist aufgetreten", "error");
        return false;
    }
}));

const getOrganization = async () => {
    if (organization === "") {
        while (authenticationPending) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            console.log("Waiting for authentication");
        }
        const docRef = doc(db, "admins/" + user?.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            organization = docSnap.data().organization;
        }
    }
    return organization;
};
await getOrganization();

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

let members = $(useLocalStorage("members", [] as [string, string][]));
const updateMemberList = async (noBanner = false) => {
    if (organization !== "") {
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const members_json: { [key: string]: string } = JSON.parse(docSnap.data().members_json);
            console.log(members_json);
            members = Object.entries(members_json);
            console.log(members);
            console.log(noBanner);
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
if (members.length === 0) {
    updateMemberList();
}

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
    }
};


const removeMember = async (member: string) => {
    if (organization !== "") {
        const { doc, updateDoc, arrayRemove } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        await updateDoc(docRef, {
            members: arrayRemove(member),
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

let tables = $(useLocalStorage("tables", [] as { id: number, capacity: number }[]));
let newTableCapacity = $ref<string | null>();

const EnoughPlaces = $computed(() => {
    let places = 0;
    for (const table of tables) {
        places += table.capacity;
    }
    return places < members.length;
});

const addTable = async () => {
    const newId = tables.length === 0 ? 1 : tables[tables.length - 1].id + 1;
    tables.push({
        id: newId,
        capacity: Number(newTableCapacity) ?? 0,
    });
    newTableCapacity = null;
};

const removeTable = async (table: { id: number, capacity: number }) => {
    tables = tables.filter((t) => t.id !== table.id);
};

onMounted(async () => {
    while (authenticationPending) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("Waiting for authentication");
    }
    if (user !== null && user !== undefined) {
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            tables = [];
            for (const table of docSnap.data().tables) {
                tables.push({
                    id: tables.length + 1,
                    capacity: table,
                });
            }
        }
    }
});

const syncTables = async () => {
    if (organization !== "") {
        const { doc, updateDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const newTables = tables.map((table) => table.capacity);
        console.log(tables);
        console.log(newTables);
        await updateDoc(docRef, {
            tables: newTables,
        }).then(() => {
            useBanner("Tische synchronisiert", "success");
        }).catch((error) => {
            useBanner("Tische konnten nicht synchronisiert werden", "error");
            console.log(error);
        });
    }
};

definePageMeta({
    title: "Admin-Übersicht",
    middleware: "admin-auth"
})
</script>