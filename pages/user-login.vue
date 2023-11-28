<template>
    <div class="flex flex-col items-center max-w-prose">
        <form v-if="!logged_in" @submit.prevent="handleSignIn" class="form-control w-full max-w-xs mb-5">
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
        <button class="btn btn-primary btn-wide" @click="useLogout()" v-else>Abmelden</button>
    </div>
</template>

<script setup lang="ts">
import { sendSignInLinkToEmail } from "firebase/auth";

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

definePageMeta({
    title: "Anmelden",
})
</script>