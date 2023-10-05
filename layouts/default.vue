<template>
    <div tabindex="0" class="min-h-screen flex flex-col justify-between">
        <div>
            <Navbar />
            <div class="flex flex-col items-center p-6">
                <h1 class="text-4xl font-bold pb-8">
                    {{ title }}
                </h1>
                <div class="flex flex-col items-center w-full max-w-prose">
                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
let title = $computed(() => useRoute().meta.title as string);
</script>