export default async function () {
    let members = $(useLocalStorage("members", [] as [string, string][]));
    if (members.length === 0) {
        const { doc, getDoc, getFirestore } = await import("firebase/firestore/lite");
        const db = getFirestore();
        const organization = $(useLocalStorage("organization", ""));
        const docRef = doc(db, "organizations", organization);
        const docSnap = await getDoc(docRef);
        members = JSON.parse(docSnap.data()?.members_json);
    }
    let membersDict: { [key: string]: string } = {};
    for (const [id, name] of members) {
        membersDict[id] = name;
    }
    return membersDict;
}