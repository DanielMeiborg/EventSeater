export default defineNuxtRouteMiddleware(async (to, from) => {
    let is_member = $(useLocalStorage<string | null>("is_member", null));
    if (is_member == "true") { } else {
        if (to.query.apiKey !== undefined) { } else {
            const user = $(useCurrentUser());
            if (!user?.email) {
                useBanner("Nicht angemeldet", "error");
                is_member = "false";
                return navigateTo("/user-login");
            }
            if (user?.emailVerified !== true) {
                useBanner("E-Mail-Adresse nicht verifiziert", "error");
                is_member = "false";
                return navigateTo("/user-login");
            }
            const organization = $(useLocalStorage("organization", ""));
            if (organization === "") {
                useBanner("Nicht angemeldet", "error");
                is_member = "false";
                return navigateTo("/user-login");
            }
            if (is_member === "false") {
                useBanner("Mitglieds-Account notwendig", "error");
                return navigateTo("/user-login");
            }
            const { getFirestore, doc, getDoc } = await import("firebase/firestore/lite");
            const db = getFirestore();
            const organization_ref = doc(db, "organization", organization);
            try {
                const organization_doc = await getDoc(organization_ref);
                if (organization_doc.data()?.members.includes(user.email)) {
                    is_member = "true";
                }
                else {
                    useBanner("Mitglieds-Account notwendig", "error");
                    is_member = "false";
                    return navigateTo("/user-login");
                }
            } catch (error) {
                useBanner("Mitglieds-Account notwendig", "error");
                is_member = "false";
                return navigateTo("/user-login");
            }
        }
    }
})