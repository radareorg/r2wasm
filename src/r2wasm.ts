// async fetch with progress

import { Ansi2Html } from "./ansi2html.ts";
import { httpFetch } from "./httpfetch.ts";

/// r2wasm widget

let globalId = 1;

class RadareElement extends HTMLElement {
  connectedCallback() {
    globalId++;
    this.id = "r2id" + globalId;
    const language = this.getAttribute("language");
    const scriptAttr = this.getAttribute("script");
    const script = scriptAttr ? scriptAttr.replace("\\n", "\n") : "";
    const htmlString = `
  <div style="background-color:#808080;border-radius:5px;box-sizing:border-box;padding:5px">
  <textarea id="script-` + this.id +
      `" style="font-family:monospace;background-color:black;color:white;box-sizing:border-box;width:98%;padding:5px;height:6em;margin:5px;border-radius:5px;resize:none">` +
      script + `</textarea>
  <div id="orig-` + this.id + `" style="visibility:hidden">` + script + `</div>
  <div style="text-align:left; margin:5px">
  <button onclick="r2wasm.run_any('` + this.id + `', '` + language +
      `')">Run</button>
  <button onclick="r2wasm.reset_any('` + this.id + `')">Reset</button>
  </div>
<div id="shell-` + this.id +
      `" style="overflow:scroll;margin:5px;display:block;background-color:black;border-radius:5px;color:white;white-space:pre;font-family:monospace"></div>
  </div>
   `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    //this.shadowRoot.append(doc.body.firstChild);
    if (doc.body.firstChild) {
      this.appendChild(doc.body.firstChild);
    }
  }
  constructor() {
    super();
    // this.attachShadow({ mode: 'open' });
    // Create elements
    const wrapper = document.createElement("div");
    // Style the elements
    wrapper.style.padding = "10px";
    // Append elements to the shadow root
    // this.shadowRoot.append(wrapper);
  }
}
window.customElements.define("r2-wasm", RadareElement);

class RadareProgressElement extends HTMLElement {
  connectedCallback() {
    globalId++;
    this.id = "r2-wasm-progress";
    const htmlString = "";
    // "<div><button onclick='r2wasm.init_async()'>r2wasm.init()</button></div>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    //this.shadowRoot.append(doc.body.firstChild);
    if (doc.body.firstChild) {
      this.appendChild(doc.body.firstChild);
    }
  }
  constructor() {
    super();
    const wrapper = document.createElement("div");
    wrapper.style.padding = "10px";
  }
}
window.customElements.define("r2-wasm-progress", RadareProgressElement);

interface Window {
  Runno: any; // Replace 'any' with the actual type if you know it
}

const { WASI } = window.Runno;
let script_name = "/script.r2";
let script_r2_js = "";
let script_r2 = "";

/*
function sample_r2() {
  script_name = "/script.r2";
  script_r2 = `?E Hello World
pd 10
 `;
  const scriptElement = document.getElementById("script");
  if (scriptElement) {
    (scriptElement as HTMLTextAreaElement).value = script_r2;
  }
}

function sample_r2js() {
  script_name = "/script.r2.js";
  script_r2_js = `console.log(r2.cmd("x"));
 `;
  const el = document.getElementById("script");
  if (el) {
    el.value = script_r2_js;
  }
}
*/

export function reset_any(id) {
  const div = document.getElementById("shell-" + id);
  div.innerHTML = "";
  const orig = document.getElementById("orig-" + id);
  const script = document.getElementById("script-" + id);
  script.value = orig.innerHTML;
}

export function run_any(id, language) {
  const div = document.getElementById("shell-" + id);
  const el = document.getElementById("script-" + id);
  run(id, language, el.value);
}

export function run_js() {
  script_name = "/script.r2.js";
  const el = document.getElementById("script");
  script_r2_js = el.value;
  div = document.getElementById("shell");
  run();
}

export function run_r2() {
  script_name = "/script.r2";
  const el = document.getElementById("script");
  script_r2 = el.value;
  div = document.getElementById("shell");
  run();
}

const a2h = new Ansi2Html();
let radare2_wasm = null;
let radare2_wasm_async = function () {};
let loading = false;

function r2wasm_init() {
  if (loading) {
    // wait til loaded
    return;
  }
  loading = true;
  radare2_wasm = fetch("radare2.wasm?v=5.8.8");
  const detail = { received: 100, length: 100, loading: false };
  r2wasm_progress(detail);
  loading = false;
}

export function cancel() {
  r2wasm_cancel_async();
  const pc = document.getElementById("r2-wasm-progress");
  const htmlString = "";
  // "<div><button onclick='r2wasm.init_async()'>r2wasm.init()</button></div>";
  pc.innerHTML = htmlString;
}

export async function init_async() {
  try {
    const { get, cancel } = httpFetch("./");
    r2wasm_cancel_async = cancel;
    window.addEventListener("fetch-progress", (e) => {
      r2wasm_progress(e.detail);
    });
    window.addEventListener("fetch-finished", (e) => {
      const detail = { received: 100, length: 100, loading: false };
      r2wasm_progress(detail);
      // r2wasm_progress(e.detail);
      // run(radare2_wasm);
    });
    // add this abortbutton somewhere
    // abortbutton.addEventListener('click', cancel);
    radare2_wasm = await get("radare2.wasm?v=5.8.8");
    // should be fast because must be cached
  } catch (e) {
    console.error(e);
  }
  r2wasm_init();
  return true;
}

function r2wasm_progress(detail) {
  const percent = 0 | ((detail.received * 100) / detail.length);
  const pc = document.getElementById("r2-wasm-progress");
  if (percent === 100) {
    //pc.innerHTML = "<div style='border:2px solid black;background-color:green;display:inline-block'> r2wasm.ok</div>";
    pc.innerHTML = "";
  } else {
    pc.innerHTML =
      "<button onclick='r2wasm.cancel()'>cancel</button> <div style='border:2px solid black;background-color:grey;width:" +
      percent + "px'> r2wasm(" + percent + "%)</div>";
  }
}

export async function run(id, language, script) {
  if (radare2_wasm == null) {
    await init_async();
  }
  div = document.getElementById("shell-" + id);
  div.innerHTML = "";
  script_r2 = script;
  script_r2_js = script;

  const script_name = language === "r2js" ? "/script.r2.js" : "/script.r2";
  const result = WASI.start(radare2_wasm, {
    //args: ["radare2", "-qescr.color=0", "-i", script_name, "some-file.txt"],
    args: ["radare2", "-qi", script_name, "some-file.txt"],
    env: { SOME_KEY: "some value" },
    stdout: (out) => {
      div.innerHTML += a2h.toHtml(out);
      /// console.log("stdout", out),
    },
    stderr: (err) => {
      console.error("stderr", err), div.innerHTML += out;
    },
    /// stdin: () => prompt("stdin:"),
    fs: {
      "/script.r2": {
        path: "/script.r2",
        timestamps: {
          access: new Date(),
          change: new Date(),
          modification: new Date(),
        },
        mode: "string",
        content: script_r2,
      },
      "/script.r2.js": {
        path: "/script.r2.js",
        timestamps: {
          access: new Date(),
          change: new Date(),
          modification: new Date(),
        },
        mode: "string",
        content: script_r2_js,
      },
      "/some-file.txt": {
        path: "/some-file.txt",
        timestamps: {
          access: new Date(),
          change: new Date(),
          modification: new Date(),
        },
        mode: "string",
        content: "Some content for the file.",
      },
    },
  });
  r2wasm_init();
}
