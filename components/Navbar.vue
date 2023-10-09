<template>
    <div class="navbar bg-base-100 border-b-2 border-primary">
        <div class="navbar-start">
            <div class="dropdown">
                <label tabindex="0" class="btn btn-ghost xl:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                </label>
                <ul tabindex="0" class="menu dropdown-content mt-3 p-2 shadow bg-secondary rounded-box w-52">
                    <li v-for="item in menu">
                        <NuxtLink :to="item.link" @click="$event.target.blur()">{{ item.name }}</NuxtLink>
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
        <div class="navbar-end">
            <span v-if="user" class="truncate">{{ user.email }}</span>
            <button v-if="user" class="btn btn-ghost" @click="logout()">
                Abmelden
            </button>
            <!-- <NuxtLink v-if="!user" to="/login" class="btn btn-ghost">Anmelden</NuxtLink> -->
        </div>
    </div>
    <div v-if="global_message" :class="banner_class + ' mb-4 flex justify-center items-center'">
        <p class="h-14 flex justify-center items-center text-accent-content">{{ global_message }}</p>
    </div>
    <div v-else class="mb-4">
        <p class="h-14 flex justify-center items-center text-accent-content"> </p>
    </div>
</template>

<script setup lang="ts">
const user = $(useCurrentUser());

const menu = $ref<{ name: string, link: string }[]>([
    {
        name: "Startseite",
        link: "/",
    },
    {
        name: "Admin Login",
        link: "/admin-login",
    },
    {
        name: "Admin",
        link: "/admin",
    },
    {
        name: "Nutzer Login",
        link: "/user-login",
    },
    {
        name: "Nutzer",
        link: "/user",
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
    if (!auth) return;
    auth.signOut();
};
</script>