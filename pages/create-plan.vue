<template>
    <div class="flex flex-col items-center w-full gap-10 lg:flex-row lg:items-start lg:justify-center">
        <div class="flex flex-col items-center min-w-min">
            <button v-if="calculating" class="btn btn-accent btn-wide mb-5 btn-disabled">Sitzplan wird
                berechnet...</button>
            <button v-else class="btn btn-accent btn-wide mb-5" @click="computePlan(false)">Sitzplan berechnen</button>
            <div class="collapse collapse-arrow border border-base-300 bg-primary mt-5 max-w-prose">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium text-[#ECFEF5]">
                    Erweiterte Einstellungen
                </div>
                <div class="collapse-content flex flex-col items-center text-[#ECFEF5]">
                    <div class="flex justify-between w-full mb-5">
                        <p class="min-w-max">Generationen</p> <span class="badge badge-accent mr-7 ml-3">{{
                            max_generations
                        }}</span><input v-model="maxGenerationsExponent" type="range" min="0" max="13"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Populationsgröße</p> <span class="badge badge-accent mr-7 ml-3">{{ initial_population_size
                        }}</span><input v-model="initial_population_size" type="range" min="1" max="1000"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Selektionsstärke</p> <span class="badge badge-accent mr-7 ml-3">{{ selection_strength
                        }}</span><input v-model="selection_strength" type="range" min="2" max="100" step="1"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full items-center flex-col md:flex-row">
                        <button v-if="calculating"
                            class="btn btn-accent btn-wide min-w-max md:mr-7 md:mb-0 mb-3 btn-disabled"
                            @click="computePlan(true)"> Sitzplan
                            wird berechnet...</button>
                        <button v-else class="btn btn-accent btn-wide min-w-max md:mr-7 md:mb-0 mb-3"
                            @click="computePlan(true)">
                            Sitzplan
                            mit
                            JSON-Input berechnen</button>
                        <textarea v-model="rawJson"
                            placeholder='{"users": ["a", "b", "c"], "preferences": {"a": ["b"]}, "tables": [2, 2]}'
                            class="textarea textarea-bordered textarea-accent w-full" />
                    </div>
                </div>
            </div>
        </div>
        <div>
            <Plan v-if="results !== null && bestScore !== null" :results="results" :bestScore="bestScore" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { getFunctions, httpsCallable } from "firebase/functions";

let input = $(useLocalStorage("algorithm-input", ""));
let results = $ref<[number, [string, boolean, boolean][]][] | null>(null);
let rawJson = $ref("");
let bestScore = $ref<number | null>(null);

let calculating = $ref(false);

let organization = $(useLocalStorage("organization", ""));

let users = $ref<string[]>([]);
let preferences = $ref<{ [user: string]: string[] }>({});
let availableTables = $ref<number[]>([]);


const maxGenerationsExponent = $ref(7);
const max_generations = $computed(() => Math.pow(2, maxGenerationsExponent));
const initial_population_size = $ref(100);
const mutation_chance = $ref(0.5);
const selection_strength = $ref(7);

const parseJson = () => {
    users = [];
    preferences = {};
    availableTables = [];
    try {
        const parsed = JSON.parse(rawJson);
        if (parsed.users.length === 0 || parsed.tables.length === 0, parsed.preferences === undefined) {
            console.log(parsed);
            useBanner("JSON-Input ist ungültig", "error");
            return;
        }
        users = parsed.users;
        preferences = parsed.preferences;
        availableTables = parsed.tables;
    } catch (e) {
        console.log(e);
        useBanner("JSON-Input ist ungültig", "error");
    }
};

const computePlan = async (useJson: boolean) => {
    calculating = true;
    if (organization === "") {
        useBanner("Keine Organisation ausgewählt", "error");
        calculating = false;
        return;
    }

    if (useJson) {
        parseJson();
        if (users.length === 0) {
            useBanner("Keine Mitglieder gefunden", "error");
            calculating = false;
            return;
        }
        if (availableTables.length === 0) {
            useBanner("Keine Tische gefunden", "error");
            calculating = false;
            return;
        }
    }
    useBanner("Sitzplan wird berechnet", "info");
    const auth = useFirebaseAuth();
    if (auth?.currentUser === null) {
        useBanner("Nicht angemeldet", "error");
        console.log("not logged in");
        calculating = false;
        return;
    }
    const functions = getFunctions(useFirebaseApp(), "europe-west3");
    const input = useJson ? {
        jsonInput: true,
        organization: organization,
        users: users,
        preferences: preferences,
        availableTables: availableTables,
        max_generations: max_generations,
        initial_population_size: initial_population_size,
        mutation_chance: mutation_chance,
        selection_strength: selection_strength
    } : {
        jsonInput: false,
        organization: organization,
        max_generations: max_generations,
        initial_population_size: initial_population_size,
        mutation_chance: mutation_chance,
        selection_strength: selection_strength
    };
    await httpsCallable(functions, "computePlan")(input).then((res) => {
        console.log(res);
        const data = res.data as {
            results: [number, [string, boolean, boolean][]][];
            bestScore: number;
        };
        console.log(data);
        results = data.results;
        bestScore = data.bestScore;
        useBanner("Sitzplan wurde berechnet", "success");
        calculating = false;
    }).catch((err) => {
        console.log(err);
        calculating = false;
        if (err.code === "deadline-exceeded") {
            useBanner("Berechnung dauert zu lange", "error");
            return;
        }
        useBanner("Ein Fehler ist aufgetreten", "error");
    });
    const members = await useMembers(true);
    calculating = false;
};

definePageMeta({
    title: "Sitzplan generieren",
    middleware: "admin-auth"
})
</script>
