<template>
    <div class="flex flex-col items-center w-full gap-10 lg:flex-row lg:items-start lg:justify-center">
        <div class="flex flex-col items-center min-w-min">
            <button class="btn btn-wide btn-outline mb-5" @click="computePlan(false)">Sitzplan berechnen</button>
            <div class="collapse collapse-arrow border border-base-300 bg-base-200 mt-5 max-w-prose">
                <input type="checkbox" />
                <div class="collapse-title text-xl font-medium">
                    Erweiterte Einstellungen
                </div>
                <div class="collapse-content flex flex-col items-center">
                    <div class="flex justify-between w-full mb-5">
                        <p class="min-w-max">Generationen</p> <span class="badge badge-primary mr-7 ml-3">{{
                            max_generations
                        }}</span><input v-model="maxGenerationsExponent" type="range" min="1" max="20"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Populationsgröße</p> <span class="badge badge-primary mr-7 ml-3">{{ initial_population_size
                        }}</span><input v-model="initial_population_size" type="range" min="0" max="1000"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Mutationschance</p> <span class="badge badge-primary mr-7 ml-3">{{ mutation_chance
                        }}</span><input v-model="mutation_chance" type="range" min="0" max="1" step="0.01"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full mb-5">
                        <p>Selektionsstärke</p> <span class="badge badge-primary mr-7 ml-3">{{ selection_strength
                        }}</span><input v-model="selection_strength" type="range" min="2" max="100" step="1"
                            class="range range-sm" />
                    </div>
                    <div class="flex justify-between w-full items-center flex-col md:flex-row">
                        <button class="btn btn-outline min-w-max md:mr-7 md:mb-0 mb-3" @click="computePlan(true)"> Sitzplan
                            mit
                            JSON-Input berechnen</button>
                        <textarea v-model="rawJson"
                            placeholder='{"users": ["a", "b", "c"], "preferences": {"a": ["b"]}, "tables": [2, 2]}'
                            class="textarea textarea-bordered w-full" />
                    </div>
                    <div class="collapse collapse-arrow border border-base-300 bg-base-200 mt-5">
                        <input type="checkbox" />
                        <div class="collapse-title text-xl font-medium">
                            Input in JSON-Format
                        </div>
                        <div class="collapse-content">
                            <p>{{ { "users": users, "preferences": preferences, "tables": availableTables } }}</p>
                        </div>
                    </div>
                    <h3 class="text-2xl font-bold pt-8 pb-3">Details zum Algorithmus</h3>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
                        et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                        aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
                        cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                        culpa qui officia deserunt mollit anim id est laborum.</p>
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
let results = $ref<[number, [string, boolean][]][] | null>(null);
let rawJson = $ref("");
let bestScore = $ref<number | null>(null);

let organization = $(useLocalStorage("userOrganization", ""));

let users = $ref<string[]>([]);
let preferences = $ref<{ [user: string]: string[] }>({});
let availableTables = $ref<number[]>([]);


const maxGenerationsExponent = $ref(9);
const max_generations = $computed(() => Math.pow(2, maxGenerationsExponent));
const initial_population_size = $ref(500);
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
    if (organization === "") {
        useBanner("Keine Organisation ausgewählt", "error");
        return;
    }

    if (useJson) {
        parseJson();
        if (users.length === 0) {
            useBanner("Keine Mitglieder gefunden", "error");
            return;
        }
        if (availableTables.length === 0) {
            useBanner("Keine Tische gefunden", "error");
            return;
        }
    }
    useBanner("Sitzplan wird berechnet", "info");
    const auth = useFirebaseAuth();
    if (auth?.currentUser === null) {
        useBanner("Nicht angemeldet", "error");
        console.log("not logged in");
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
    httpsCallable(functions, "computePlan")(input).then((res) => {
        console.log(res);
        const data = res.data as {
            results: [number, [string, boolean][]][];
            bestScore: number;
        };
        console.log(data);
        results = data.results;
        bestScore = data.bestScore;
        useBanner("Sitzplan wurde berechnet", "success");
    }).catch((err) => {
        console.log(err);
        useBanner("Ein Fehler ist aufgetreten", "error");
    });
};

definePageMeta({
    title: "Sitzplan generieren",
    middleware: "admin-auth"
})
</script>
