<template>
    <div>
        <div v-if="dataPending || data === null"></div>
        <div v-else>
            <div v-if="authenticated === false" class="alert alert-error">Sie sind nicht Mitglied dieser Organisation</div>
            <div v-else class="flex flex-col items-center w-full max-w-prose">
                <!-- <h2 class="text-3xl font-bold pt-8 pb-3">Insgesamt verfügbare Tische</h2>
                <div class="flex flex-col items-center ">
                    <div v-for="table in data.tables" :key="table[0]" class="mb-2 w-full flex justify-between">
                        <span class="badge badge-primary mr-5">{{ table[0] }}er Tische</span>
                        <span class="badge badge-accent">{{ table[1] }}</span>
                    </div>
                </div> -->

                <!-- <h2 class="text-3xl font-bold pt-8 pb-3">Tischwünsche abgeben</h2> -->
                <!-- <button class="btn btn-primary btn-wide" @click="updatePreferences()">Liste aktualisieren</button> -->
                <div role="alert" class="alert alert-info">
                    <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        class="stroke-current shrink-0 w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg> -->
                    <span>Tischwünsche werden automatisch gespeichert</span>
                </div>
                <div class="overflow-x-auto pt-3">
                    <table class="table">
                        <tbody>
                            <tr class="hover text-gray-400 dark:text-gray-500">
                                <td>{{ email ? data.members[email] : "" }}</td>
                                <td></td>
                            </tr>
                            <tr class="hover" v-for="preference in preferences" :key="preference">
                                <td>{{ data.members ? data.members[preference] : preference }}</td>
                                <td><button
                                        class="btn btn-error btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                        @click="removePreference(preference)">
                                        <Icon name="mdi:trash" size="2em" color="black" />
                                    </button></td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="text" v-model="newPreference" class="input input-bordered w-full max-w-xs"
                                        @keydown.enter.exact.prevent="addPreference(filteredMembers[0][0])" />
                                </td>
                                <td>
                                    <button v-if="newPreference !== ''"
                                        class="btn btn-success btn-sm btn-square transition ease-in-out xl:hover:scale-110"
                                        @click.prevent="addPreference(filteredMembers[0][0])">
                                        <Icon name="material-symbols:add" size="2em" color="black" />
                                    </button>
                                    <div v-else class="w-8"></div>
                                    <!-- <button v-else class="btn btn-disabled btn-sm btn-square">
                                        <Icon name="material-symbols:add" size="2em" color="black" />
                                    </button> -->
                                </td>
                            </tr>
                            <div class="flex justify-center">
                                <ul v-if="newPreference !== ''" class="menu bg-base-200 w-56 rounded-box">
                                    <li v-for="member in filteredMembers" :key="member[0]">
                                        <button @click="addPreference(member[0])">{{ member[1] }}</button>
                                    </li>
                                </ul>
                            </div>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getFirestore, doc, getDoc } from "firebase/firestore/lite";

const auth = useFirebaseAuth();
const db = getFirestore(useFirebaseApp());
const user = $(useCurrentUser());
let organization = $(useLocalStorage("organization", ""));
let newPreference = $ref("");
let email = $(useLocalStorage("userEmailForSignIn", ""));
if (email == undefined || email === "") {
    email = auth?.currentUser?.email || "";
}

async function waitForUser() {
    if (user === undefined) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await waitForUser();
    } else {
        return;
    }
}

const { data: authenticated, pending: authenticationPending } = $(await useLazyAsyncData(async () => {
    if (auth) {
        await waitForUser();
        if (user === null) {
            const { isSignInWithEmailLink, signInWithEmailLink } = await import("firebase/auth");
            if (isSignInWithEmailLink(auth, window.location.href)) {
                console.log("Trying to log in")
                console.log("auth", auth);
                if (email === "") {
                    email = window.prompt("Bitte gib deine Email-Adresse ein") || "";
                }
                if (organization === "") {
                    organization = window.prompt("Bitte gib den Namen der Organisation ein") || "";
                }
                console.log("email: " + email);
                if (email && email !== "") {
                    try {
                        const result = await signInWithEmailLink(auth, email, window.location.href);
                        console.log(result);
                        const docRef = doc(db, "organizations/" + organization + "/preferences/" + result.user.email);
                        try {
                            const docSnap = await getDoc(docRef);
                            console.log("Access to organization");
                            console.log(docSnap?.data());
                            useBanner("Anmeldung erfolgreich", "success");
                            let is_member = $(useLocalStorage<boolean | null>("is_member", null));
                            is_member = true;
                            navigateTo("/user");
                            return true;
                        } catch (error: any) {
                            console.log(error);
                            console.log(error.code);
                            if (error.code === "permission-denied") {
                                console.log("Not a member");
                                useBanner("Sie sind nicht Mitglied dieser Organisation", "error");
                            } else {
                                console.log("Unknown error");
                                console.log(error);
                                useBanner("Ein Fehler ist aufgetreten", "error");
                            }
                            return false;
                        }
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
            }
        } else {
            if (organization === "") {
                organization = window.prompt("Bitte gib den Namen der Organisation ein") || "";
            }
            const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
            try {
                const docSnap = await getDoc(docRef);
                console.log("Access to organization");
                let is_member = $(useLocalStorage<boolean | null>("is_member", null));
                is_member = true;
                navigateTo("/user");
                return true;
            } catch (error: any) {
                console.log(error);
                console.log(error.code);
                if (error.code === "permission-denied") {
                    console.log("Not a member");
                    useBanner("Sie sind nicht Mitglied dieser Organisation", "error");
                } else {
                    console.log("Unknown error");
                    console.log(error);
                    useBanner("Ein Fehler ist aufgetreten", "error");
                }
                return false;
            }
        }
    }
}));

let preferences = $(useLocalStorage("preferredMembers", [] as string[]));
const updatePreferences = async (noBanner = false) => {
    console.log("Updating preferences");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await getDoc(docRef).catch((error) => {
        console.log(error);
        console.log(error.code);
        if (error.code === "permission-denied") {
            console.log(error);
            useBanner("Sie sind nicht Mitglied dieser Organisation", "error");
        } else {
            console.log("Unknown error");
            useBanner("Mitglieder konnten nicht aktualisiert werden", "error");
        }
    }).then((docSnap) => {
        if (docSnap && docSnap.exists()) {
            preferences = docSnap.data().members.filter((email: string) => email !== undefined && email != null && email !== "");
            if (!noBanner) {
                useBanner("Mitgliederliste aktualisiert", "success");
            }
        } else {
            preferences = [];
            console.log("No preferences submitted");
            if (!noBanner) {
                useBanner("Mitgliederliste aktualisiert", "success");
            }
        }
    });
};


const { data, pending: dataPending } = $(await useLazyAsyncData(async () => {
    while (authenticationPending) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await updatePreferences(true);
    const docRef = doc(db, "organizations/" + organization);
    const docSnap = await getDoc(docRef);
    const tablesList: number[] = docSnap.data()?.tables;
    const numTablesBySize: Record<number, number> = {};
    tablesList.forEach((table) => {
        if (numTablesBySize[table]) {
            numTablesBySize[table] += 1;
        } else {
            numTablesBySize[table] = 1;
        }
    });
    const tablesBySize: [number, number][] = [];
    Object.keys(numTablesBySize).forEach((key) => {
        tablesBySize.push([parseInt(key), numTablesBySize[parseInt(key)]]);
    });
    const members = await useMembers();
    const tables = tablesBySize.sort((a, b) => a[0] - b[0]);
    return { tables, members };
}, {}));

const filteredMembers = $computed(() => {
    if (data === null || data === undefined) {
        return [];
    }
    if (data.members === undefined || data.members === null) {
        return [];
    }
    return Object.entries(data?.members).filter(([email, name]) => {
        if (preferences.includes(email) || email === user?.email) {
            return false;
        }
        return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("(", "").split(" ").map((word) => word.startsWith(newPreference.toLowerCase())).includes(true);
    }).sort((a, b) => a[1].localeCompare(b[1]));
});

const addPreference = async (preference: string) => {
    const { updateDoc } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await getDoc(docRef).catch((error) => {
        console.log(error);
        useBanner("Mitglieder konnten nicht aktualisiert werden", "error");
    }).then(async (docSnap) => {
        if (docSnap && docSnap.exists()) {
            const oldMembers = docSnap.data().members;
            const membersSet = new Set([...oldMembers, preference]);
            const members = Array.from(membersSet);
            await updateDoc(docRef, {
                members: members,
            }).catch((error) => {
                console.log(error);
                useBanner("Tischwünsche konnten nicht geändert werden", "error");
            }).then(() => {
                useBanner("Tischwünsche aktualisiert", "success");
                updatePreferences(true);
            });
        } else {
            const { setDoc } = await import("firebase/firestore/lite");
            await setDoc(docRef, {
                members: [preference],
            }).catch((error) => {
                console.log(error);
                useBanner("Tischwünsche konnten nicht abgegeben werden", "error");
            }).then(() => {
                useBanner("Tischwünsche abgegeben", "success");
                updatePreferences(true);
            });
        }
        newPreference = "";
    });
};

const removePreference = async (preference: string) => {
    const { updateDoc, arrayRemove } = await import("firebase/firestore/lite");
    const docRef = doc(db, "organizations/" + organization + "/preferences/" + user?.email);
    await updateDoc(docRef, {
        members: arrayRemove(preference),
    }).catch((error) => {
        console.log(error);
        useBanner("Tischwunsch konnte nicht entfernt werden", "error");
    }).then(() => {
        useBanner("Tischwunsch entfernt", "success");
        updatePreferences(true);
    });
};

definePageMeta({
    title: "Tischwünsche abgeben",
    middleware: "member-auth"
})
</script>