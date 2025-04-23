// async fetch with progress

import * as ansi2html from "./ansi2html.ts";

function http(rootUrl: string) {
  let loading = false;

  let chunks: Uint8Array[] = [];
  let results: Uint8Array | null = null;
  let error = null;

  let controller: AbortController | null = null;

  const get = async (path, options) => {
    _resetLocals();
    if (!controller) {
      controller = new AbortController();
    }
    let signal = controller.signal;
    loading = true;

    try {
      const response = await fetch(rootUrl + path, { signal, ...options });
      if (response.status >= 200 && response.status < 300) {
        results = await _readBody(response);
        return results;
      } else {
        throw new Error(response.statusText);
      }
    } catch (err) {
      error = err;
      results = null;
      return error;
    } finally {
      loading = false;
    }
  };

  const _readBody = async (response: Response): Promise<Uint8Array> => {
    const reader = response.body!.getReader();
    const length: number = +response.headers.get("content-length")!;
    let received: number = 0;

    // Loop through the response stream and extract data chunks
    while (loading) {
      const { done, value }: ReadableStreamReadResult<Uint8Array> = await reader
        .read();
      const payload = { detail: { received, length, loading } };
      const onProgress = new CustomEvent("fetch-progress", payload);
      const onFinished = new CustomEvent("fetch-finished", payload);

      if (done) {
        loading = false;
        window.dispatchEvent(onFinished);
      } else {
        chunks.push(value);
        received += value.length;
        window.dispatchEvent(onProgress);
      }
    }
    // Concat the chinks into a single array
    let body = new Uint8Array(received);
    let position = 0;

    // Order the chunks by their respective position
    for (let chunk of chunks) {
      body.set(chunk, position);
      position += chunk.length;
    }

    loading = false;
    // Decode the response and return it
    return body; // new TextDecoder('utf-8').decode(body);
  };
  const _resetLocals = () => {
    loading = false;

    chunks = [];
    results = null;
    error = null;

    controller = new AbortController();
  };

  const cancel = () => {
    _resetLocals();
    if (controller) {
      controller.abort();
    }
  };

  return { get, cancel };
}

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
  <button onclick="reset_any('` + this.id + `')">Reset</button>
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
    const htmlString =
      "<div><button onclick='r2wasm.r2wasm_init_async()'>r2wasm.init()</button></div>";
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

function reset_any(id) {
  const div = document.getElementById("shell-" + id);
  div.innerHTML = "";
  const orig = document.getElementById("orig-" + id);
  const script = document.getElementById("script-" + id);
  script.value = orig.innerHTML;
}

export function run_any(id, language) {
  const div = document.getElementById("shell-" + id);
  const el = document.getElementById("script-" + id);
  r2wasm_run(id, language, el.value);
}

export function run_js() {
  script_name = "/script.r2.js";
  const el = document.getElementById("script");
  script_r2_js = el.value;
  div = document.getElementById("shell");
  r2wasm_run();
}

export function run_r2() {
  script_name = "/script.r2";
  const el = document.getElementById("script");
  script_r2 = el.value;
  div = document.getElementById("shell");
  r2wasm_run();
}

var convert = new ansi2html.Convert();
const sync_fetch = true;
let radare2_wasm = null;
let radare2_wasm_async = function () {};

function r2wasm_init() {
  radare2_wasm = fetch("radare2.wasm?v=5.8.8");
  const detail = { received: 100, length: 100, loading: false };
  r2wasm_progress(detail);
}

var r2wasm_cancel = function () {
  r2wasm_cancel_async();
  const pc = document.getElementById("r2-wasm-progress");
  const htmlString =
    "<div><button onclick='r2wasm_init_async()'>r2wasm.init()</button></div>";
  pc.innerHTML = htmlString;
};

export async function r2wasm_init_async() {
  try {
    const { get, cancel } = http("./");
    r2wasm_cancel_async = cancel;
    window.addEventListener("fetch-progress", (e) => {
      r2wasm_progress(e.detail);
    });
    window.addEventListener("fetch-finished", (e) => {
      const detail = { received: 100, length: 100, loading: false };
      r2wasm_progress(detail);
      //  r2wasm_progress(e.detail);
      //    r2wasm_run(radare2_wasm);
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
      "<button onclick='r2wasm_cancel()'>cancel</button> <div style='border:2px solid black;background-color:grey;width:" +
      percent + "px'> r2wasm(" + percent + "%)</div>";
  }
}

function r2wasm_run(id, language, script) {
  if (radare2_wasm == null) {
    alert("call r2wasm_init fore r2wasm_run");
    return;
    //
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
      div.innerHTML += convert.toHtml(out);
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
