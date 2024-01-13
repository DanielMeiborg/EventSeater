<template>
    <div tabindex="0" class="min-h-[100dvh] flex flex-col justify-between ">
        <div>
            <Navbar />
            <div class="flex flex-col items-center p-6 pt-36">
                <h1 class="text-4xl font-bold pb-8">
                    {{ title }}
                </h1>
                <div class="flex flex-col items-center w-full">
                    <Suspense>
                        <slot />
                        <template #fallback>
                            <div class="skeleton h-[min(600px,60vh)] w-[min(90vw,370px)]"></div>
                        </template>
                    </Suspense>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
let title = $computed(() => useRoute().meta.title as string);
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const app = useFirebaseApp();

if (window.location.hostname === 'localhost') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeLa08pAAAAAFb6tBSTUvr3YeDPgcXjMemYyZD7"),
    isTokenAutoRefreshEnabled: true
});
</script>

<style>
body {
    overflow-y: scroll;
}

body::-webkit-scrollbar {
    width: 0.5em;
}

body::-webkit-scrollbar-track {
    background: transparent;
}

body::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
}
</style>