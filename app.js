/*
 MOTHER INP 7.5.0 — Connected Frontend
 Evidence-aware translational intelligence interface.

 Production API:
 https://mother-inp-7-5-backend.onrender.com

 This frontend communicates with the real FastAPI MOTHER INP 7.5 backend.
*/


/* =========================================================
   API CONFIGURATION
   ========================================================= */

const DEFAULT_API =
  "https://mother-inp-7-5-backend.onrender.com";

let API_BASE =
  (window.INP_API_BASE ||
    localStorage.getItem("inp_api_base") ||
    DEFAULT_API)
    .replace(/\/$/, "");


/* =========================================================
   CURRENT RUN STATE
   ========================================================= */

let currentRun = {
  version: "7.5.0",
  run_id: "",
  candidate_id: "C001",
  name: "MOTHER INP 7.5 Functional Test",
  layers: [],
  status: "Ready"
};


/* =========================================================
   STATUS DISPLAY
   ========================================================= */

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


/* =========================================================
   BASIC RUN STATUS RENDERER
   ========================================================= */

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
    status.textContent =
      currentRun.status || "Ready";
  }
}


/* =========================================================
   API REQUEST WRAPPER
   ========================================================= */

async function api(path, options = {}) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => controller.abort(), 30000);

  try {

    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,

        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },

        signal: controller.signal
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

    } catch {

      data = {
        raw: text
      };
    }

    if (!response.ok) {

      const message =
        data?.detail ||
        data?.message ||
        response.statusText ||
        "Request failed";

      throw new Error(
        `${response.status}: ${message}`
      );
    }

    return data;

  } catch (error) {

    if (error.name === "AbortError") {

      throw new Error(
        "API request timed out after 30 seconds."
      );
    }

    throw error;

  } finally {

    clearTimeout(timeout);
  }
}


/* =========================================================
   BACKEND HEALTH CHECK
   ========================================================= */

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

  } catch (error) {

    setStatus(
      `Backend unavailable — ${error.message}`,
      false
    );

    console.error(
      "MOTHER INP backend health check failed:",
      error
    );

    return null;
  }
}


/* =========================================================
   CREATE NEW RUN
   ========================================================= */

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

  } catch (error) {

    setStatus(
      `Run creation failed — ${error.message}`,
      false
    );

    alert(
      `MOTHER INP backend error:\n\n${error.message}`
    );

    console.error(
      "MOTHER INP new run error:",
      error
    );
  }
}


/* =========================================================
   FUNCTIONAL INP 7.5 TEST
   ========================================================= */

async function executeFunctionalTest() {

  const candidateId =
    document.getElementById(
      "candidateInput"
    )?.value.trim() || "C001";

  const candidateName =
    document.getElementById(
      "candidateNameInput"
    )?.value.trim() ||
    "MOTHER INP 7.5 Functional Test";


  const payload = {

    candidate_id:
      candidateId,

    name:
      candidateName,

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


  const button =
    document.getElementById(
      "executeBtn"
    );


  try {

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "⏳ Executing INP 7.5…";
    }


    setStatus(
      "Executing MOTHER INP 7.5 engine…"
    );


    console.log(
      "MOTHER INP 7.5: Sending functional run",
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


    console.log(
      "MOTHER INP 7.5: Backend response",
      data
    );


    if (!data || !data.run) {

      throw new Error(
        "Backend returned no run object."
      );
    }


    currentRun =
      data.run;


    currentRun.status =
      "Completed";


    /*
      IMPORTANT:

      Display the actual backend result
      immediately.

      The result renderer is independent
      of the small status renderer.
    */

    showResult(
      currentRun
    );


    /*
      Update the small run-status
      fields separately.

      If this fails, it must NOT
      hide the successful result.
    */

    try {

      renderRun(
        currentRun
      );

    } catch (renderError) {

      console.warn(
        "MOTHER INP status renderer warning:",
        renderError
      );
    }


    setStatus(
      `Engine completed — ${
        currentRun.translation || "GREY"
      }`,
      true
    );


    console.log(
      "MOTHER INP 7.5: Run completed",
      currentRun
    );


    return currentRun;


  } catch (error) {

    console.error(
      "MOTHER INP 7.5: Execution failed",
      error
    );


    setStatus(
      `Engine execution failed — ${error.message}`,
      false
    );


    const box =
      document.getElementById(
        "inpResultBox"
      );


    if (box) {

      box.textContent =
        "MOTHER INP 7.5 ENGINE ERROR\n\n" +
        error.message;

    } else {

      alert(
        "MOTHER INP 7.5 ENGINE ERROR\n\n" +
        error.message
      );
    }


    return null;


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "▶ Execute Functional Run";
    }
  }
}


/* =========================================================
   RESULT DISPLAY
   ========================================================= */

function showResult(run) {

  if (!run) {

    console.warn(
      "showResult called without a run."
    );

    return;
  }


  let box =
    document.getElementById(
      "inpResultBox"
    );


  if (!box) {

    box =
      document.createElement(
        "pre"
      );

    box.id =
      "inpResultBox";


    box.style.whiteSpace =
      "pre-wrap";

    box.style.padding =
      "16px";

    box.style.marginTop =
      "20px";

    box.style.borderRadius =
      "12px";

    box.style.overflowX =
      "auto";

    box.style.background =
      "#ffffff";

    box.style.border =
      "1px solid #ddd";

    box.style.fontFamily =
      "monospace";

    box.style.fontSize =
      "14px";

    box.style.lineHeight =
      "1.5";


    const host =
      document.querySelector("main") ||
      document.body;


    host.appendChild(
      box
    );
  }


  const result = {

    run_id:
      run.run_id,

    version:
      run.version,

    candidate_id:
      run.candidate_id,

    name:
      run.name,

    status:
      run.status,

    overall_priority:
      run.overall_priority,

    overall_uncertainty:
      run.overall_uncertainty,

    translation:
      run.translation,

    failure_nodes:
      run.failure_nodes,

    experiments:
      run.experiments,

    audit_sha256:
      run.audit_sha256
  };


  box.textContent =
    JSON.stringify(
      result,
      null,
      2
    );


  /*
    Make the result visible
    even if it is below the
    current viewport.
  */

  box.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}


/* =========================================================
   ENGINE / INFORMATION PANELS
   ========================================================= */

function openEngine(layer) {

  alert(
    `INP Layer ${layer}\n\n` +
    `The connected frontend is ready to send ` +
    `structured layer data to the real ` +
    `MOTHER INP 7.5 backend.\n\n` +
    `Current API: ${API_BASE}`
  );
}


function openEvidence() {

  alert(
    "Evidence Ledger\n\n" +
    "Use POST /v1/evidence/validate " +
    "in the backend API for evidence-item validation."
  );
}


function openUncertainty() {

  alert(
    "Uncertainty Analysis\n\n" +
    "Use POST /v1/uncertainty " +
    "to calculate bounded layer uncertainty."
  );
}


function openExperiments() {

  alert(
    "Experimental Prioritization\n\n" +
    "The engine generates experiment recommendations " +
    "from missing or uncertain evidence during /v1/run."
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


/* =========================================================
   IMPORT RUN
   ========================================================= */

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

      const run =
        JSON.parse(
          reader.result
        );


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


  reader.readAsText(
    file
  );


  event.target.value =
    "";
}


/* =========================================================
   EXPORT RUN
   ========================================================= */

function exportRun() {

  if (!currentRun.run_id) {

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


  document.body.appendChild(
    a
  );


  a.click();


  a.remove();


  URL.revokeObjectURL(
    url
  );
}


/* =========================================================
   LIVE ENGINE CONTROLS
   ========================================================= */

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

    <h2>⚙️ Live INP 7.5 Engine</h2>

    <p>
      Connected to the real FastAPI INP 7.5 engine.
    </p>

    <div
      style="
        display:grid;
        gap:10px;
        max-width:700px;
      "
    >

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
          value="${API_BASE}"
          style="
            width:100%;
            padding:10px;
            box-sizing:border-box;
          "
        >
      </label>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
        "
      >

        <button
          id="connectBtn"
        >
          🔌 Test Backend
        </button>


        <button
          id="executeBtn"
          class="primary"
          type="button"
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

    main.insertBefore(
      section,
      main.firstChild
    );
  }


  /* -----------------------------------------
     TEST BACKEND BUTTON
     ----------------------------------------- */

  const connectBtn =
    document.getElementById(
      "connectBtn"
    );


  if (connectBtn) {

    connectBtn.addEventListener(
      "click",
      async () => {

        const value =
          document
            .getElementById(
              "apiInput"
            )
            .value
            .trim()
            .replace(/\/$/, "");


        if (!value) {
          return;
        }


        /*
          Update the actual runtime
          API_BASE value.
        */

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
            `Connected successfully to ${data.service}\n` +
            `Engine: ${data.engine}`
          );
        }
      }
    );
  }


  /* -----------------------------------------
     EXECUTE FUNCTIONAL RUN BUTTON
     ----------------------------------------- */

  const executeBtn =
    document.getElementById(
      "executeBtn"
    );


  if (executeBtn) {

    executeBtn.addEventListener(
      "click",
      async () => {

        console.log(
          "MOTHER INP 7.5: Execute button clicked"
        );


        currentRun.candidate_id =
          document
            .getElementById(
              "candidateInput"
            )
            .value
            .trim() ||
          "C001";


        currentRun.name =
          document
            .getElementById(
              "candidateNameInput"
            )
            .value
            .trim() ||
          "MOTHER INP 7.5 Functional Test";


        await executeFunctionalTest();
      }
    );
  }
}


/* =========================================================
   APPLICATION STARTUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "MOTHER INP 7.5 frontend starting..."
    );


    renderRun(
      currentRun
    );


    addEngineControls();


    await checkBackend();


    /*
      Service worker intentionally disabled
      during live API validation.

      This prevents an old/broken cached
      application from interfering with
      the live INP frontend.
    */

    console.log(
      "MOTHER INP 7.5 frontend ready."
    );
  }
);
