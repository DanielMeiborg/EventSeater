<template>
    <div>
        <div class="flex flex-col justify-between items-center w-full mb-5 md:flex-row">
            <h2 class="text-3xl font-bold mr-5">Ergebnisse</h2>
            <p v-if="bestScore !== null"><span class="badge badge-secondary">{{ -bestScore }}</span> {{ bestScore === -1 ?
                "Wunsch" : "Wünsche" }} nicht erfüllt
            </p>
        </div>
        <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-cols-min">
            <div v-for="table in results.sort((a, b) => b[0] - a[0])"
                class="bg-primary rounded-md p-3 flex-col items-center">
                <span class="text-2xl font-bold mb-3 w-full flex justify-center">{{ table[0] }}</span>
                <div class="flex flex-col justify-center items-center">
                    <div v-for="user in table[1]" class="my-2">
                        <span v-if="!user[1]" class="badge badge-error">
                            {{ user[0] }}</span>
                        <span v-else-if="user[2]" class="badge badge-success">{{ user[0] }}</span>
                        <span v-else class="badge">{{ user[0] }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { results, bestScore } = defineProps<{
    results: [number, [string, boolean, boolean][]][],
    bestScore: number
}>();
</script>