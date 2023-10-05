<template>
    <div>Nutzerübersicht</div>
    <h2 class="text-3xl font-bold pb-3">Organisation</h2>
    <div class="flex">
        <span class="badge badge-neutral mr-5">Name</span>
        <span class="badge badge-outline">{{ organization }}</span>
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

definePageMeta({
    title: "Nutzer-Übersicht",
})
</script>