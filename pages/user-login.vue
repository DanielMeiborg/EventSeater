<template>
    <div class="flex flex-col items-center max-w-prose">
        <div v-if="!logged_in">
            <button class="btn btn-primary btn-wide" @click.prevent="handleMsSignIn()">Mit Microsoft anmelden</button>
            <div class="divider divider-secondary"></div>
            <h2 class="text-2xl font-bold mb-5">Mit Email anmelden</h2>
            <form @submit.prevent="handleSignIn" class="form-control w-full max-w-xs mb-5">
                <label class="label">
                    <span class="label-text">Organisation</span>
                </label>
                <input v-model="organization" type="text" class="input input-bordered w-full max-w-xs mb-3" required />
                <label class="label">
                    <span class="label-text">Email-Adresse</span>
                </label>
                <input v-model="email" type="email" class="input input-bordered w-full max-w-xs mb-3" required
                    autocomplete="email" />
                <button type="submit" class="btn btn-primary btn-wide">Bestätigen</button>
            </form>
        </div>
        <button class="btn btn-primary btn-wide" @click="useLogout()" v-else>Abmelden</button>
    </div>
</template>

<script setup lang="ts">
import { sendSignInLinkToEmail, OAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup } from "firebase/auth";

const provider = new OAuthProvider("microsoft.com");
provider.setCustomParameters({
    tenant: "89cd34a8-db37-49d2-a4f9-9231b59f7e1a",
});
provider.addScope("User.Read");
const host = useRequestURL().host;

let organization = $(useLocalStorage("organization", ""));
let email = $(useLocalStorage("userEmailForSignIn", ""));

const current_user = $(useCurrentUser());
const logged_in = $computed(() => current_user !== null);

const handleSignIn = async () => {
    organization = organization.trim();
    const actionCodeSettings = {
        url: `https://${host}/user`,
        handleCodeInApp: true,
    };
    const auth = useFirebaseAuth();
    if (!auth) return;
    sendSignInLinkToEmail(auth, email, actionCodeSettings)
        .then(() => {
            useBanner("Email gesendet", "success");
            navigateTo("/");
        })
        .catch((error) => {
            console.log(error);
            useBanner("Ein Fehler ist aufgetreten", "error");
        });

};

const handleMsSignIn = async () => {
    organization = organization.trim();
    const auth = useFirebaseAuth();
    if (!auth) return;
    signInWithPopup(auth, provider).then((result) => {
        if (result?.user) {
            console.log(result);
            console.log("logged in");
            useBanner("Erfolgreich angemeldet", "success");
            organization = "Birklehof";
            navigateTo("/user");
        } else {
            console.log("result object empty");
        }
    })
        .catch((error) => {
            console.log(error);
            useBanner("Ein Fehler ist aufgetreten", "error");
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode, errorMessage);
            // The email of the user's account used.
            const email = error.email;
            console.log(email);
            // The AuthCredential type that was used.
            const credential = OAuthProvider.credentialFromError(error);
            console.log(credential);
        });
};

// onMounted(async () => {
//     console.log("mounted");
//     const auth = useFirebaseAuth();
//     console.log("auth", auth);
//     if (!auth) return;
//     getRedirectResult(auth)
//         .then((result) => {
//             if (result?.user) {
//                 console.log(result);
//                 console.log("logged in");
//                 useBanner("Erfolgreich angemeldet", "success");
//                 organization = "Birklehof";
//                 navigateTo("/user");
//             } else {
//                 console.log("result object empty");
//             }
//         })
//         .catch((error) => {
//             console.log(error);
//             useBanner("Ein Fehler ist aufgetreten", "error");
//             // Handle Errors here.
//             const errorCode = error.code;
//             const errorMessage = error.message;
//             console.log(errorCode, errorMessage);
//             // The email of the user's account used.
//             const email = error.email;
//             console.log(email);
//             // The AuthCredential type that was used.
//             const credential = OAuthProvider.credentialFromError(error);
//             console.log(credential);
//         });
// });

definePageMeta({
    title: "Anmelden",
})
</script>