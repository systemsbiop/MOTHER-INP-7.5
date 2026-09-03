"use strict";

/*
===========================================================
MOTHER INP™ 7.5.0
Intrinsic Network Pharmacology
Client Application Layer
===========================================================

This file provides the GitHub/PWA interface.

Scientific calculations requiring the complete validated
Python INP engine should ultimately be connected through
an API/backend.

The browser interface never invents scientific evidence.
===========================================================
*/


/* =========================================================
   GLOBAL INP RUN OBJECT
========================================================= */

let currentRun = {
    version: "7.5.0",

    run_id:
        "INP7.5-" +
        Date.now(),

    candidate_id:
        "NEW-CANDIDATE",

    candidate_name: "",

    layers: [],

    evidence: [],

    contradictions: [],

    experiments: [],

    failure_nodes: [],

    priority: null,

    uncertainty: null,

    translation: "GREY",

    created_at:
        new Date().toISOString()
};


/* =========================================================
   DOM
========================================================= */

const statusBox =
    document.getElementById("status");

const fileInput =
    document.getElementById("fileInput");


/* =========================================================
   STATUS DISPLAY
========================================================= */

function setStatus(message) {

    if (!statusBox) return;

    statusBox.innerHTML =
        message;
}


/* =========================================================
   INP 11-LAYER ENGINE
========================================================= */

function openEngine() {

    setStatus(`

        <h3>🧬 INP 11-Layer Engine</h3>

        <p>
        <b>MOTHER INP™ 7.5.0</b>
        </p>

        <p>
        Canonical computational architecture loaded.
        </p>

        <ol>

            <li>
            Disease Signature + Genomic–Transcriptomic Context
            </li>

            <li>
            MCheM / Physicochemistry
            </li>

            <li>
            Absorption / Exposure
            </li>

            <li>
            Metabolism / ADME
            </li>

            <li>
            Cellular Action
            </li>

            <li>
            Target / Pathway
            </li>

            <li>
            Tissue / Organ
            </li>

            <li>
            Network Pharmacology
            </li>

            <li>
            Time / Adaptation
            </li>

            <li>
            Safety / Selectivity
            </li>

            <li>
            TIME™ Translational Integration
            </li>

        </ol>

    `);
}


/* =========================================================
   EVIDENCE LEDGER
========================================================= */

function openEvidence() {

    setStatus(`

        <h3>📚 Evidence Ledger</h3>

        <p>
        MOTHER INP™ preserves evidence provenance
        instead of silently overwriting conflicting information.
        </p>

        <ul>

            <li>
            <b>E0</b> — Absent / insufficient evidence
            </li>

            <li>
            <b>E1</b> — Computational
            </li>

            <li>
            <b>E2</b> — Database / curated
            </li>

            <li>
            <b>E3</b> — Experimental
            </li>

            <li>
            <b>E4</b> — Clinical / human
            </li>

        </ul>

        <p>
        Q × R × I × X =
        evidence confidence framework.
        </p>

    `);
}


/* =========================================================
   UNCERTAINTY
========================================================= */

function openUncertainty() {

    setStatus(`

        <h3>📊 INP Uncertainty Analysis</h3>

        <p>
        INP 7.5 separates uncertainty into:
        </p>

        <ul>

            <li>Missingness</li>

            <li>Evidence weakness</li>

            <li>Contradiction</li>

            <li>Model uncertainty</li>

            <li>
            Extrapolation / context mismatch
            </li>

        </ul>

        <p>
        Uncertainty is retained as part of the
        scientific result.
        </p>

    `);
}


/* =========================================================
   EXPERIMENTAL PRIORITIZATION
========================================================= */

function openExperiments() {

    setStatus(`

        <h3>🧪 Experimental Prioritization</h3>

        <p>
        INP identifies evidence gaps that may require
        experimental investigation.
        </p>

        <p>
        Possible experiment classes include:
        </p>

        <ul>

            <li>Target engagement</li>

            <li>Dose-response</li>

            <li>Time-course analysis</li>

            <li>Metabolite profiling</li>

            <li>Tissue exposure</li>

            <li>Selectivity testing</li>

            <li>Network-node validation</li>

        </ul>

        <p>
        <b>
        Experimental results are never fabricated by INP.
        </b>
        </p>

    `);
}


/* =========================================================
   TIME™ TRANSLATION
========================================================= */

function openTIME() {

    const translation =
        currentRun.translation ||
        "GREY";

    setStatus(`

        <h3>🌐 TIME™ Translational Integration</h3>

        <p>
        Current computational translation state:
        </p>

        <h2>
        ${translation}
        </h2>

        <p>

        <b>GREEN</b>
        — strong/plausible computational support

        <br><br>

        <b>YELLOW</b>
        — promising but materially uncertain

        <br><br>

        <b>RED</b>
        — major barrier / HOLD

        <br><br>

        <b>GREY</b>
        — insufficient evidence

        </p>

        <p>
        These are research decision states,
        not clinical treatment recommendations.
        </p>

    `);
}


/* =========================================================
   NEW RUN
========================================================= */

function newRun() {

    currentRun = {

        version: "7.5.0",

        run_id:
            "INP7.5-" +
            Date.now(),

        candidate_id:
            "NEW-CANDIDATE",

        candidate_name: "",

        layers: [],

        evidence: [],

        contradictions: [],

        experiments: [],

        failure_nodes: [],

        priority: null,

        uncertainty: null,

        translation: "GREY",

        created_at:
            new Date().toISOString()

    };


    setStatus(`

        <h3>➕ New INP Run Created</h3>

        <p>
        Run ID:
        </p>

        <strong>
        ${currentRun.run_id}
        </strong>

        <p>
        The run is ready for scientific data.
        </p>

    `);
}


/* =========================================================
   IMPORT JSON
========================================================= */

function importRun() {

    if (!fileInput) return;

    fileInput.value = "";

    fileInput.click();
}


if (fileInput) {

    fileInput.addEventListener(
        "change",
        function(event) {

            const file =
                event.target.files[0];

            if (!file) return;


            const reader =
                new FileReader();


            reader.onload =
                function() {

                    try {

                        const imported =
                            JSON.parse(
                                reader.result
                            );


                        currentRun =
                            imported;


                        setStatus(`

                            <h3>
                            📥 INP Run Imported
                            </h3>

                            <p>
                            <b>Run ID:</b>
                            ${currentRun.run_id ||
                            "Unknown"}
                            </p>

                            <p>
                            <b>Version:</b>
                            ${currentRun.version ||
                            "Unknown"}
                            </p>

                            <p>
                            <b>Candidate:</b>
                            ${currentRun.candidate_name ||
                            currentRun.candidate_id ||
                            "Unknown"}
                            </p>

                            <p>
                            <b>Translation:</b>
                            ${currentRun.translation ||
                            "GREY"}
                            </p>

                        `);

                    }

                    catch(error) {

                        console.error(error);


                        setStatus(`

                            <h3>
                            ❌ Import Failed
                            </h3>

                            <p>
                            The selected file is not
                            valid INP JSON.
                            </p>

                        `);

                    }

                };


            reader.readAsText(file);

        }
    );

}


/* =========================================================
   EXPORT JSON
========================================================= */

function exportRun() {

    const data =
        JSON.stringify(
            currentRun,
            null,
            2
        );


    const blob =
        new Blob(
            [data],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        (
            currentRun.run_id ||
            "INP7.5-run"
        ) +
        ".json";


    document
        .body
        .appendChild(link);


    link.click();


    link.remove();


    URL.revokeObjectURL(url);


    setStatus(`

        <h3>
        📤 INP Run Exported
        </h3>

        <p>
        The computational run object has been
        exported as JSON.
        </p>

        <p>
        Run ID:
        <b>
        ${currentRun.run_id}
        </b>
        </p>

    `);
}


/* =========================================================
   PWA SERVICE WORKER
========================================================= */

if (
    "serviceWorker"
    in navigator
) {

    window.addEventListener(
        "load",
        function() {

            navigator
                .serviceWorker
                .register("sw.js")

                .then(
                    function() {

                        console.log(
                            "MOTHER INP™ service worker registered."
                        );

                    }
                )

                .catch(
                    function(error) {

                        console.error(
                            "Service worker registration failed:",
                            error
                        );

                    }
                );

        }
    );

}


/* =========================================================
   INITIAL STATUS
========================================================= */

setStatus(`

    <h3>
    🧬 MOTHER INP™ 7.5.0
    </h3>

    <p>
    Computational research platform ready.
    </p>

    <p>
    Run ID:
    <b>
    ${currentRun.run_id}
    </b>
    </p>

    <p>
    Select an INP function above to begin.
    </p>

`);
