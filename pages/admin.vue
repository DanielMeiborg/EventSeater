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
            <table class="table table-zebra">
                <tbody>
                    <tr v-for="member in members">
                        <td>{{ member }}</td>
                        <td><button class="btn btn-error btn-xs" @click="removeMember(member)">Entfernen</button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3 class="text-2xl font-bold pt-8 pb-3">Neue Mitglieder hinzufügen</h3>
        <button class="btn btn-outline btn-wide mb-3" @click="addMembers()">Mitglieder hinzufügen</button>
        <textarea class="textarea textarea-bordered w-full" placeholder="mail1@example.com,mail2@example.com"
            v-model="newMembersInput"></textarea>
    </div>
</template>

<script setup lang="ts">
import { getFirestore } from "firebase/firestore/lite";
const auth = useFirebaseAuth();
const user = $(useCurrentUser());
const db = getFirestore(useFirebaseApp());

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

definePageMeta({
    title: "Admin-Übersicht",
})
</script>