export default async function (forceFetch = false) {
    let members = $(useLocalStorage("members", {} as { [key: string]: string }));
    if (Object.keys(members).length === 0 || forceFetch) {
        const { doc, getDoc, getFirestore } = await import("firebase/firestore/lite");
        const db = getFirestore();
        const organization = $(useLocalStorage("organization", ""));
        console.log("organization", organization);
        const docRef = doc(db, "organizations", organization);
        const docSnap = await getDoc(docRef);
        console.log("docSnap", docSnap);
        members = JSON.parse(docSnap.data()?.members_json);
        console.log("members after fetch", members);
        return members;
    }
    return members;
}