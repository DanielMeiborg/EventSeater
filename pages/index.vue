<template>
    <div class="flex flex-col items-center w-64 border-opacity-50">
        <NuxtLink class="btn btn-primary btn-wide" to="/user-login">Login</NuxtLink>
        <div class="divider divider-secondary"></div>
        <NuxtLink class="btn btn-primary btn-wide" to="/user">Tischwünsche abgeben</NuxtLink>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    title: "Sitzplan App",
})
</script>