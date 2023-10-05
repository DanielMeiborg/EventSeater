<template>
    <button class="btn btn-outline btn-wide" v-if="organization === ''" @click="createOrganization()">Organisation
        erstellen</button>
    <div v-else class="flex flex-col items-center w-full">
        <h2 class="text-3xl font-bold pb-3">Organisation</h2>
        <div class="flex">
            <span class="badge badge-neutral mr-5">Name</span>
            <span class="badge badge-outline">{{ organization }}</span>
        </div>

        <h2 class="text-3xl font-bold pt-8 pb-3">Mitglieder</h2>
        <button class="btn btn-outline btn-wide" @click="updateMemberList()">Liste aktualisieren</button>

        <div class="overflow-x-auto pt-3">
            <table class="table">
                <tbody>
                    <tr class="hover" v-for="member in members">
                        <td><button class="btn btn-info btn-square btn-sm transition ease-in-out xl:hover:scale-110"
                                @click="handleModal(member)">
                                <Icon name="material-symbols:info" size="2em" color="black" />
                            </button></td>
                        <td>{{ member }}</td>
                        <td><button class="btn btn-error btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                @click="removeMember(member)">
                                <Icon name="mdi:trash" size="2em" color="black" />
                            </button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3 class="text-2xl font-bold pt-8 pb-3">Neue Mitglieder hinzufügen</h3>
        <button class="btn btn-outline btn-wide mb-3" @click="addMembers()">Mitglieder hinzufügen</button>
        <textarea class="textarea textarea-bordered w-full" placeholder="mail1@example.com,mail2@example.com"
            v-model="newMembersInput"></textarea>

        <h2 class="text-3xl font-bold pt-8 pb-3">Tische</h2>
        <button class="btn btn-outline btn-wide mb-3" @click="syncTables()">Tische synchronisieren</button>
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
                        <td><button class="btn btn-error btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                @click="removeTable(table)">
                                <Icon name="mdi:trash" size="2em" color="black" />
                            </button></td>
                    </tr>
                    <tr>
                        <td><input type="text" v-model="newTableCapacity" class="input input-bordered w-full max-w-xs"
                                @keydown.enter.exact.prevent="addTable()" />
                        </td>
                        <td><button class="btn btn-success btn-sm btn-square transition ease-in-out xl:hover:scale-110"
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
</template>

<script setup lang="ts">
import { getFirestore } from "firebase/firestore/lite";
const auth = useFirebaseAuth();
const user = $(useCurrentUser());
const db = getFirestore(useFirebaseApp());

async function waitForUser() {
    if (user === undefined) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await waitForUser();
    } else {
        return;
    }
}

if (auth) {
    await waitForUser();
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
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        console.log(result);
                        useBanner("Anmeldung erfolgreich", "success");
                        navigateTo("/admin");
                    })
                    .catch((error) => {
                        useBanner("Anmeldung fehlgeschlagen", "error");
                        console.log(error);
                    });
            } else {
                useBanner("Anmeldung fehlgeschlagen", "error");
                console.log("No email provided");
            }
        }
    }
}
let organization = $(useLocalStorage("organization", ""));
if (organization === "") {
    const { doc, getDoc } = await import("firebase/firestore/lite");
    await waitForUser();
    if (user !== null && user !== undefined) {
        const docRef = doc(db, "admins/" + user.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            organization = docSnap.data().organization;
        }
    }
}

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

let members = $(useLocalStorage("members", [] as string[]));
const updateMemberList = async (noBanner = false) => {
    if (organization !== "") {
        const { doc, getDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            members = docSnap.data().members;
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
const addMembers = async () => {
    if (organization !== "") {
        const { doc, getDoc, updateDoc } = await import("firebase/firestore/lite");
        const docRef = doc(db, "organizations/" + organization);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const oldMembers = docSnap.data().members;
            const newMembers = newMembersInput.split(",");
            const membersSet = new Set([...oldMembers, ...newMembers]);
            const members = Array.from(membersSet);
            await updateDoc(docRef, {
                members: members,
            }).then(() => {
                useBanner("Mitglieder hinzugefügt", "success");
                updateMemberList(true);
                newMembersInput = "";
            }).catch((error) => {
                useBanner("Mitglieder konnten nicht hinzugefügt werden", "error");
                console.log(error);
            });
        }
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
    await waitForUser();
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
})
</script>