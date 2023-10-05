<template>
    <div class="flex flex-col items-center">
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
            <button type="submit" class="btn btn-outline">Bestätigen</button>
        </form>
        <button class="btn btn-outline btn-wide" @click="logout()" v-else>Abmelden</button>
    </div>
</template>

<script setup lang="ts">
import { sendSignInLinkToEmail } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore/lite";

const host = useRequestURL().host;

let organization = $(useLocalStorage("userOrganization", ""));
let email = $(useLocalStorage("userEmailForSignIn", ""));

const current_user = $(useCurrentUser());
const logged_in = $computed(() => current_user !== null);

const db = getFirestore(useFirebaseApp());

const handleSignIn = async () => {
    const actionCodeSettings = {
        url: `https://${host}/user`,
        handleCodeInApp: true,
    };
    const auth = useFirebaseAuth();
    if (!auth) return;
    const docRef = doc(db, "organizations/" + organization);
    const docSnap = await getDoc(docRef);
    if (!docSnap.data()?.members.includes(email)) {
        useBanner("Email nicht in Organisation vorhanden", "error");
        return;
    }
    sendSignInLinkToEmail(auth, email, actionCodeSettings)
        .then(() => {
            useBanner("Email gesendet", "success");
        })
        .catch((error) => {
            console.log(error);
            useBanner("Ein Fehler ist aufgetreten", "error");
        });

};


const logout = () => {
    const auth = useFirebaseAuth();
    if (!auth) return;
    auth.signOut();
};

definePageMeta({
    title: "Als Nutzer Anmelden",
})
</script>