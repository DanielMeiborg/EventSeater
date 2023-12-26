<template>
    <div>
        <div v-for="[title, content] in contents"
            class="collapse collapse-arrow border border-base-300 bg-primary mt-5 max-w-prose">
            <input type="checkbox" />
            <div class="collapse-title text-xl font-medium text-[#ECFEF5] max-w-prose">
                {{ title }}
            </div>
            <div class="collapse-content flex flex-col items-center text-[#ECFEF5]">
                <div class="flex justify-between w-full items-center flex-col md:flex-row">
                    {{ content }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

const contents: [string, string][] = [
    ["Können Tischwünsche geändert werden?", "Ja, bis zum Ende der Abgabefrist können Tischwünsche beliebig oft geändert werden."],
    ["Ich kann mich nicht in der Suche finden.", "Man selbst, und alle Personen die man bereits angegeben hat, werden in der Suche nicht angezeigt - sich zweimal hinzuzufügen macht keinen Sinn."],
    ["Wie schicke ich Tischwünsche ab?", "Die Tischwünsche werden automatisch gespeichert. Es ist weder nötig noch möglich etwas abzuschicken."],
    ["Wie überprüfe ich, ob die Tischwünsche ankamen?", "Die Tischwünsche werden automatisch gespeichert. Jede Änderung wird sofort auf den Server hochgeladen; dazu wird auch eine Meldung “Tischwünsche aktualisiert” angezeigt. Um ganz sicher zu gehen, kann man die Seite neu laden. Wenn die Tischwünsche noch alle da sind, ist alles auf dem Server angekommen."], ["Soll ich mich über Microsoft oder mit Organisation und Email anmelden?", "Mitglieder vom Birklehof sollten zuerst die Anmeldung über Microsoft probieren. Die Anmeldung über Email ist für andere Organisationen gedacht oder für den Fall, dass man keinen Zugriff auf seinen Microsoft-Account hat."], ["Was passiert, wenn ich an keinem Tisch eingetragen werde?", "Wenn man selbst keine Wünsche abgegeben hat und auch von niemand anderem angegeben wurde, wird man in Absprache mit der Internatsleitung einem Tisch zugeteilt."], ["Die Anmeldung über Microsoft funktioniert nicht.", "Wenn man auf den Knopf drückt, wird ein weiteres Fenster bzw. Tab geöffnet. Je nachdem, ob man sich in dem Browser schonmal mit Microsoft angemeldet hat, wird man nach wenigen Sekunden weitergeleitet, oder muss sich mit dem Microsoft-Account der Schule anmelden. Bei manchen Browsern (z.B. Safari auf dem Mac) werden Popups standardmäßig blockiert. In diesem Fall muss man das Popup manuell erlauben (die Details sind browserabhängig)."], ["Bei der Anmeldung mit Organisation und Email bekomme ich keine Email zugesendet.", "Wenn die Meldung “Email gesendet” angezeigt wird, wird immer eine Email gesendet. Wenn keine ankommt, liegt das auf der Seite der Email-Adresse (z.B. Spam-Filter). Für Mitglieder des Birklehofs ist aber die Anmeldung über Microsoft zu empfehlen - siehe “Soll ich mich über Microsoft oder mit Organisation und Email anmelden?”."], ["Kann ich Tischwünsche auch für andere Tische (außer dem, an dem ich sitze) abgeben?", "Das ist nicht derzeit möglich."], ["Mir wird angezeigt, ich sei nicht Mitglied der Organisation.", "Das kann mehrere Gründe haben. Wenn man sich versucht, über einen Email-Link anzumelden, liegt das i.d.R. daran, dass die Organisation oder die Email falsch eingegeben wurde. Bei der Anmeldung über Microsoft kann das daran liegen, dass die Mitgliederliste nicht vollständig ist (z.B. bei kürzlich hinzugekommenen Austauschschülern)."], ["Kann ich sehen, wer mich angegeben hat?", "Das ist derzeit nicht möglich."]
];
definePageMeta({
    title: "häufig gestellte Fragen",
})
</script>