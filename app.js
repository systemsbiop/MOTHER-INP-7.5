/* MOTHER INP 7.5.0 — connected frontend
   The browser UI talks to the real FastAPI backend.
   For local testing the backend is http://127.0.0.1:8000.
   For the live GitHub Pages site, set window.INP_API_BASE to your public HTTPS API.
*/

const LOCAL_API = "http://127.0.0.1:8000";
const API_BASE = (window.INP_API_BASE || localStorage.getItem("inp_api_base") || LOCAL_API).replace(/\/$/, "");

let currentRun = {
  version: "7.5.0",
  run_id: "",
  candidate_id: "C001",
  name: "",
  layers: [],
  status: "Ready"
};

function setStatus(text, ok = true) {
  const el = document.getElementById("runStatus");
  if (el) el.textContent = text;
  const dot = document.querySelector(".status-dot");
  if (dot) dot.title = `${ok ? "Connected" : "Error"}: ${text}`;
}

function renderRun(run) {
  currentRun = run || currentRun;
  const id = document.getElementById("runId");
  const version = document.getElementById("version");
  const status = document.getElementById("runStatus");
  if (id) id.textContent = currentRun.run_id || "Not started";
  if (version) version.textContent = currentRun.version || "7.5.0";
  if (status) status.textContent = currentRun.status || "Ready";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data?.detail || data?.message || response.statusText;
    throw new Error(`${response.status}: ${message}`);
  }
  return data;
}

async function checkBackend() {
  try {
    const data = await api("/health", { method: "GET", headers: {} });
    setStatus(`Backend OK — ${data.service}`, true);
    return data;
  } catch (error) {
    setStatus(`Backend unavailable — ${error.message}`, false);
    return null;
  }
}

async function newRun() {
  try {
    setStatus("Creating INP run…");
    const data = await api(`/v1/new-run?candidate_id=${encodeURIComponent(currentRun.candidate_id || "C001")}&name=${encodeURIComponent(currentRun.name || "MOTHER INP 7.5 Run")}`, { method: "POST" });
    currentRun.run_id = data.run_id;
    currentRun.version = data.version || "7.5.0";
    currentRun.status = "Run created";
    renderRun(currentRun);
    setStatus(`Run created: ${data.run_id}`);
    alert(`MOTHER INP 7.5 run created\n\nRun ID: ${data.run_id}`);
    return data;
  } catch (error) {
    setStatus(`Run creation failed — ${error.message}`, false);
    alert(`MOTHER INP backend error:\n\n${error.message}`);
  }
}

async function executeFunctionalTest() {
  const payload = {
    candidate_id: currentRun.candidate_id || "C001",
    name: currentRun.name || "MOTHER INP 7.5 Functional Test",
    layers: [
      { layer: "L1", status: "PARTIAL", score: 0.60, failure_nodes: ["TEST_DATA_INCOMPLETE"], notes: "Controlled software validation run." },
      { layer: "L2", status: "PARTIAL", score: 0.70, failure_nodes: [], notes: "Chemical characterization data not supplied." },
      { layer: "L10", status: "UNRESOLVED", score: null, failure_nodes: ["SAFETY_DATA_MISSING"], notes: "Safety evidence intentionally absent." }
    ],
    run_id: currentRun.run_id || "",
    parent_run_id: null
  };

  try {
    setStatus("Executing INP 7.5 engine…");
    const data = await api("/v1/run", { method: "POST", body: JSON.stringify(payload) });
    currentRun = data.run;
    currentRun.status = "Completed";
    renderRun(currentRun);
    setStatus(`Engine completed — ${currentRun.translation}`);
    showResult(data.run);
    return data.run;
  } catch (error) {
    setStatus(`Engine execution failed — ${error.message}`, false);
    alert(`MOTHER INP engine error:\n\n${error.message}`);
  }
}

function showResult(run) {
  let box = document.getElementById("inpResultBox");
  if (!box) {
    box = document.createElement("pre");
    box.id = "inpResultBox";
    box.style.whiteSpace = "pre-wrap";
    box.style.padding = "16px";
    box.style.borderRadius = "12px";
    box.style.overflowX = "auto";
    const host = document.querySelector("main") || document.body;
    host.appendChild(box);
  }
  box.textContent = JSON.stringify({
    run_id: run.run_id,
    overall_priority: run.overall_priority,
    overall_uncertainty: run.overall_uncertainty,
    translation: run.translation,
    failure_nodes: run.failure_nodes,
    experiments: run.experiments,
    audit_sha256: run.audit_sha256
  }, null, 2);
}

function openEngine(layer) {
  alert(`INP Layer ${layer}\n\nThe connected frontend is ready to send structured layer data to the real MOTHER INP 7.5 backend.\n\nCurrent API: ${API_BASE}`);
}

function openEvidence() {
  alert("Evidence Ledger\n\nUse POST /v1/evidence/validate in the backend API for evidence-item validation. The next frontend upgrade will expose the full ledger form here.");
}

function openUncertainty() {
  alert("Uncertainty Analysis\n\nUse POST /v1/uncertainty to calculate bounded layer uncertainty. The next frontend upgrade will expose the interactive form here.");
}

function openExperiments() {
  alert("Experimental Prioritization\n\nThe engine generates experiment recommendations from missing or uncertain evidence during /v1/run.");
}

function openTIME() {
  alert(`TIME™ Translation\n\nCurrent translation: ${currentRun.translation || "GREY"}`);
}

function importRun(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const run = JSON.parse(reader.result);
      currentRun = run;
      renderRun(currentRun);
      showResult(currentRun);
      setStatus("Run imported");
    } catch (error) {
      alert(`Invalid INP JSON: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function exportRun() {
  if (!currentRun.run_id) {
    alert("No INP run is available to export yet.");
    return;
  }
  const blob = new Blob([JSON.stringify(currentRun, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentRun.run_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function addEngineControls() {
  if (document.getElementById("engineControls")) return;
  const section = document.createElement("section");
  section.id = "engineControls";
  section.className = "panel";
  section.innerHTML = `
    <h2>⚙️ Live INP 7.5 Engine</h2>
    <p>Connected to the real FastAPI INP 7.5 engine.</p>
    <div style="display:grid;gap:10px;max-width:700px">
      <label>Candidate ID
        <input id="candidateInput" value="C001" style="width:100%;padding:10px;box-sizing:border-box">
      </label>
      <label>Candidate name
        <input id="candidateNameInput" value="MOTHER INP 7.5 Functional Test" style="width:100%;padding:10px;box-sizing:border-box">
      </label>
      <label>Backend API URL
        <input id="apiInput" value="${API_BASE}" style="width:100%;padding:10px;box-sizing:border-box">
      </label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button id="connectBtn">🔌 Test Backend</button>
        <button id="executeBtn" class="primary">▶ Execute Functional Run</button>
      </div>
    </div>`;
  const main = document.querySelector("main");
  if (main) main.insertBefore(section, main.firstChild.nextSibling);

  document.getElementById("connectBtn").onclick = async () => {
    const value = document.getElementById("apiInput").value.trim().replace(/\/$/, "");
    if (!value) return;
    localStorage.setItem("inp_api_base", value);
    window.INP_API_BASE = value;
    const data = await checkBackend();
    if (data) alert(`Connected successfully to ${data.service}\nEngine: ${data.engine}`);
  };

  document.getElementById("executeBtn").onclick = async () => {
    currentRun.candidate_id = document.getElementById("candidateInput").value.trim() || "C001";
    currentRun.name = document.getElementById("candidateNameInput").value.trim() || "MOTHER INP 7.5 Functional Test";
    await executeFunctionalTest();
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  renderRun(currentRun);
  addEngineControls();
  await checkBackend();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service worker registration failed:", error));
  }
});
