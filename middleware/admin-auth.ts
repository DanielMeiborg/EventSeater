export default defineNuxtRouteMiddleware(async (to, from) => {
    let is_admin = $(useLocalStorage<string | null>("is_admin", null));
    if (is_admin == "true") { } else {
        if (to.query.apiKey !== undefined) { } else {
            const user = $(useCurrentUser());
            if (!user?.email) {
                useBanner("Nicht angemeldet", "error");
                is_admin = "false";
                return navigateTo("/admin-login");
            }
            if (user?.emailVerified !== true) {
                useBanner("E-Mail-Adresse nicht verifiziert", "error");
                is_admin = "false";
                return navigateTo("/admin-login");
            }
            if (is_admin === "false") {
                useBanner("Administrator-Account notwendig", "error");
                return navigateTo("/admin-login");
            }
            const { getFirestore, doc, getDoc } = await import("firebase/firestore/lite");
            const db = getFirestore();
            const user_ref = doc(db, "admins", user.email);
            try {
                const user_doc = await getDoc(user_ref);
                if (user_doc.exists()) {
                    is_admin = "true";
                    return;
                }
                else {
                    useBanner("Administrator-Account notwendig", "error");
                    is_admin = "false";
                    return navigateTo("/admin-login");
                }
            } catch (error) {
                useBanner("Administrator-Account notwendig", "error");
                is_admin = "false";
                return navigateTo("/admin-login");
            }
        }
    }
})