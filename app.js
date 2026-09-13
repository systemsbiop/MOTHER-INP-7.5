from pathlib import Path

app_js = r'''/* ============================================================
   MOTHER INP 7.5.0 — FRESH FRONTEND
   ------------------------------------------------------------
   Works with the existing index.html.

   Goals:
   1. Create a single Live INP 7.5 control panel.
   2. Accept either a disease OR a molecule.
   3. Test the FastAPI /health endpoint.
   4. Execute /v1/run.
   5. Make all 11 layer cards interactive.
   6. Show layer-specific backend data when available.
   7. Never invent scientific results when the backend has
      not supplied them.
   8. Preserve the existing inline onclick functions in
      index.html.
   ============================================================ */

"use strict";

/* ============================================================
   CONFIGURATION
   ============================================================ */

const DEFAULT_API =
  "https://mother-inp-7-5-backend.onrender.com";

let API_BASE = (
  window.INP_API_BASE ||
  localStorage.getItem("inp_api_base") ||
  DEFAULT_API
).replace(/\/$/, "");

/* ============================================================
   APPLICATION STATE
   ============================================================ */

let currentRun = {
  version: "7.5.0",
  run_id: "",
  candidate_id: "C001",
  name: "",
  input_type: "",
  disease: "",
  molecule: "",
  query: "",
  status: "Ready",
  translation: "GREY",
  layers: [],
  raw: null
};

let lastBackendHealth = null;

/* ============================================================
   DOM HELPERS
   ============================================================ */

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(text, ok = true) {
  const systemStatus = byId("systemStatus");
  const runStatus = byId("runStatus");
  const dot = document.querySelector(".status-dot");

  if (systemStatus) {
    systemStatus.textContent =
      ok ? "System Ready" : "Backend Error";
  }

  if (runStatus) {
    runStatus.textContent = text;
  }

  if (dot) {
    dot.title = text;
  }

  console.log(
    `MOTHER INP STATUS: ${text}`
  );
}

function resultCard(label, value) {
  return `
    <div style="
      padding:13px;
      border-radius:10px;
      border:1px solid #e2e8f0;
      background:#f8fafc;
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
   API CLIENT
   ============================================================ */

async function apiRequest(path, options = {}) {

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
          signal:
            controller.signal,
          headers: {
            Accept:
              "application/json",
            ...(options.body
              ? {
                  "Content-Type":
                    "application/json"
                }
              : {}),
            ...(options.headers || {})
          }
        }
      );

    const text =
      await response.text();

    let data = {};

    if (text) {

      try {
        data =
          JSON.parse(text);
      }

      catch {
        data = {
          raw: text
        };
      }
    }

    if (!response.ok) {

      const message =
        data?.detail ||
        data?.message ||
        data?.error ||
        response.statusText ||
        "Backend request failed.";

      throw new Error(
        `${response.status}: ${message}`
      );
    }

    return data;

  }

  catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Backend request timed out after 30 seconds."
      );
    }

    if (
      error instanceof TypeError
    ) {
      throw new Error(
        "Unable to reach the backend. Check the API URL and CORS configuration."
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

  setStatus(
    "Testing backend…"
  );

  try {

    const data =
      await apiRequest(
        "/health"
      );

    lastBackendHealth =
      data;

    setStatus(
      `Backend OK — ${
        data?.service ||
        "MOTHER INP 7.5"
      }`,
      true
    );

    console.log(
      "MOTHER INP backend health:",
      data
    );

    return data;

  }

  catch (error) {

    lastBackendHealth =
      null;

    setStatus(
      `Backend unavailable — ${error.message}`,
      false
    );

    console.error(
      "MOTHER INP backend health error:",
      error
    );

    return null;
  }
}

/* ============================================================
   INPUT TYPE DETECTION
   ------------------------------------------------------------
   This is deliberately conservative. It does NOT claim that
   a term is a disease or molecule from a scientific database.
   The user may explicitly select the input type.
   ============================================================ */

function getInputState() {

  const input =
    byId("inpQueryInput");

  const type =
    byId("inpInputType");

  const query =
    input?.value.trim() || "";

  const selectedType =
    type?.value || "auto";

  return {
    query,
    selectedType
  };
}

function resolveInputType(query, selectedType) {

  if (selectedType === "disease") {
    return "disease";
  }

  if (selectedType === "molecule") {
    return "molecule";
  }

  /*
     Auto mode is intentionally labelled "research input".
     The backend remains authoritative for biological
     interpretation.
  */

  return "research";
}

/* ============================================================
   CREATE / UPDATE CURRENT RUN
   ============================================================ */

function buildRunPayload() {

  const inputState =
    getInputState();

  if (!inputState.query) {

    throw new Error(
      "Please enter a disease or molecule."
    );
  }

  const inputType =
    resolveInputType(
      inputState.query,
      inputState.selectedType
    );

  const candidateId =
    byId("candidateInput")
      ?.value.trim() ||
    "C001";

  const runName =
    byId("candidateNameInput")
      ?.value.trim() ||
    inputState.query;

  const payload = {

    candidate_id:
      candidateId,

    name:
      runName,

    version:
      "7.5.0",

    query:
      inputState.query,

    input:
      inputState.query,

    input_type:
      inputType,

    disease:
      inputType === "disease"
        ? inputState.query
        : "",

    molecule:
      inputType === "molecule"
        ? inputState.query
        : "",

    /*
       Keep this compatible with the existing backend
       functional-run contract while exposing the new
       disease/molecule semantics.
    */

    run_id:
      currentRun.run_id || "",

    layers:
      []
  };

  return payload;
}

/* ============================================================
   EXECUTE REAL BACKEND RUN
   ============================================================ */

async function executeFunctionalTest() {

  const executeButton =
    byId("executeBtn");

  if (executeButton) {
    executeButton.disabled =
      true;
    executeButton.textContent =
      "⏳ Running INP…";
  }

  try {

    const payload =
      buildRunPayload();

    currentRun.candidate_id =
      payload.candidate_id;

    currentRun.name =
      payload.name;

    currentRun.query =
      payload.query;

    currentRun.input_type =
      payload.input_type;

    currentRun.disease =
      payload.disease;

    currentRun.molecule =
      payload.molecule;

    setStatus(
      `Executing INP 7.5 — ${payload.query}…`
    );

    console.log(
      "MOTHER INP 7.5 request:",
      payload
    );

    const response =
      await apiRequest(
        "/v1/run",
        {
          method: "POST",
          body:
            JSON.stringify(payload)
        }
      );

    currentRun.raw =
      response;

    /*
       Support several common response envelopes.
    */

    const returnedRun =
      response?.run ||
      response?.result ||
      response?.data ||
      response;

    currentRun = {
      ...currentRun,
      ...(returnedRun || {}),
      raw:
        response,
      query:
        returnedRun?.query ||
        currentRun.query,
      disease:
        returnedRun?.disease ||
        currentRun.disease,
      molecule:
        returnedRun?.molecule ||
        currentRun.molecule,
      input_type:
        returnedRun?.input_type ||
        currentRun.input_type,
      status:
        returnedRun?.status ||
        "Completed",
      version:
        returnedRun?.version ||
        "7.5.0"
    };

    renderRun(
      currentRun
    );

    setStatus(
      `INP run completed — ${
        currentRun.translation ||
        "GREY"
      }`,
      true
    );

    showResult(
      currentRun
    );

    return currentRun;

  }

  catch (error) {

    console.error(
      "MOTHER INP 7.5 execution error:",
      error
    );

    setStatus(
      `INP execution failed — ${error.message}`,
      false
    );

    showErrorPanel(
      "INP execution failed",
      error.message
    );

    return null;

  }

  finally {

    if (executeButton) {

      executeButton.disabled =
        false;

      executeButton.textContent =
        "▶ Execute Functional Run";
    }
  }
}

/* ============================================================
   NEW BACKEND RUN
   ============================================================ */

async function newRun() {

  const query =
    byId("inpQueryInput")
      ?.value.trim() ||
    currentRun.query ||
    "";

  const candidateId =
    byId("candidateInput")
      ?.value.trim() ||
    "C001";

  const name =
    byId("candidateNameInput")
      ?.value.trim() ||
    query ||
    "MOTHER INP 7.5 Run";

  try {

    setStatus(
      "Creating new INP run…"
    );

    const params =
      new URLSearchParams({
        candidate_id:
          candidateId,
        name:
          name
      });

    const response =
      await apiRequest(
        `/v1/new-run?${params.toString()}`,
        {
          method: "POST"
        }
      );

    const returned =
      response?.run ||
      response;

    currentRun = {
      ...currentRun,
      ...(returned || {}),
      candidate_id:
        candidateId,
      name:
        name,
      query:
        query,
      status:
        returned?.status ||
        "Created"
    };

    renderRun(
      currentRun
    );

    setStatus(
      `Run created — ${
        currentRun.run_id ||
        "ready"
      }`
    );

    return currentRun;

  }

  catch (error) {

    setStatus(
      `New run failed — ${error.message}`,
      false
    );

    showErrorPanel(
      "Could not create INP run",
      error.message
    );

    return null;
  }
}

/* ============================================================
   RUN DISPLAY
   ============================================================ */

function renderRun(run) {

  const runId =
    byId("runId");

  const version =
    byId("version");

  const status =
    byId("runStatus");

  if (runId) {
    runId.textContent =
      run?.run_id ||
      "Not started";
  }

  if (version) {
    version.textContent =
      run?.version ||
      "7.5.0";
  }

  if (status) {

    status.textContent =
      run?.status ||
      "Ready";
  }
}

/* ============================================================
   ENGINE CONTROL PANEL
   ============================================================ */

function addEngineControls() {

  /*
     Remove any old/partial panel.
     This makes the frontend self-healing after previous
     versions of app.js created incompatible controls.
  */

  const oldPanel =
    byId("engineControls");

  if (oldPanel) {
    oldPanel.remove();
  }

  const section =
    document.createElement("section");

  section.id =
    "engineControls";

  section.className =
    "panel";

  section.innerHTML = `

    <div class="section-kicker">
      LIVE COMPUTATIONAL ENGINE
    </div>

    <h2>
      ⚙️ Live INP 7.5 Engine
    </h2>

    <p>
      Enter a disease or molecule. The connected MOTHER
      INP 7.5 backend remains the authoritative source for
      molecular, pathway, network, evidence and translation
      results.
    </p>

    <div style="
      display:grid;
      gap:11px;
      max-width:780px;
    ">

      <label>
        Input Type

        <select
          id="inpInputType"
          style="
            width:100%;
            padding:11px;
            box-sizing:border-box;
          "
        >
          <option value="auto">
            Auto / Research Input
          </option>

          <option value="disease">
            Disease
          </option>

          <option value="molecule">
            Molecule
          </option>
        </select>
      </label>

      <label>
        Disease / Molecule

        <input
          id="inpQueryInput"
          type="text"
          placeholder="e.g. Diabetes mellitus or Curcumin"
          autocomplete="off"
          style="
            width:100%;
            padding:11px;
            box-sizing:border-box;
          "
        >
      </label>

      <label>
        Candidate ID

        <input
          id="candidateInput"
          type="text"
          value="C001"
          style="
            width:100%;
            padding:11px;
            box-sizing:border-box;
          "
        >
      </label>

      <label>
        Candidate / Run Name

        <input
          id="candidateNameInput"
          type="text"
          placeholder="Optional — defaults to input"
          style="
            width:100%;
            padding:11px;
            box-sizing:border-box;
          "
        >
      </label>

      <label>
        Backend API URL

        <input
          id="apiInput"
          type="url"
          value="${escapeHtml(API_BASE)}"
          style="
            width:100%;
            padding:11px;
            box-sizing:border-box;
          "
        >
      </label>

      <div style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:4px;
      ">

        <button
          id="connectBtn"
          type="button"
        >
          🔌 Test Backend
        </button>

        <button
          id="newRunBtn"
          type="button"
        >
          ➕ New INP Run
        </button>

        <button
          id="executeBtn"
          type="button"
          class="primary"
        >
          ▶ Execute INP Analysis
        </button>

      </div>

      <div
        id="engineMessage"
        style="
          display:none;
          padding:12px;
          border-radius:9px;
          border:1px solid #dbe4ec;
          background:#f8fafc;
          font-size:12px;
          line-height:1.5;
        "
      ></div>

    </div>
  `;

  const main =
    document.querySelector("main");

  if (main) {

    const hero =
      main.querySelector(".hero");

    if (hero) {
      hero.insertAdjacentElement(
        "afterend",
        section
      );
    } else {
      main.prepend(
        section
      );
    }

  } else {

    document.body.prepend(
      section
    );
  }

  wireEngineControls();
}

/* ============================================================
   WIRE ENGINE CONTROLS
   ============================================================ */

function wireEngineControls() {

  const connectButton =
    byId("connectBtn");

  const newRunButton =
    byId("newRunBtn");

  const executeButton =
    byId("executeBtn");

  const apiInput =
    byId("apiInput");

  const queryInput =
    byId("inpQueryInput");

  if (apiInput) {

    apiInput.value =
      API_BASE;

    apiInput.addEventListener(
      "change",
      () => {

        const value =
          apiInput.value
            .trim()
            .replace(/\/$/, "");

        if (!value) return;

        API_BASE =
          value;

        localStorage.setItem(
          "inp_api_base",
          value
        );

        window.INP_API_BASE =
          value;
      }
    );
  }

  if (connectButton) {

    connectButton.onclick =
      async () => {

        const value =
          apiInput?.value
            .trim()
            .replace(/\/$/, "") ||
          DEFAULT_API;

        API_BASE =
          value;

        localStorage.setItem(
          "inp_api_base",
          value
        );

        window.INP_API_BASE =
          value;

        connectButton.disabled =
          true;

        connectButton.textContent =
          "⏳ Testing…";

        try {

          const data =
            await checkBackend();

          if (data) {

            alert(
              `MOTHER INP 7.5 Backend Connected\n\n` +
              `Service: ${
                data.service ||
                "MOTHER INP 7.5"
              }\n` +
              `Engine: ${
                data.engine ||
                "inp7_5"
              }`
            );
          }

        }

        finally {

          connectButton.disabled =
            false;

          connectButton.textContent =
            "🔌 Test Backend";
        }
      };
  }

  if (newRunButton) {

    newRunButton.onclick =
      () => newRun();
  }

  if (executeButton) {

    executeButton.onclick =
      () =>
        executeFunctionalTest();
  }

  if (queryInput) {

    queryInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          executeButton?.click();
        }
      }
    );
  }

  console.log(
    "MOTHER INP 7.5 controls connected:",
    {
      apiInput:
        !!byId("apiInput"),
      candidateInput:
        !!byId("candidateInput"),
      candidateNameInput:
        !!byId("candidateNameInput"),
      diseaseMoleculeInput:
        !!byId("inpQueryInput"),
      connectButton:
        !!byId("connectBtn"),
      executeButton:
        !!byId("executeBtn")
    }
  );
}

/* ============================================================
   LAYER BUTTONS
   ============================================================ */

const LAYER_NAMES = {

  1:
    "Disease + Genomic Context",

  2:
    "MCheM / Physicochemistry",

  3:
    "Absorption / Exposure",

  4:
    "Metabolism / ADME",

  5:
    "Cellular Action",

  6:
    "Target / Pathway",

  7:
    "Tissue / Organ",

  8:
    "Network Pharmacology",

  9:
    "Time / Adaptation",

  10:
    "Safety / Selectivity",

  11:
    "TIME™ Translation"
};

const LAYER_DESCRIPTIONS = {

  1:
    "Disease phenotype, biological context and genomic associations.",

  2:
    "Molecular identity, chemical descriptors and physicochemical properties.",

  3:
    "Absorption, bioavailability, distribution and target-site exposure.",

  4:
    "Metabolism, ADME, parent compound and metabolite disposition.",

  5:
    "Cellular response and mechanism of action.",

  6:
    "Molecular targets, interactions and biological pathways.",

  7:
    "Tissue and organ relevance of the molecular or disease signal.",

  8:
    "Network propagation, convergence, failure nodes and restoration nodes.",

  9:
    "Temporal behaviour, adaptation and dynamic response.",

  10:
    "Safety, selectivity, toxicity, uncertainty and exposure gates.",

  11:
    "TIME™ translational integration, phenotype and decision guidance."
};

function openEngine(layer) {

  const query =
    byId("inpQueryInput")
      ?.value.trim() ||
    currentRun.query ||
    "";

  if (!query) {

    alert(
      "Please enter a disease or molecule first.\n\n" +
      "Examples:\n" +
      "• Diabetes mellitus\n" +
      "• Psoriasis\n" +
      "• Curcumin\n" +
      "• Berberine"
    );

    byId("inpQueryInput")
      ?.focus();

    return;
  }

  showLayerResult(
    layer,
    query
  );
}

/* ============================================================
   LAYER RESULT PANEL
   ============================================================ */

function ensureLayerResultPanel() {

  let panel =
    byId("inpLayerResultPanel");

  if (panel) {
    return panel;
  }

  panel =
    document.createElement("section");

  panel.id =
    "inpLayerResultPanel";

  panel.className =
    "panel";

  panel.style.cssText = `
    display:block !important;
    width:100%;
    box-sizing:border-box;
    margin:20px 0;
    padding:24px;
    background:#ffffff;
    border:1px solid #d9e2ec;
    border-radius:16px;
    box-shadow:0 6px 20px rgba(15,23,42,.07);
  `;

  const main =
    document.querySelector("main");

  const architecture =
    document.querySelector(
      ".layer-grid"
    )?.closest(".panel");

  if (architecture) {

    architecture.insertAdjacentElement(
      "afterend",
      panel
    );

  } else if (main) {

    main.appendChild(
      panel
    );

  } else {

    document.body.appendChild(
      panel
    );
  }

  return panel;
}

/* ============================================================
   FIND BACKEND LAYER RECORD
   ============================================================ */

function findLayerRecord(
  run,
  layerNumber
) {

  const layers =
    Array.isArray(run?.layers)
      ? run.layers
      : [];

  return (
    layers.find(
      item =>
        String(
          item?.layer
        ) ===
        `L${layerNumber}`
    ) ||
    layers.find(
      item =>
        Number(
          item?.layer
        ) ===
        layerNumber
    ) ||
    null
  );
}

/* ============================================================
   RENDER INDIVIDUAL LAYER
   ============================================================ */

function showLayerResult(
  layer,
  query
) {

  const panel =
    ensureLayerResultPanel();

  const layerName =
    LAYER_NAMES[layer] ||
    `INP Layer ${layer}`;

  const description =
    LAYER_DESCRIPTIONS[layer] ||
    "INP layer analysis.";

  const record =
    findLayerRecord(
      currentRun,
      layer
    );

  const hasRun =
    !!currentRun?.raw;

  const hasLayerData =
    !!record;

  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:15px;
      flex-wrap:wrap;
      margin-bottom:20px;
    ">

      <div>

        <div style="
          font-size:11px;
          font-weight:700;
          letter-spacing:1px;
          opacity:.6;
          text-transform:uppercase;
          margin-bottom:6px;
        ">
          MOTHER INP 7.5.0 —
          LAYER ${String(layer).padStart(2,"0")}
        </div>

        <h2 style="
          margin:0 0 7px 0;
          font-size:23px;
        ">
          ${escapeHtml(layerName)}
        </h2>

        <p style="
          margin:0;
          line-height:1.6;
          color:#52657a;
        ">
          ${escapeHtml(description)}
        </p>

      </div>

      <div style="
        padding:8px 13px;
        border-radius:999px;
        border:1px solid #d8e2ec;
        background:#f5f9fc;
        font-size:12px;
        font-weight:700;
      ">
        INPUT:
        ${escapeHtml(query)}
      </div>

    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(170px,1fr));
      gap:12px;
      margin-bottom:20px;
    ">

      ${resultCard(
        "Layer",
        `L${layer}`
      )}

      ${resultCard(
        "Input",
        query
      )}

      ${resultCard(
        "Run",
        currentRun?.run_id ||
        "Not created"
      )}

      ${resultCard(
        "Layer Data",
        hasLayerData
          ? "Returned"
          : "Not returned"
      )}

    </div>

    ${
      hasLayerData
        ? renderLayerBackendData(
            record
          )
        : `
          <div style="
            padding:18px;
            border-radius:12px;
            border:1px solid #dce5ed;
            background:#f8fafc;
            line-height:1.65;
          ">

            <h3 style="
              margin:0 0 9px 0;
              font-size:16px;
            ">
              ${
                hasRun
                  ? "No dedicated L" +
                    layer +
                    " record returned"
                  : "Layer ready for analysis"
              }
            </h3>

            <p style="
              margin:0;
              color:#52657a;
            ">
              ${
                hasRun
                  ? "The backend completed a run, but its response did not contain a dedicated record for this layer. The frontend will not fabricate scientific values."
                  : "Execute INP Analysis for this disease or molecule first. This layer will then display the corresponding backend evidence when supplied."
              }
            </p>

          </div>
        `
    }

    <div style="
      margin-top:18px;
      padding:15px;
      border-left:4px solid #365b73;
      background:#f7fafc;
      line-height:1.65;
      font-size:12px;
    ">

      <strong>Evidence Gate</strong>

      <br>

      INP distinguishes computational prediction,
      curated/database evidence, experimental evidence
      and human/clinical evidence. A missing field is
      displayed as missing rather than being inferred as
      a scientific fact.

    </div>
  `;

  panel.scrollIntoView({
    behavior:
      "smooth",
    block:
      "start"
  });
}

/* ============================================================
   BACKEND LAYER DATA
   ============================================================ */

function renderLayerBackendData(
  record
) {

  if (!record) {
    return "";
  }

  const entries =
    Object.entries(
      record
    );

  return `
    <div style="
      padding:18px;
      border:1px solid #dce5ed;
      border-radius:12px;
      background:#ffffff;
    ">

      <h3 style="
        margin:0 0 12px 0;
        font-size:16px;
      ">
        🔬 Backend Layer Result
      </h3>

      ${
        entries.length
          ? entries.map(
              ([key,value]) => {

                const display =
                  typeof value ===
                    "object" &&
                  value !== null
                    ? JSON.stringify(
                        value,
                        null,
                        2
                      )
                    : String(
                        value ??
                        "—"
                      );

                return `
                  <div style="
                    padding:12px;
                    margin:8px 0;
                    border:1px solid #e2e8f0;
                    border-radius:9px;
                    background:#f8fafc;
                  ">

                    <div style="
                      font-size:10px;
                      font-weight:700;
                      text-transform:uppercase;
                      letter-spacing:.6px;
                      opacity:.6;
                      margin-bottom:5px;
                    ">
                      ${escapeHtml(key)}
                    </div>

                    <pre style="
                      margin:0;
                      white-space:pre-wrap;
                      word-break:break-word;
                      font-family:inherit;
                      font-size:13px;
                      line-height:1.5;
                    ">${escapeHtml(display)}</pre>

                  </div>
                `;
              }
            ).join("")
          : `
            <p>
              The backend returned an empty layer record.
            </p>
          `
      }

    </div>
  `;
}

/* ============================================================
   FULL RUN RESULT
   ============================================================ */

function showResult(
  run
) {

  const panel =
    ensureResultPanel();

  const layers =
    Array.isArray(run?.layers)
      ? run.layers
      : [];

  const failureNodes =
    Array.isArray(
      run?.failure_nodes
    )
      ? run.failure_nodes
      : [];

  const restorationNodes =
    Array.isArray(
      run?.restoration_nodes
    )
      ? run.restoration_nodes
      : [];

  const targets =
    Array.isArray(
      run?.targets
    )
      ? run.targets
      : [];

  const pathways =
    Array.isArray(
      run?.pathways
    )
      ? run.pathways
      : [];

  panel.innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:15px;
      flex-wrap:wrap;
      margin-bottom:18px;
    ">

      <div>

        <div style="
          font-size:11px;
          font-weight:700;
          letter-spacing:1px;
          opacity:.6;
          text-transform:uppercase;
          margin-bottom:5px;
        ">
          MOTHER INP 7.5.0
        </div>

        <h2 style="
          margin:0;
          font-size:23px;
        ">
          INP Analysis Result
        </h2>

      </div>

      <div style="
        padding:8px 13px;
        border-radius:999px;
        background:#eef6f0;
        border:1px solid #cfe3d4;
        font-weight:700;
        font-size:12px;
      ">
        ${escapeHtml(
          run?.status ||
          "Completed"
        )}
      </div>

    </div>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(160px,1fr));
      gap:12px;
    ">

      ${resultCard(
        "Input",
        run?.query ||
        run?.disease ||
        run?.molecule ||
        run?.name ||
        "—"
      )}

      ${resultCard(
        "Input Type",
        run?.input_type ||
        "—"
      )}

      ${resultCard(
        "Run ID",
        run?.run_id ||
        "—"
      )}

      ${resultCard(
        "Translation",
        run?.translation ||
        "GREY"
      )}

      ${resultCard(
        "Priority",
        String(
          run?.overall_priority ??
          run?.priority ??
          "—"
        )
      )}

      ${resultCard(
        "Uncertainty",
        String(
          run?.overall_uncertainty ??
          run?.uncertainty ??
          "—"
        )
      )}

    </div>

    ${renderListSection(
      "Failure Nodes",
      failureNodes,
      "⚠"
    )}

    ${renderListSection(
      "Restoration Nodes",
      restorationNodes,
      "↻"
    )}

    ${renderListSection(
      "Molecular Targets",
      targets,
      "🎯"
    )}

    ${renderListSection(
      "Pathways",
      pathways,
      "🧬"
    )}

    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:20px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        🔬 11-Layer Backend Records
      </h3>

      ${
        layers.length
          ? layers.map(
              layer => `
                <div style="
                  padding:12px;
                  margin:7px 0;
                  border:1px solid #e2e8f0;
                  border-radius:9px;
                  background:#f8fafc;
                ">

                  <strong>
                    ${escapeHtml(
                      layer?.layer ||
                      "Layer"
                    )}
                  </strong>

                  <span style="
                    margin-left:10px;
                    opacity:.7;
                  ">
                    ${escapeHtml(
                      layer?.status ||
                      "—"
                    )}
                  </span>

                  ${
                    layer?.score !==
                      undefined
                      ? `
                        <span style="
                          margin-left:10px;
                        ">
                          Score:
                          ${escapeHtml(
                            layer.score
                          )}
                        </span>
                      `
                      : ""
                  }

                </div>
              `
            ).join("")
          : `
            <div style="
              padding:14px;
              border-radius:9px;
              background:#f8fafc;
            ">
              No dedicated layer records were returned
              by the backend.
            </div>
          `
      }

    </div>

    <div style="
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:20px;
    ">

      <button
        id="showRawBtn"
        type="button"
      >
        🧾 View Raw JSON
      </button>

      <button
        id="exportResultBtn"
        type="button"
      >
        📤 Export Run
      </button>

    </div>

    <div
      id="rawResultBox"
      style="display:none;"
    ></div>
  `;

  byId("showRawBtn")
    ?.addEventListener(
      "click",
      () =>
        showRawResult(
          run?.raw ||
          run
        )
    );

  byId("exportResultBtn")
    ?.addEventListener(
      "click",
      exportRun
    );

  panel.scrollIntoView({
    behavior:
      "smooth",
    block:
      "start"
  });
}

/* ============================================================
   RESULT PANEL
   ============================================================ */

function ensureResultPanel() {

  let panel =
    byId("inpResultPanel");

  if (panel) {
    return panel;
  }

  panel =
    document.createElement("section");

  panel.id =
    "inpResultPanel";

  panel.className =
    "panel";

  panel.style.cssText = `
    display:block !important;
    width:100%;
    box-sizing:border-box;
    margin:20px 0;
    padding:24px;
    background:#ffffff;
    border:1px solid #d9e2ec;
    border-radius:16px;
    box-shadow:0 6px 20px rgba(15,23,42,.07);
  `;

  const main =
    document.querySelector("main");

  const engine =
    byId("engineControls");

  if (engine) {

    engine.insertAdjacentElement(
      "afterend",
      panel
    );

  } else if (main) {

    main.appendChild(
      panel
    );

  } else {

    document.body.appendChild(
      panel
    );
  }

  return panel;
}

/* ============================================================
   LIST SECTIONS
   ============================================================ */

function renderListSection(
  title,
  items,
  icon
) {

  return `
    <div style="
      border-top:1px solid #e2e8f0;
      padding-top:18px;
      margin-top:20px;
    ">

      <h3 style="
        margin:0 0 10px 0;
        font-size:16px;
      ">
        ${icon} ${escapeHtml(title)}
      </h3>

      ${
        items.length
          ? items.map(
              item => `
                <div style="
                  padding:10px 12px;
                  margin:7px 0;
                  border-radius:9px;
                  background:#f8fafc;
                  border:1px solid #e2e8f0;
                  font-size:13px;
                ">
                  ${escapeHtml(
                    typeof item ===
                      "string"
                      ? item
                      : JSON.stringify(
                          item
                        )
                  )}
                </div>
              `
            ).join("")
          : `
            <div style="
              padding:10px 12px;
              border-radius:9px;
              background:#f8fafc;
              border:1px solid #e2e8f0;
              font-size:13px;
            ">
              None returned by backend.
            </div>
          `
      }

    </div>
  `;
}

/* ============================================================
   RAW JSON
   ============================================================ */

function showRawResult(
  data
) {

  const box =
    byId("rawResultBox");

  if (!box) return;

  box.style.display =
    "block";

  box.style.cssText += `
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
      data,
      null,
      2
    );
}

/* ============================================================
   ERROR PANEL
   ============================================================ */

function showErrorPanel(
  title,
  message
) {

  const panel =
    ensureResultPanel();

  panel.innerHTML = `

    <div style="
      padding:18px;
      border-radius:12px;
      border:1px solid #ead4d4;
      background:#fff8f8;
    ">

      <h2 style="
        margin:0 0 9px 0;
        font-size:20px;
      ">
        ⚠ ${escapeHtml(title)}
      </h2>

      <p style="
        margin:0;
        line-height:1.6;
      ">
        ${escapeHtml(message)}
      </p>

    </div>
  `;
}

/* ============================================================
   RESEARCH MODULES
   ============================================================ */

function openEvidence() {

  const run =
    currentRun?.raw;

  alert(
    run
      ? "Evidence Ledger\n\nOpen the INP result panel to inspect the evidence returned by the backend."
      : "Evidence Ledger\n\nExecute an INP analysis first."
  );
}

function openUncertainty() {

  alert(
    currentRun?.raw
      ? "Uncertainty Analysis\n\nInspect the uncertainty fields in the INP result returned by the backend."
      : "Uncertainty Analysis\n\nExecute an INP analysis first."
  );
}

function openExperiments() {

  alert(
    currentRun?.raw
      ? "Experimental Prioritization\n\nInspect experimental recommendations returned by the backend."
      : "Experimental Prioritization\n\nExecute an INP analysis first."
  );
}

function openTIME() {

  alert(
    currentRun?.raw
      ? `TIME™ Translation\n\nCurrent translation: ${
          currentRun.translation ||
          "GREY"
        }`
      : "TIME™ Translation\n\nExecute an INP analysis first."
  );
}

/* ============================================================
   IMPORT
   ============================================================ */

function importRun(
  event
) {

  const file =
    event?.target?.files?.[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    () => {

      try {

        const parsed =
          JSON.parse(
            reader.result
          );

        const run =
          parsed?.run ||
          parsed;

        currentRun = {
          ...currentRun,
          ...(run || {}),
          raw:
            parsed
        };

        renderRun(
          currentRun
        );

        showResult(
          currentRun
        );

        setStatus(
          "Run imported",
          true
        );

      }

      catch (error) {

        showErrorPanel(
          "Invalid INP JSON",
          error.message
        );
      }
    };

  reader.readAsText(
    file
  );

  event.target.value =
    "";
}

/* ============================================================
   EXPORT
   ============================================================ */

function exportRun() {

  if (
    !currentRun ||
    !(
      currentRun.run_id ||
      currentRun.raw
    )
  ) {

    alert(
      "No INP run is available to export yet."
    );

    return;
  }

  const data =
    currentRun.raw ||
    currentRun;

  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
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

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    `${
      currentRun.run_id ||
      "MOTHER-INP-7.5-run"
    }.json`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );
}

/* ============================================================
   GLOBAL FUNCTIONS
   ------------------------------------------------------------
   Required because index.html uses inline onclick handlers.
   ============================================================ */

window.openEngine =
  openEngine;

window.openEvidence =
  openEvidence;

window.openUncertainty =
  openUncertainty;

window.openExperiments =
  openExperiments;

window.openTIME =
  openTIME;

window.newRun =
  newRun;

window.importRun =
  importRun;

window.exportRun =
  exportRun;

window.executeFunctionalTest =
  executeFunctionalTest;

window.checkBackend =
  checkBackend;

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

    console.log(
      "MOTHER INP 7.5 frontend initialized."
    );

    /*
       Do not block the interface if the backend is sleeping.
       Render the UI first, then test connectivity.
    */

    await checkBackend();
  }
);
'''

path = Path("/mnt/data/MOTHER_INP_7.5_app.js")
path.write_text(app_js, encoding="utf-8")

print(f"Created: {path}")
print(f"Lines: {len(app_js.splitlines())}")
print(f"Bytes: {path.stat().st_size}")
