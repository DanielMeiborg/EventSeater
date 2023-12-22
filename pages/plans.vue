<template>
    <div class="w-full flex flex-col items-center">
        <div class="collapse collapse-arrow border border-base-300 bg-primary my-5 max-w-prose">
            <input type="checkbox" value="true" />
            <div class="collapse-title text-xl font-medium text-[#ECFEF5]">
                Plan auswählen
            </div>
            <div class="collapse-content flex flex-col items-center">
                <button @click="selectPlan(plan)" v-for="plan in plans"
                    class="btn btn-secondary outline m-2 w-full max-w-md">{{
                        stringifyPlan(plan)
                    }}</button>
            </div>
        </div>
        <Plan v-if="results !== undefined && bestScore !== undefined" :results="results" :score="bestScore" />
    </div>
</template>

<script setup lang="ts">
import { doc, getDoc, getFirestore } from "firebase/firestore/lite";
let plans = $ref<string[]>([]);
const organization = $(useLocalStorage("organization", ""));
let results = $ref<[number, [string, boolean, boolean][]][]>();
let bestScore = $ref<number | undefined>();

const stringifyPlan = (plan: string) => {
    const date = new Date(Date.parse(plan));
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

onMounted(async () => {
    const db = getFirestore();
    const docRef = doc(db, "organizations", organization);
    await getDoc(docRef).then((doc) => {
        if (doc.exists()) {
            plans = doc.data()?.plans;
            plans = plans.reverse();
        } else {
            useBanner("Organisation nicht gefunden", "error");
        }
    }).catch((error) => {
        console.log(error);
        useBanner("Ein Fehler ist aufgetreten", "error");
    });
});

const selectPlan = async (plan: string) => {
    const db = getFirestore();
    const planDoc = doc(db, "organizations", organization, "plans", plan);
    await getDoc(planDoc).then((doc) => {
        if (doc.exists()) {
            results = JSON.parse(doc.data()?.results) as [number, [string, boolean, boolean][]][];
            bestScore = doc.data()?.bestScore;
        } else {
            useBanner("Organisation nicht gefunden", "error");
        }
    }).catch((error) => {
        console.log(error);
        useBanner("Ein Fehler ist aufgetreten", "error");
    });
};

definePageMeta({
    title: "Sitzpläne einsehen",
    middleware: "admin-auth"
})
</script>