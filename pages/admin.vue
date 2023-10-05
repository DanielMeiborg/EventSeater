<template>
    <button class="btn btn-outline btn-wide" v-if="organization === ''" @click="create_organization()">Organisation
        erstellen</button>
    <div v-else class="flex flex-col items-center w-full">
        <div class="flex">
            <span class="badge badge-neutral mr-5">Organisation</span>
            <span class="badge badge-outline">{{ organization }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
const auth = useFirebaseAuth();
const user = $(useCurrentUser());
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
    const { getFirestore, doc, getDoc } = await import("firebase/firestore/lite");
    const db = getFirestore(useFirebaseApp());
    if (user !== null && user !== undefined) {
        const docRef = doc(db, "admins/" + user.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            organization = docSnap.data().organization;
        }
    }
}

const create_organization = async () => {
    const temporaryOrganization = window.prompt("Bitte gib den Namen deiner neuen Organisation ein") || "";
    if (user === null || user === undefined) {
        useBanner("Du musst angemeldet sein, um eine Organisation zu erstellen", "error");
        return;
    }
    if (temporaryOrganization !== "") {
        const { getFirestore, doc, setDoc, updateDoc } = await import("firebase/firestore/lite");
        const db = getFirestore(useFirebaseApp());
        const docRef = doc(db, "organizations/" + temporaryOrganization);
        await setDoc(docRef, {
            admin: user.email,
            admin_uid: user.uid,
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

definePageMeta({
    title: "Admin-Übersicht",
})
</script>