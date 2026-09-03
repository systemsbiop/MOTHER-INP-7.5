/* ============================================================
   MOTHER INP 7.5.0
   Connected Scientific Run Interface
   Existing application — frontend result-display fix
   ============================================================ */

const DEFAULT_API =
  "https://mother-inp-7-5-backend.onrender.com";

let API_BASE = (
  window.INP_API_BASE ||
  localStorage.getItem("inp_api_base") ||
  DEFAULT_API
).replace(/\/$/, "");

let currentRun = {
  version: "7.5.0",
  run_id: "",
  candidate_id: "C001",
  name: "",
  layers: [],
  status: "Ready"
};


/* ============================================================
   BASIC UI
   ============================================================ */

function setStatus(text, ok = true) {
  const el = document.getElementById("runStatus");

  if (el) {
    el.textContent = text;
  }

  const dot = document.querySelector(".status-dot");

  if (dot) {
    dot.title =
      `${ok ? "Connected" : "Error"}: ${text}`;
  }
}


/* ============================================================
   CURRENT RUN DISPLAY
   ============================================================ */

function renderRun(run) {

  currentRun = run || currentRun;

  const id =
    document.getElementById("runId");

  const version =
    document.getElementById("version");

  const status =
    document.getElementById("runStatus");

  if (id) {
    id.textContent =
      currentRun.run_id || "Not started";
  }

  if (version) {
    version.textContent =
      currentRun.version || "7.5.0";
  }

  if (status) {
    const translation =
      currentRun.translation
        ? ` — ${currentRun.translation}`
        : "";

    status.textContent =
      `${currentRun.status || "Ready"}${translation}`;
  }
}


/* ============================================================
   API
   ============================================================ */

async function api(path, options = {}) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      30000
    );

  try {

    const response =
      await fetch(
        `${API_BASE}${path}`,
        {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type":
              "application/json",
            ...(options.headers || {})
          }
        }
      );

    const text =
      await response.text();

    let data;

    try {
      data =
        text
          ? JSON.parse(text)
          : {};
    }

    catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {

      const message =
        data?.detail ||
        data?.message ||
        response.statusText;

      throw new Error(
        `${response.status}: ${message}`
      );
    }

    return data;

  }

  catch (error) {

    if (error.name === "AbortError") {
      throw new Error(
        "Backend request timed out after 30 seconds."
      );
    }

    throw error;

  }

  finally {
    clearTimeout(timeout);
  }
}


/* ============================================================
   BACKEND HEALTH
   ============================================================ */

async function checkBackend() {

  try {

    const data =
      await api(
        "/health",
        {
          method: "GET",
          headers: {}
        }
      );

    setStatus(
      `Backend OK — ${data.service}`,
      true
    );

    return data;

  }

  catch (error) {

    setStatus(
      `Backend unavailable — ${error.message}`,
      false
    );

    return null;
  }
}


/* ============================================================
   NEW RUN
   ============================================================ */

async function newRun() {

  try {

    setStatus(
      "Creating INP run…"
    );

    const data =
      await api(
        `/v1/new-run?candidate_id=${encodeURIComponent(
          currentRun.candidate_id || "C001"
        )}&name=${encodeURIComponent(
          currentRun.name ||
          "MOTHER INP 7.5 Run"
        )}`,
        {
          method: "POST"
        }
      );

    currentRun.run_id =
      data.run_id;

    currentRun.version =
      data.version || "7.5.0";

    currentRun.status =
      "Run created";

    renderRun(currentRun);

    setStatus(
      `Run created: ${data.run_id}`
    );

    alert(
      `MOTHER INP 7.5 run created\n\nRun ID: ${data.run_id}`
    );

    return data;

  }

  catch (error) {

    setStatus(
      `Run creation failed — ${error.message}`,
      false
    );

    alert(
      `MOTHER INP backend error:\n\n${error.message}`
    );
  }
}


/* ============================================================
   FUNCTIONAL RUN
   ============================================================ */

async function executeFunctionalTest() {

  const button =
    document.getElementById("executeBtn");

  if (button) {
    button.disabled = true;
    button.textContent =
      "⏳ Running MOTHER INP…";
  }

  const payload = {

    candidate_id:
      currentRun.candidate_id || "C001",

    name:
      currentRun.name ||
      "MOTHER INP 7.5 Functional Test",

    layers: [

      {
        layer: "L1",
        status: "PARTIAL",
        score: 0.60,
        failure_nodes: [
          "TEST_DATA_INCOMPLETE"
        ],
        notes:
          "Controlled software validation run."
      },

      {
        layer: "L2",
        status: "PARTIAL",
        score: 0.70,
        failure_nodes: [],
        notes:
          "Chemical characterization data not supplied."
      },

      {
        layer: "L10",
        status: "UNRESOLVED",
        score: null,
        failure_nodes: [
          "SAFETY_DATA_MISSING"
        ],
        notes:
          "Safety evidence intentionally absent."
      }

    ],

    run_id:
      currentRun.run_id || "",

    parent_run_id:
      null
  };


  try {

    setStatus(
      "Executing INP 7.5 engine…"
    );

    console.log(
      "MOTHER INP payload:",
      payload
    );

    const data =
      await api(
        "/v1/run",
        {
          method: "POST",
          body:
            JSON.stringify(payload)
        }
      );

    if (!data || !data.run) {
      throw new Error(
        "Backend returned no run result."
      );
    }

    currentRun =
      data.run;

    currentRun.status =
      "Completed";

    renderRun(
      currentRun
    );

    setStatus(
      `Engine completed — ${
        currentRun.translation || "GREY"
      }`
    );

    /*
       IMPORTANT:
       Render the complete result into the
       existing application immediately.
    */

    showResult(
      currentRun
    );

    return currentRun;

  }

  catch (error) {

    console.error(
      "MOTHER INP execution error:",
      error
    );

    setStatus(
      `Engine execution failed — ${error.message}`,
      false
    );

    alert(
      `MOTHER INP engine error:\n\n${error.message}`
    );

  }

  finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "▶ Execute Functional Run";
    }
  }
}


/* ============================================================
   RESULT PANEL
   ============================================================ */

function ensureResultPanel() {

  let panel =
    document.getElementById(
      "inpResultPanel"
    );

  if (panel) {
    return panel;
  }


  panel =
    document.createElement(
      "section"
    );

  panel.id =
    "inpResultPanel";

  panel.className =
    "panel";


  panel.style.cssText = `
    display:block !important;
    width:100%;
    box-sizing:border-box;
    margin-top:20px;
    margin-bottom:20px;
    padding:22px;
    background:#ffffff;
    border:1px solid #d9e2ec;
    border-radius:16px;
    box-shadow:0 6px 20px rgba(15,23,42,0.08);
    visibility:visible !important;
    opacity:1 !important;
  `;


  /*
     Put results immediately after
     Current Run rather than at the
     invisible/unclear bottom of the page.
  */

  const currentRunPanel =
    document
      .getElementById("runDisplay")
      ?.closest(".panel");


  if (
    currentRunPanel &&
    currentRunPanel.parentNode
  ) {

    currentRunPanel.parentNode.insertBefore(
      panel,
      currentRunPanel.nextSibling
    );

  }

  else {

    const main =
      document.querySelector("main");

    if (main) {
      main.appendChild(panel);
    }

    else {
      document.body.appendChild(panel);
    }
  }


  return panel;
}


/* ============================================================
   RESULT RENDERING
   ============================================================ */

function showResult(run) {

  if (!run) {
    return;
  }


  const panel =
    ensureResultPanel();


  const failureNodes =
    Array.isArray(run.failure_nodes)
      ? run.failure_nodes
      : [];


  const experiments =
    Array.isArray(run.experiments)
      ? run.experiments
      : [];


  const layers =
    Array.isArray(run.layers)
      ? run.layers
      : [];


  const translation =
    run.translation ||
    "GREY";


  const priority =
    run.overall_priority !== undefined
      ? run.overall_priority
      : "—";


  const uncertainty =
    run.overall_uncertainty !== undefined
      ? run.overall_uncertainty
      : "—";


  const audit =
    run.audit_sha256 ||
    "Not available";


  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:18px;
    ">

      <div>

        <div style="
          font-size:11px;
          font-weight:700;
          letter-spacing:1px;
          text-transform:uppercase;
          opacity:.65;
          margin-bottom:5px;
        ">
          MOTHER INP 7.5.0
        </div>

        <h2 style="
          margin:0;
          font-size:22px;
        ">
          🧬 INP Run Results
        </h2>

      </div>


      <div style="
        padding:8px 13px;
        border-radius:999px;
        background:#eef6f0;
        border:1px solid #cfe3d4;
        font-weight:700;
        font-size:13px;
      ">
        ${escapeHtml(
          String(run.status || "Completed")
        )}
      </div>

    </div>


    <!-- SUMMARY -->

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(150px,1fr));
      gap:12px;
      margin-bottom:20px;
    ">

      ${resultCard(
        "Disease / Candidate",
        run.name || run.candidate_id || "—"
      )}

      ${resultCard(
        "Run ID",
        run.run_id || "—"
      )}

      ${resultCard(
        "Priority",
        String(priority)
      )}

      ${resultCard(
        "Uncertainty",
        String(uncertainty)
      )}

      ${resultCard(
        "Translation",
        translation
      )}

    </div>


    <!-- FAILURE NODES -->

    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:4px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        ⚠ Failure Nodes
      </h3>

      ${
        failureNodes.length
          ? failureNodes.map(
              node => `
                <div style="
                  padding:10px 12px;
                  margin:7px 0;
                  border-radius:9px;
                  background:#fff7ed;
                  border:1px solid #fed7aa;
                  font-size:13px;
                  font-weight:650;
                ">
                  ⚠ ${escapeHtml(String(node))}
                </div>
              `
            ).join("")
          : `
            <div style="
              padding:10px 12px;
              border-radius:9px;
              background:#f0fdf4;
              border:1px solid #bbf7d0;
              font-size:13px;
            ">
              No failure nodes recorded.
            </div>
          `
      }

    </div>


    <!-- LAYER RESULTS -->

    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:20px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        🔬 Layer Results
      </h3>

      ${
        layers.length
          ? layers.map(
              layer => `
                <div style="
                  display:grid;
                  grid-template-columns:
                    70px 120px 90px 1fr;
                  gap:10px;
                  align-items:center;
                  padding:10px;
                  margin:6px 0;
                  border:1px solid #e2e8f0;
                  border-radius:9px;
                  background:#f8fafc;
                  font-size:12px;
                ">

                  <strong>
                    ${escapeHtml(
                      String(layer.layer || "—")
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      String(layer.status || "—")
                    )}
                  </span>

                  <span>
                    Score:
                    ${
                      layer.score === null ||
                      layer.score === undefined
                        ? "—"
                        : escapeHtml(
                            String(layer.score)
                          )
                    }
                  </span>

                  <span>
                    ${
                      Array.isArray(
                        layer.failure_nodes
                      ) &&
                      layer.failure_nodes.length
                        ? escapeHtml(
                            layer.failure_nodes.join(", ")
                          )
                        : escapeHtml(
                            layer.notes || ""
                          )
                    }
                  </span>

                </div>
              `
            ).join("")
          : `
            <div style="
              padding:12px;
              border-radius:9px;
              background:#f8fafc;
              font-size:13px;
            ">
              No layer records returned.
            </div>
          `
      }

    </div>


    <!-- EXPERIMENTS -->

    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:20px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        🧪 Experimental Priorities
      </h3>

      ${
        experiments.length
          ? experiments.map(
              (experiment, index) => `
                <div style="
                  padding:13px;
                  margin:8px 0;
                  border:1px solid #e2e8f0;
                  border-radius:10px;
                  background:#ffffff;
                ">

                  <div style="
                    font-weight:700;
                    margin-bottom:5px;
                  ">
                    ${index + 1}.
                    ${escapeHtml(
                      String(
                        experiment.layer ||
                        "Layer"
                      )
                    )}
                    —
                    ${escapeHtml(
                      String(
                        experiment.experiment_class ||
                        "Experiment"
                      )
                    )}
                  </div>

                  <div style="
                    font-size:13px;
                    line-height:1.5;
                  ">
                    ${
                      escapeHtml(
                        String(
                          experiment.rationale ||
                          ""
                        )
                      )
                    }
                  </div>

                  ${
                    Array.isArray(
                      experiment.missing_evidence
                    )
                    ? `
                      <div style="
                        margin-top:7px;
                        font-size:12px;
                        opacity:.75;
                      ">
                        Missing evidence:
                        ${escapeHtml(
                          experiment.missing_evidence.join(
                            "; "
                          )
                        )}
                      </div>
                    `
                    : ""
                  }

                </div>
              `
            ).join("")
          : `
            <div style="
              padding:12px;
              border-radius:9px;
              background:#f8fafc;
              font-size:13px;
            ">
              No experiment recommendations returned.
            </div>
          `
      }

    </div>


    <!-- AUDIT -->

    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:20px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        🔐 Audit SHA-256
      </h3>

      <div style="
        padding:12px;
        border-radius:9px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Consolas,
          monospace;
        font-size:11px;
        word-break:break-all;
      ">
        ${escapeHtml(audit)}
      </div>

    </div>


    <!-- GOVERNANCE -->

    <div style="
      margin-top:20px;
      padding:14px;
      border-radius:10px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      font-size:12px;
      line-height:1.6;
    ">

      <strong>
        Scientific Governance
      </strong>

      <br>

      E0 = Evidence absent ·
      E1 = Computational ·
      E2 = Curated/database ·
      E3 = Experimental ·
      E4 = Clinical/human

      <br><br>

      This output is a computational/evidence-governance
      record for research prioritization. It does not
      constitute experimental validation or clinical proof.

    </div>


    <!-- EXPORT -->

    <div style="
      margin-top:18px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    ">

      <button
        id="resultExportBtn"
        style="
          width:auto;
          padding:10px 16px;
          border-radius:9px;
          cursor:pointer;
          font-weight:700;
        "
      >
        📤 Save / Export This Run
      </button>

      <button
        id="resultRawBtn"
        style="
          width:auto;
          padding:10px 16px;
          border-radius:9px;
          cursor:pointer;
        "
      >
        🧾 View Raw JSON
      </button>

    </div>

  `;


  const exportButton =
    document.getElementById(
      "resultExportBtn"
    );

  if (exportButton) {

    exportButton.addEventListener(
      "click",
      exportRun
    );
  }


  const rawButton =
    document.getElementById(
      "resultRawBtn"
    );

  if (rawButton) {

    rawButton.addEventListener(
      "click",
      () => {
        showRawResult(run);
      }
    );
  }


  /*
     Force browser to reveal the result.
  */

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* ============================================================
   RESULT CARD
   ============================================================ */

function resultCard(label, value) {

  return `
    <div style="
      padding:13px;
      border-radius:10px;
      border:1px solid #e2e8f0;
      background:#f8fafc;
      min-width:0;
    ">

      <div style="
        font-size:10px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.6px;
        opacity:.6;
        margin-bottom:5px;
      ">
        ${escapeHtml(label)}
      </div>

      <div style="
        font-size:14px;
        font-weight:700;
        word-break:break-word;
      ">
        ${escapeHtml(value)}
      </div>

    </div>
  `;
}


/* ============================================================
   RAW JSON
   ============================================================ */

function showRawResult(run) {

  const existing =
    document.getElementById(
      "inpRawResult"
    );

  if (existing) {
    existing.remove();
  }


  const box =
    document.createElement(
      "pre"
    );

  box.id =
    "inpRawResult";

  box.style.cssText = `
    margin-top:15px;
    padding:15px;
    background:#0f172a;
    color:#e2e8f0;
    border-radius:10px;
    overflow:auto;
    white-space:pre-wrap;
    word-break:break-word;
    font-size:11px;
  `;

  box.textContent =
    JSON.stringify(
      run,
      null,
      2
    );


  const panel =
    document.getElementById(
      "inpResultPanel"
    );

  if (panel) {
    panel.appendChild(box);
  }
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ============================================================
   ENGINE / RESEARCH MODULES
   ============================================================ */

function openEngine(layer) {

  alert(
    `INP Layer ${layer}\n\n` +
    `The connected MOTHER INP 7.5 engine is ready ` +
    `to receive structured layer data.\n\n` +
    `Current API:\n${API_BASE}`
  );
}


function openEvidence() {

  alert(
    "Evidence Ledger\n\n" +
    "Evidence validation is available through " +
    "the MOTHER INP 7.5 backend."
  );
}


function openUncertainty() {

  alert(
    "Uncertainty Analysis\n\n" +
    "Bounded uncertainty analysis is available " +
    "through the MOTHER INP 7.5 backend."
  );
}


function openExperiments() {

  alert(
    "Experimental Prioritization\n\n" +
    "MOTHER INP generates experimental " +
    "recommendations from missing or uncertain evidence."
  );
}


function openTIME() {

  alert(
    `TIME™ Translation\n\n` +
    `Current translation: ${
      currentRun.translation || "GREY"
    }`
  );
}


/* ============================================================
   IMPORT
   ============================================================ */

function importRun(event) {

  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const parsed =
        JSON.parse(
          reader.result
        );

      /*
         Support both:
         1. direct run JSON
         2. { ok:true, run:{...} }
      */

      const run =
        parsed?.run ||
        parsed;


      currentRun =
        run;


      renderRun(
        currentRun
      );


      showResult(
        currentRun
      );


      setStatus(
        "Run imported"
      );

    }

    catch (error) {

      alert(
        `Invalid INP JSON:\n\n${error.message}`
      );
    }
  };


  reader.readAsText(file);

  event.target.value = "";
}


/* ============================================================
   EXPORT
   ============================================================ */

function exportRun() {

  if (
    !currentRun ||
    !currentRun.run_id
  ) {

    alert(
      "No INP run is available to export yet."
    );

    return;
  }


  const blob =
    new Blob(
      [
        JSON.stringify(
          currentRun,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const a =
    document.createElement(
      "a"
    );

  a.href =
    url;

  a.download =
    `${currentRun.run_id}.json`;

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}


/* ============================================================
   LIVE ENGINE CONTROLS
   ============================================================ */

function addEngineControls() {

  if (
    document.getElementById(
      "engineControls"
    )
  ) {
    return;
  }


  const section =
    document.createElement(
      "section"
    );

  section.id =
    "engineControls";

  section.className =
    "panel";


  section.innerHTML = `

    <h2>
      ⚙️ Live INP 7.5 Engine
    </h2>

    <p>
      Connected to the real MOTHER INP 7.5 backend.
    </p>

    <div style="
      display:grid;
      gap:10px;
      max-width:700px;
    ">

      <label>
        Candidate ID

        <input
          id="candidateInput"
          value="C001"
          style="
            width:100%;
            padding:10px;
            box-sizing:border-box;
          "
        >
      </label>


      <label>
        Candidate name

        <input
          id="candidateNameInput"
          value="MOTHER INP 7.5 Functional Test"
          style="
            width:100%;
            padding:10px;
            box-sizing:border-box;
          "
        >
      </label>


      <label>
        Backend API URL

        <input
          id="apiInput"
          value="${escapeHtml(API_BASE)}"
          style="
            width:100%;
            padding:10px;
            box-sizing:border-box;
          "
        >
      </label>


      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      ">

        <button
          id="connectBtn"
        >
          🔌 Test Backend
        </button>


        <button
          id="executeBtn"
          class="primary"
        >
          ▶ Execute Functional Run
        </button>

      </div>

    </div>

  `;


  const main =
    document.querySelector(
      "main"
    );


  if (main) {

    /*
       Insert after hero section,
       preserving the existing app.
    */

    const hero =
      main.querySelector(
        ".hero"
      );

    if (
      hero &&
      hero.nextSibling
    ) {

      main.insertBefore(
        section,
        hero.nextSibling
      );

    }

    else {

      main.insertBefore(
        section,
        main.firstChild
      );
    }
  }


  const connectButton =
    document.getElementById(
      "connectBtn"
    );


  if (connectButton) {

    connectButton.addEventListener(
      "click",
      async () => {

        const input =
          document.getElementById(
            "apiInput"
          );


        const value =
          input
            ? input.value
                .trim()
                .replace(/\/$/, "")
            : DEFAULT_API;


        if (!value) {
          return;
        }


        API_BASE =
          value;


        localStorage.setItem(
          "inp_api_base",
          value
        );


        window.INP_API_BASE =
          value;


        const data =
          await checkBackend();


        if (data) {

          alert(
            `Connected successfully to ${
              data.service
            }\n\nEngine: ${
              data.engine
            }`
          );
        }
      }
    );
  }


  const executeButton =
    document.getElementById(
      "executeBtn"
    );


  if (executeButton) {

    executeButton.addEventListener(
      "click",
      async () => {

        const candidate =
          document.getElementById(
            "candidateInput"
          );

        const name =
          document.getElementById(
            "candidateNameInput"
          );


        currentRun.candidate_id =
          candidate?.value.trim() ||
          "C001";


        currentRun.name =
          name?.value.trim() ||
          "MOTHER INP 7.5 Functional Test";


        await executeFunctionalTest();
      }
    );
  }
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    renderRun(
      currentRun
    );


    addEngineControls();


    await checkBackend();


    /*
       We deliberately do NOT register the
       service worker here.

       This prevents an old cached frontend
       from hiding the newly rendered results.
    */

    console.log(
      "MOTHER INP 7.5 frontend initialized."
    );

  }
);
