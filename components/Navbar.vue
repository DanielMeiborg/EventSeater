<template>
    <div class="fixed top-0 w-full z-10">
        <div class="navbar border-b-2 bg-base-100 border-secondary justify-between">
            <div class="navbar-start w-full">
                <div class="dropdown">
                    <label tabindex="0" class="btn btn-ghost xl:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h8m-8 6h16" />
                        </svg>
                    </label>
                    <ul tabindex="0" class="z-50 menu dropdown-content mt-3 p-2 shadow bg-primary rounded-box w-52">
                        <li class="z-50" v-for="item in menu">
                            <NuxtLink class="z-50 text-[#ECFEF5] hover:text-[#ECFEF5]" :to="item.link"
                                @click="$event.target.blur()">
                                {{ item.name }}
                            </NuxtLink>
                        </li>
                    </ul>
                </div>
                <div class="hidden xl:flex">
                    <ul class="menu menu-horizontal px-1">
                        <li v-for="item in menu">
                            <NuxtLink :to="item.link">{{ item.name }}</NuxtLink>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="navbar-end w-full">
                <span v-if="user && organization && organization !== ''" class="mr-3">{{ organization }}</span>
                <span v-if="user" class="truncate mr-3 badge badge-primary hidden sm:block">{{ user.email }}</span>
                <button v-if="user" class="btn btn-ghost" @click="logout()">
                    Abmelden
                </button>
                <!-- <NuxtLink v-if="!user" to="/login" class="btn btn-ghost">Anmelden</NuxtLink> -->
            </div>
        </div>
        <div v-if="global_message" :class="banner_class + ' mb-4 flex justify-center items-center select-none'">
            <p class="h-14 flex justify-center items-center text-accent-content">{{ global_message }}</p>
        </div>
        <div v-else class="mb-4">
            <p class="h-14 flex justify-center items-center text-accent-content"> </p>
        </div>
    </div>
</template>

<script setup lang="ts">
const user = $(useCurrentUser());
let organization = $(useLocalStorage<string | null>("organization", null));

const menu = $ref<{ name: string, link: string }[]>([
    {
        name: "Start",
        link: "/",
    },
    {
        name: "Login",
        link: "/user-login",
    },
    {
        name: "Tischwünsche abgeben",
        link: "/user",
    },
    {
        name: "Admin-Login",
        link: "/admin-login",
    },
    {
        name: "Admin-Übersicht",
        link: "/admin",
    }
]);

let global_message = $(useState("global_message", () => ""));
let global_message_type = $(useState("global_message_type", () => ""));

const banner_class = computed(() => {
    switch (global_message_type) {
        case "info":
            return "bg-info";
        case "success":
            return "bg-success";
        case "warning":
            return "bg-warning";
        case "error":
            return "bg-error";
        case "none":
            return "hidden";
        default:
            return "bg-info";
    }
});

const logout = () => {
    const auth = useFirebaseAuth();
    let is_member = $(useLocalStorage<boolean | null>("is_member", null));
    is_member = null;
    let is_admin = $(useLocalStorage<boolean | null>("is_admin", null));
    is_admin = null;
    organization = null;
    if (!auth) return;
    auth.signOut();
    navigateTo("/");
};
</script>