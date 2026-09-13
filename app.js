from pathlib import Path

code = r'''/* ============================================================
   MOTHER INP 7.5.0
   Fresh frontend controller
   - Works with the existing index.html
   - Creates the Live INP 7.5 control panel
   - Wires every existing inline button/module
   - Tests /health
   - Executes /v1/run
   - Renders returned INP results
   - Provides disease input for the next engine stage
   ============================================================ */

"use strict";

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
  disease: "",
  layers: [],
  status: "Ready",
  translation: "GREY"
};


/* ============================================================
   HELPERS
   ============================================================ */

function byId(id) {
  return document.getElementById(id);
}

function setStatus(text, ok = true) {
  const runStatus = byId("runStatus");
  const systemStatus = byId("systemStatus");
  const dot = document.querySelector(".status-dot");

  if (runStatus) runStatus.textContent = text;

  if (systemStatus) {
    systemStatus.textContent =
      ok ? "System Ready" : "Backend Error";
  }

  if (dot) {
    dot.title =
      `${ok ? "Connected" : "Error"}: ${text}`;
  }

  console.log(`MOTHER INP STATUS: ${text}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
      ">${escapeHtml(label)}</div>
      <div style="
        font-size:14px;
        font-weight:700;
        word-break:break-word;
      ">${escapeHtml(value)}</div>
    </div>
  `;
}


/* ============================================================
   API
   ============================================================ */

async function api(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    30000
  );

  try {
    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.headers || {})
        }
      }
    );

    const text = await response.text();

    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        response.statusText ||
        "Unknown backend error";

      throw new Error(
        `${response.status}: ${message}`
      );
    }

    return data;

  } catch (error) {

    if (error.name === "AbortError") {
      throw new Error(
        "Backend request timed out after 30 seconds."
      );
    }

    if (
      error instanceof TypeError &&
      /fetch/i.test(error.message)
    ) {
      throw new Error(
        "Unable to reach backend. Check the API URL and CORS configuration."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}


/* ============================================================
   CURRENT RUN
   ============================================================ */

function renderRun(run) {
  currentRun = run || currentRun;

  const id = byId("runId");
  const version = byId("version");
  const status = byId("runStatus");

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
   BACKEND HEALTH
   ============================================================ */

async function checkBackend() {
  try {
    setStatus("Testing backend…");

    const data = await api("/health");

    setStatus(
      `Backend OK — ${data.service || "MOTHER INP 7.5"}`,
      true
    );

    return data;

  } catch (error) {

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
   NEW RUN
   ============================================================ */

async function newRun() {
  try {
    setStatus("Creating INP run…");

    const candidate =
      currentRun.candidate_id || "C001";

    const name =
      currentRun.name ||
      currentRun.disease ||
      "MOTHER INP 7.5 Run";

    const data = await api(
      `/v1/new-run?candidate_id=${encodeURIComponent(candidate)}&name=${encodeURIComponent(name)}`,
      { method: "POST" }
    );

    currentRun.run_id =
      data.run_id || "";

    currentRun.version =
      data.version || "7.5.0";

    currentRun.status =
      "Run created";

    renderRun(currentRun);

    setStatus(
      `Run created: ${currentRun.run_id}`
    );

    alert(
      `MOTHER INP 7.5 run created\n\nRun ID: ${currentRun.run_id}`
    );

    return data;

  } catch (error) {

    setStatus(
      `Run creation failed — ${error.message}`,
      false
    );

    alert(
      `MOTHER INP backend error:\n\n${error.message}`
    );

    return null;
  }
}


/* ============================================================
   BUILD DISEASE PAYLOAD
   ============================================================ */

function buildDiseasePayload() {

  const diseaseInput = byId("diseaseInput");
  const candidateInput = byId("candidateInput");
  const candidateNameInput = byId("candidateNameInput");

  const disease =
    diseaseInput?.value.trim() ||
    candidateNameInput?.value.trim() ||
    "";

  const candidateId =
    candidateInput?.value.trim() ||
    "C001";

  const name =
    candidateNameInput?.value.trim() ||
    disease ||
    "MOTHER INP 7.5 Disease Run";

  /*
     The layer records below preserve the INP architecture.
     The backend remains responsible for authoritative
     calculations and evidence classification.
  */

  const layers = Array.from(
    { length: 11 },
    (_, index) => ({
      layer: `L${index + 1}`,
      status: "PENDING",
      score: null,
      failure_nodes: [],
      notes:
        "Awaiting backend analysis for supplied disease."
    })
  );

  return {
    candidate_id: candidateId,
    name,
    disease,
    query: disease,
    version: "7.5.0",
    layers,
    run_id: currentRun.run_id || "",
    parent_run_id: null
  };
}


/* ============================================================
   FUNCTIONAL / DISEASE RUN
   ============================================================ */

async function executeFunctionalTest() {

  const button = byId("executeBtn");

  if (button) {
    button.disabled = true;
    button.textContent =
      "⏳ Running MOTHER INP…";
  }

  try {

    const payload =
      buildDiseasePayload();

    if (!payload.disease) {
      throw new Error(
        "Please enter a disease or research condition first."
      );
    }

    currentRun.candidate_id =
      payload.candidate_id;

    currentRun.name =
      payload.name;

    currentRun.disease =
      payload.disease;

    setStatus(
      `Executing INP 7.5 for ${payload.disease}…`
    );

    console.log(
      "MOTHER INP disease payload:",
      payload
    );

    const data = await api(
      "/v1/run",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    const returnedRun =
      data?.run || data;

    if (!returnedRun) {
      throw new Error(
        "Backend returned no INP run."
      );
    }

    currentRun = {
      ...returnedRun,
      disease:
        returnedRun.disease ||
        payload.disease,
      status:
        returnedRun.status ||
        "Completed"
    };

    renderRun(currentRun);

    setStatus(
      `Engine completed — ${
        currentRun.translation || "GREY"
      }`,
      true
    );

    showResult(currentRun);

    return currentRun;

  } catch (error) {

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

    return null;

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "▶ Execute Functional Run";
    }
  }
}


/* ============================================================
   LIVE ENGINE CONTROLS
   ============================================================ */

function addEngineControls() {

  let section =
    byId("engineControls");

  /*
     If a stale/partial section exists, remove it.
     This guarantees that all required controls exist.
  */

  const requiredIds = [
    "connectBtn",
    "executeBtn",
    "candidateInput",
    "candidateNameInput",
    "apiInput",
    "diseaseInput"
  ];

  const complete =
    section &&
    requiredIds.every(
      id => byId(id)
    );

  if (section && !complete) {
    section.remove();
    section = null;
  }

  /*
     Create the panel.
  */

  if (!section) {

    section =
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
        Enter any disease or research condition and execute
        the connected MOTHER INP 7.5 backend.
      </p>

      <div style="
        display:grid;
        gap:10px;
        max-width:760px;
      ">

        <label>
          Disease / Research Condition

          <input
            id="diseaseInput"
            type="text"
            placeholder="e.g. Diabetes mellitus"
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
            value=""
            placeholder="Optional — defaults to disease"
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
            id="executeBtn"
            type="button"
            class="primary"
          >
            ▶ Execute Functional Run
          </button>

        </div>

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
        main.prepend(section);
      }

    } else {
      document.body.prepend(section);
    }
  }

  /*
     Re-read elements after creation.
  */

  const connectButton =
    byId("connectBtn");

  const executeButton =
    byId("executeBtn");

  const candidateInput =
    byId("candidateInput");

  const candidateNameInput =
    byId("candidateNameInput");

  const apiInput =
    byId("apiInput");

  const diseaseInput =
    byId("diseaseInput");


  if (apiInput) {
    apiInput.value = API_BASE;
  }


  /*
     Test Backend
  */

  if (connectButton) {

    connectButton.onclick =
      async function () {

        const value =
          apiInput?.value
            .trim()
            .replace(/\/$/, "") ||
          DEFAULT_API;

        API_BASE = value;

        localStorage.setItem(
          "inp_api_base",
          value
        );

        window.INP_API_BASE =
          value;

        connectButton.disabled = true;

        connectButton.textContent =
          "⏳ Testing…";

        try {

          const data =
            await checkBackend();

          if (data) {
            alert(
              `Connected successfully!\n\n` +
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

        } finally {

          connectButton.disabled = false;

          connectButton.textContent =
            "🔌 Test Backend";
        }
      };
  }


  /*
     Execute
  */

  if (executeButton) {

    executeButton.onclick =
      async function () {

        if (
          diseaseInput &&
          !diseaseInput.value.trim() &&
          candidateNameInput
        ) {
          diseaseInput.value =
            candidateNameInput.value.trim();
        }

        currentRun.candidate_id =
          candidateInput?.value.trim() ||
          "C001";

        currentRun.name =
          candidateNameInput?.value.trim() ||
          diseaseInput?.value.trim() ||
          "MOTHER INP 7.5 Disease Run";

        currentRun.disease =
          diseaseInput?.value.trim() ||
          currentRun.name;

        await executeFunctionalTest();
      };
  }


  /*
     Enter key in disease box executes the run.
  */

  if (diseaseInput) {

    diseaseInput.onkeydown =
      function (event) {

        if (
          event.key === "Enter" &&
          executeButton
        ) {
          event.preventDefault();
          executeButton.click();
        }
      };
  }


  console.log(
    "MOTHER INP 7.5 controls connected:",
    {
      apiInput: !!apiInput,
      candidateInput: !!candidateInput,
      candidateNameInput: !!candidateNameInput,
      diseaseInput: !!diseaseInput,
      connectButton: !!connectButton,
      executeButton: !!executeButton
    }
  );
}


/* ============================================================
   RESULT PANEL
   ============================================================ */

function ensureResultPanel() {

  let panel =
    byId("inpResultPanel");

  if (panel) return panel;

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
    padding:22px;
    background:#ffffff;
    border:1px solid #d9e2ec;
    border-radius:16px;
    box-shadow:0 6px 20px rgba(15,23,42,0.08);
    visibility:visible !important;
    opacity:1 !important;
  `;

  const main =
    document.querySelector("main");

  if (main) {
    const engine =
      byId("engineControls");

    if (engine) {
      engine.insertAdjacentElement(
        "afterend",
        panel
      );
    } else {
      main.appendChild(panel);
    }
  } else {
    document.body.appendChild(panel);
  }

  return panel;
}


/* ============================================================
   RESULT RENDERING
   ============================================================ */

function showResult(run) {

  if (!run) return;

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

  const restorationNodes =
    Array.isArray(run.restoration_nodes)
      ? run.restoration_nodes
      : [];

  const targets =
    Array.isArray(run.targets)
      ? run.targets
      : [];

  const pathways =
    Array.isArray(run.pathways)
      ? run.pathways
      : [];

  const translation =
    run.translation || "GREY";

  const priority =
    run.overall_priority ??
    run.priority ??
    "—";

  const uncertainty =
    run.overall_uncertainty ??
    run.uncertainty ??
    "—";

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
          INP Run Results
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
        ${escapeHtml(run.status || "Completed")}
      </div>

    </div>


    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(150px,1fr));
      gap:12px;
      margin-bottom:20px;
    ">

      ${resultCard(
        "Disease",
        run.disease ||
        run.name ||
        run.candidate_id ||
        "—"
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


    ${renderArraySection(
      "Failure Nodes",
      failureNodes,
      "⚠"
    )}

    ${renderArraySection(
      "Restoration Nodes",
      restorationNodes,
      "↻"
    )}

    ${renderArraySection(
      "Molecular Targets",
      targets,
      "🎯"
    )}

    ${renderArraySection(
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
        🔬 11-Layer Results
      </h3>

      ${
        layers.length
          ? layers.map(
              layer => `
                <div style="
                  display:grid;
                  grid-template-columns:
                    60px 120px 90px minmax(0,1fr);
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
                      layer.layer || "—"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      layer.status || "—"
                    )}
                  </span>

                  <span>
                    Score:
                    ${
                      layer.score === null ||
                      layer.score === undefined
                        ? "—"
                        : escapeHtml(
                            layer.score
                          )
                    }
                  </span>

                  <span style="
                    min-width:0;
                    word-break:break-word;
                  ">
                    ${
                      Array.isArray(
                        layer.failure_nodes
                      ) &&
                      layer.failure_nodes.length
                        ? escapeHtml(
                            layer.failure_nodes.join(
                              ", "
                            )
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
              No layer records returned by backend.
            </div>
          `
      }

    </div>


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
                      experiment.layer ||
                      "Layer"
                    )}
                    —
                    ${escapeHtml(
                      experiment.experiment_class ||
                      "Experiment"
                    )}
                  </div>

                  <div style="
                    font-size:13px;
                    line-height:1.5;
                  ">
                    ${escapeHtml(
                      experiment.rationale || ""
                    )}
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
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        font-size:11px;
        word-break:break-all;
      ">
        ${escapeHtml(audit)}
      </div>

    </div>


    <div style="
      margin-top:20px;
      padding:14px;
      border-radius:10px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      font-size:12px;
      line-height:1.6;
    ">

      <strong>Scientific Governance</strong>

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


    <div style="
      margin-top:18px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    ">

      <button
        id="resultExportBtn"
        type="button"
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
        type="button"
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
    byId("resultExportBtn");

  if (exportButton) {
    exportButton.onclick = exportRun;
  }

  const rawButton =
    byId("resultRawBtn");

  if (rawButton) {
    rawButton.onclick = () =>
      showRawResult(run);
  }

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function renderArraySection(title, items, icon) {

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
                    typeof item === "string"
                      ? item
                      : JSON.stringify(item)
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
              None returned.
            </div>
          `
      }

    </div>
  `;
}


/* ============================================================
   RAW JSON
   ============================================================ */

function showRawResult(run) {

  const existing =
    byId("inpRawResult");

  if (existing) {
    existing.remove();
  }

  const box =
    document.createElement("pre");

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
    byId("inpResultPanel");

  if (panel) {
    panel.appendChild(box);
  }
}


/* ============================================================
   ENGINE / RESEARCH MODULES
   ============================================================ */

function openEngine(layer) {

  const names = {
    1: "Disease + Genomic Context",
    2: "MCheM / Physicochemistry",
    3: "Absorption / Exposure",
    4: "Metabolism / ADME",
    5: "Cellular Action",
    6: "Target / Pathway",
    7: "Tissue / Organ",
    8: "Network Pharmacology",
    9: "Time / Adaptation",
    10: "Safety / Selectivity",
    11: "TIME™ Translation"
  };

  alert(
    `INP Layer ${layer}\n\n` +
    `${names[layer] || "INP Layer"}\n\n` +
    `Current API:\n${API_BASE}`
  );
}

function openEvidence() {
  alert(
    "Evidence Ledger\n\n" +
    "Evidence provenance and classification " +
    "are returned by the MOTHER INP backend."
  );
}

function openUncertainty() {
  alert(
    "Uncertainty Analysis\n\n" +
    "Uncertainty is reported from the backend " +
    "when available."
  );
}

function openExperiments() {
  alert(
    "Experimental Prioritization\n\n" +
    "MOTHER INP prioritizes experiments using " +
    "missing or uncertain evidence returned by the engine."
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

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload = () => {

    try {

      const parsed =
        JSON.parse(reader.result);

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
        "Run imported",
        true
      );

    } catch (error) {

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
        type:"application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

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
   GLOBAL FUNCTIONS
   Required by existing index.html inline onclick handlers.
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
       Test the backend automatically so the
       status indicator immediately reflects
       whether the deployed API is reachable.
    */

    await checkBackend();

  }
);
'''

path = Path("/mnt/data/app.js")
path.write_text(code, encoding="utf-8")

print(f"Created {path}")
print(f"Lines: {len(code.splitlines())}")
