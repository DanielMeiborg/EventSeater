export default function () {
    const auth = useFirebaseAuth();
    let is_member = $(useLocalStorage<boolean | null>("is_member", null));
    is_member = null;
    let is_admin = $(useLocalStorage<boolean | null>("is_admin", null));
    is_admin = null;
    let organization = $(useLocalStorage("organization", null));
    organization = null;
    if (!auth) return;
    auth.signOut();
    localStorage.clear();
    const route = useRequestURL().pathname;
    navigateTo("/");
    // reload 0.5 seconds after logout
    setTimeout(() => {
        window.location.reload();
    }, 500);
}