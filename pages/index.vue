<template>
    <div class="flex flex-col items-center w-64 border-opacity-50">
        <NuxtLink v-if="is_admin" class="btn btn-primary btn-wide" to="/admin">Admin-Übersicht</NuxtLink>
        <NuxtLink v-else-if="is_member" class="btn btn-primary btn-wide" to="/user">Tischwünsche abgeben</NuxtLink>
        <div v-else>
            <NuxtLink class="btn btn-primary btn-wide" to="/user-login">Login</NuxtLink>
            <div class="divider divider-secondary"></div>
            <NuxtLink class="btn btn-primary btn-wide" to="/admin-login">Admin-Login</NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
let is_admin = $(useLocalStorage<string | null>("is_admin", null));
let is_member = $(useLocalStorage<string | null>("is_member", null));
definePageMeta({
    title: "Sitzplan App",
})
</script>