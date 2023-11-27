<template>
    <div>
        <div v-if="!pending && members !== null">
            <div class="flex flex-col justify-between items-center w-full mb-5 md:flex-row">
                <h2 class="text-3xl font-bold mr-5">Ergebnisse</h2>
                <p v-if="bestScore !== null"><span class="badge badge-accent">{{ -bestScore }}</span> {{ bestScore ===
                    -1 ?
                    "Wunsch" : "Wünsche" }} nicht erfüllt
                </p>
            </div>
            <div class="collapse collapse-arrow border border-base-300 bg-primary my-5 w-full">
                <input type="checkbox" value="true" />
                <div class="collapse-title text-xl font-medium text-[#ECFEF5]">
                    Plan exportieren
                </div>
                <div class="collapse-content flex flex-col items-center">
                    <h3 class="text-xl font-bold mb-3 text-[#ECFEF5]">Raumstruktur</h3>
                    <textarea v-model="rawStructure" placeholder='8,0,8,8
9,6,6,9
9,6,6,9
9,6,6,9
9,6,6,9
9,6,6,9
8,8,0,10' class="textarea textarea-bordered textarea-accent w-full mb-3 max-w-xs h-60" />
                    <button class="btn btn-secondary btn-wide mb-3" @click="exportPlan()">Plan exportieren</button>
                    <NuxtLink class="btn btn-secondary btn-wide" to="https://app.diagrams.net">DrawIO öffnen
                    </NuxtLink>
                </div>
            </div>
            <div class="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-cols-min">
                <div v-for="table in results.sort((a, b) => b[0] - a[0])"
                    class="bg-primary rounded-md p-3 flex-col items-center">
                    <span class="text-2xl font-bold mb-3 w-full flex justify-center text-[#ECFEF5]">{{ table[0]
                    }}</span>
                    <div class="flex flex-col justify-center items-center">
                        <div v-for="user in table[1]" class="my-2">
                            <span v-if="!user[1]" class="badge badge-error">
                                {{ members[user[0]] }}</span>
                            <span v-else-if="user[2]" class="badge badge-success">{{ members[user[0]] }}</span>
                            <span v-else class="badge badge-neutral">{{ members[user[0]] }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { saveAs } from "file-saver";
let rawStructure = $(useLocalStorage("rawStructure", ""));

const { data: members, pending } = $(await useAsyncData(async () => {
    let members = await useMembers();
    const { getFirestore, doc, getDoc } = await import("firebase/firestore/lite");
    const db = getFirestore();
    const organization = $(useLocalStorage("organization", ""));
    const organizationDoc = await getDoc(doc(db, "organizations", organization));
    if (organizationDoc.exists()) {
        if (organizationDoc.data()?.structure !== undefined) {
            rawStructure = organizationDoc.data()?.structure;
        }
    }
    return members;
}));


// the positions of the available tables
type Structure = {
    // dimensions of tables
    widthTables: number,
    heightTables: number,
    // 0 size means no table
    tables: number[][]
};

// an grid of tables with the names of the members
type Plan = string[][][];

const parseStructure = async (rawStructure: string) => {
    const structure: Structure = {
        widthTables: 0,
        heightTables: 0,
        tables: []
    };
    const lines = rawStructure.split("\n");
    lines.forEach((line, index) => {
        const row = line.split(",");
        if (index === 0) {
            structure.widthTables = row.length;
        }
        if (row.length !== structure.widthTables) {
            useBanner("Struktur ungültig", "error");
            return;
        }
        structure.heightTables++;
        structure.tables.push(row.map((table) => parseInt(table)));
    });
    // check if the tables are the same as initially defined
    const StructureTables = structure.tables.flat().filter((table) => table !== 0).sort((a, b) => b - a);
    const resultTables: number[] = results.map((result) => result[0]).sort((a, b) => b - a);
    for (let i = 0; i < resultTables.length; i++) {
        if (StructureTables[i] < resultTables[i]) {
            useBanner("Struktur ungültig", "error");
            return;
        }
    }
    return structure;
};

const getPlan = (structure: Structure) => {
    if (members === null) {
        return;
    }
    const date: string = new Date().toLocaleDateString("de-DE");
    // fill with empty tables with widthTables and heightTables dimensions
    let plan: Plan = Array.from({ length: structure.heightTables }, () =>
        Array.from({ length: structure.widthTables }, () => [])
    );
    // populate the plan with the names of the members according to the table distribution in results
    results
        .sort((a, b) => b[0] - a[0])
        .forEach((table) => {
            // index of the largest not-already-taken table in plan
            const index: [number, number] = plan
                .map((row, rowIndex) => row.map((table, colIndex) => [table.length === 0, rowIndex, colIndex, structure.tables[rowIndex][colIndex]] as [boolean, number, number, number]))
                .flat()
                .filter((table) => table[0])
                .sort((a, b) => b[3] - a[3])
                .map((table) => [table[1], table[2]] as [number, number])[0];
            plan[index[0]][index[1]] = table[1].map((user) => members[user[0]]);
        });
    return plan;
};

const convertToDrawio = (plan: Plan, structure: Structure) => {
    const date: string = new Date().toLocaleDateString("de-DE");
    const maxWidth = 827;
    const maxHeight = 1169;
    const headerOffset = 60;
    const tableWidth = 160;
    const tableHeight = 140;
    // compute table width and spacing from the maxWidth and widthTables
    const spacingX = Math.floor((maxWidth - tableWidth * structure.widthTables) / (structure.widthTables + 1));
    const spacingY = Math.floor((maxHeight - headerOffset - tableHeight * structure.heightTables) / (structure.heightTables + 1));
    const mxCellStrings: string[] = plan.map((row, rowIndex) => {
        return row.map((table, colIndex) => {
            if (table.length === 0) {
                return "";
            }
            const prefix = `<mxCell id="CGzH51dxT8guHxzjQDU1-${rowIndex * 100 + colIndex}" value="`;
            const content = table.join("&lt;br style=&quot;font-size: 9px;&quot;&gt;");
            const suffix = `" style="rounded=1;whiteSpace=wrap;html=1;fontSize=10;" parent="1" vertex="1"><mxGeometry x="${colIndex * tableWidth + (colIndex + 1) * spacingX}" y="${rowIndex * tableHeight + (rowIndex + 1) * spacingY + headerOffset}" width="${tableWidth}" height="${tableHeight}" as="geometry"/></mxCell>`;
            return prefix + content + suffix;
        });
    })
        .flat();
    const mxCellString = mxCellStrings.join("\n");
    const prefix = `<mxfile host="app.diagrams.net" modified="2023-11-20T09:25:35.747Z"
  agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15"
  etag="i7lzmxVypH0X-lqLJs-3" version="22.1.3" type="device">
  <diagram name="Page-1" id="GlAgDuQgeEw0gbTiyHTq">
    <mxGraphModel dx="975" dy="673" grid="1" gridSize="10" guides="1" tooltips="1" connect="1"
      arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0"
      shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />`;

    const suffix = `        <mxCell id="xJDowvUHYLvpaEtq0bmm-1" value="&lt;h1&gt;Sitzplan&lt;/h1&gt;"
          style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;"
          vertex="1" parent="1">
          <mxGeometry x="384" y="30" width="60" height="30" as="geometry" />
        </mxCell>
        <mxCell id="xJDowvUHYLvpaEtq0bmm-2" value="${date}"
          style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;"
          vertex="1" parent="1">
          <mxGeometry x="30" y="10" width="70" height="30" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
    return prefix + mxCellString + suffix;
};

const exportPlan = async () => {
    const structure = await parseStructure(rawStructure);
    if (structure === undefined) {
        return;
    }
    const plan = getPlan(structure);
    if (plan === undefined) {
        return;
    }
    const drawio = convertToDrawio(plan, structure);
    const date = new Date().toLocaleString("de-DE").replace(/\.|:|\s/g, "-").replace(",-", "_");
    let blob = new Blob([drawio], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Sitzplan_${date}.drawio`);
    const { getFirestore, doc, updateDoc } = await import("firebase/firestore/lite");
    const db = getFirestore();
    const organization = $(useLocalStorage("organization", ""));
    await updateDoc(doc(db, "organizations", organization), {
        structure: rawStructure
    });
};

const { results, bestScore } = defineProps<{
    results: [number, [string, boolean, boolean][]][],
    bestScore: number
}>();
</script>