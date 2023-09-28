export default async function (message: any, message_type: string) {
    let global_message = $(useState("global_message", () => ""));
    let global_message_type = $(useState("global_message_type", () => ""));
    global_message = message;
    global_message_type = message_type;
    setTimeout(() => {
        global_message = "";
        global_message_type = "";
    }, 10000);
}