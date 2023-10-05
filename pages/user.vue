<template>
    <div class="flex flex-col items-center w-full">
        <h2 class="text-3xl font-bold pb-3">Organisation</h2>
        <div class="flex">
            <span class="badge badge-neutral mr-5">Name</span>
            <span class="badge badge-outline">{{ organization }}</span>
        </div>

        <h2 class="text-3xl font-bold pt-8 pb-3">Tischwünsche abgeben</h2>
        <button class="btn btn-outline btn-wide" @click="updateMemberList()">Liste aktualisieren</button>

        <div class="overflow-x-auto pt-3">
            <table class="table table-zebra">
                <tbody>
                    <tr class="hover" v-for="member in members">
                        <td>{{ member }}</td>
                        <td><button class="btn btn-error btn-square btn-sm transition ease-in-out xl:hover:scale-110"
                                @click="removeMember(member)">
                                <Icon name="mdi:trash" size="2em" color="black" />
                            </button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <h3 class="text-2xl font-bold pt-8 pb-3">Tischwünsche hinzufügen</h3>
        <button class="btn btn-outline btn-wide mb-3" @click="addMembers()">Tischwünsche hinzufügen</button>
        <textarea class="textarea textarea-bordered w-full" placeholder="mail1@example.com,mail2@example.com"
            v-model="newMembersInput"></textarea>
    </div>
</template>

<script setup lang="ts">
import { getFirestore } from "firebase/firestore/lite";
const auth = useFirebaseAuth();
const db = getFirestore(useFirebaseApp());
const user = $(useCurrentUser());
const organization = $(useLocalStorage("userOrganization", ""));

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
        const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
        if (isSignInWithEmailLink(auth, window.location.href)) {
            console.log("Trying to log in")
            let email = $(useLocalStorage("userEmailForSignIn", ""));
            if (email === "") {
                email = window.prompt("Bitte gib deine Email-Adresse ein") || "";
            }
            console.log("email: " + email);
            if (email && email !== "") {
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        console.log(result);
                        useBanner("Anmeldung erfolgreich", "success");
                        navigateTo("/user");
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

let members = $(useLocalStorage("preferredMembers", [] as string[]));
let newMembersInput = $(useLocalStorage("newMembersInput", ""));

const updateMemberList = async (noBanner = false) => {
    const { doc, getDoc } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await getDoc(docRef).catch((error) => {
        console.log(error);
        useBanner("Mitglieder konnten nicht aktualisiert werden", "error");
    }).then((docSnap) => {
        if (docSnap && docSnap.exists()) {
            members = docSnap.data().positive;
            if (!noBanner) {
                useBanner("Mitgliederliste aktualisiert", "success");
            }
        } else {
            members = [];
            console.log("No preferences submitted");
            if (!noBanner) {
                useBanner("Mitgliederliste aktualisiert", "success");
            }
        }
    });
};
if (members.length === 0) {
    await waitForUser();
    updateMemberList(true);
}

const addMembers = async () => {
    const { doc, getDoc, updateDoc } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await getDoc(docRef).catch((error) => {
        console.log(error);
        useBanner("Mitglieder konnten nicht aktualisiert werden", "error");
    }).then(async (docSnap) => {
        if (docSnap && docSnap.exists()) {
            const oldMembers = docSnap.data().positive;
            const newMembers = newMembersInput.split(",");
            const membersSet = new Set([...oldMembers, ...newMembers]);
            const members = Array.from(membersSet);
            await updateDoc(docRef, {
                positive: members,
            }).catch((error) => {
                console.log(error);
                useBanner("Tischwünsche konnten nicht geändert werden", "error");
            }).then(() => {
                useBanner("Tischwünsche aktualisiert", "success");
                updateMemberList(true);
                newMembersInput = "";
            });
        } else {
            const { setDoc } = await import("firebase/firestore/lite");
            await setDoc(docRef, {
                members: newMembersInput.split(","),
            }).catch((error) => {
                console.log(error);
                useBanner("Tischwünsche konnten nicht abgegeben werden", "error");
            }).then(() => {
                useBanner("Tischwünsche abgegeben", "success");
                updateMemberList(true);
                newMembersInput = "";
            });
        }
    });
};

const removeMember = async (member: string) => {
    const { doc, updateDoc, arrayRemove } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await updateDoc(docRef, {
        positive: arrayRemove(member),
    }).catch((error) => {
        console.log(error);
        useBanner("Tischwunsch konnte nicht entfernt werden", "error");
    }).then(() => {
        useBanner("Tischwunsch entfernt", "success");
        updateMemberList(true);
    });
};

definePageMeta({
    title: "Nutzer-Übersicht",
})
</script>