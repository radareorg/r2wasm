// async fetch with progress

import { Ansi2Html } from "./ansi2html.ts";
import { httpFetch } from "./httpfetch.ts";

/// rasm2wasm widget

let globalId = 1;

class RasmElement extends HTMLElement {
  connectedCallback() {
    globalId++;
    this.id = "rasm2id" + globalId;
    const language = this.getAttribute("language");
    const arch = this.getAttribute("arch");
    const bits = this.getAttribute("bits");
    const input = this.getAttribute("input");
    let cpu = this.getAttribute("cpu");
    if (!cpu) {
      cpu = "";
    }
    let addr = this.getAttribute("addr");
    if (!addr) {
      addr = "0";
    }
    const htmlString = `
  <div style="background-color:#808080;border-radius:5px;box-sizing:border-box;padding:5px">
  <textarea id="rasm2-input-` + this.id +
      `" style="font-family:monospace;background-color:black;color:white;box-sizing:border-box;width:98%;padding:5px;height:6em;margin:5px;border-radius:5px;resize:none">` +
      input + `</textarea>
  <div id="rasm2-orig-` + this.id + `" style="visibility:hidden">` + input +
      `</div>
  <div style="text-align:left; margin:5px">
  <div id="rasm2-arch-` + this.id + `" style="visibility:hidden">` + arch +
      `</div>
  <div id="rasm2-bits-` + this.id + `" style="visibility:hidden">` + bits +
      `</div>
  <div id="rasm2-addr-` + this.id + `" style="visibility:hidden">` + addr +
      `</div>
  <div id="rasm2-cpu-` + this.id + `" style="visibility:hidden">` + cpu +
      `</div>
  <button onclick="rasm2wasm.assemble('` + this.id + `')">Assemble</button>
  <button onclick="rasm2wasm.disassemble('` + this.id +
      `')">Disassemble</button>
  <button onclick="rasm2wasm.listArchs('` + this.id + `')">Archs</button>
  <button onclick="rasm2wasm.reset('` + this.id + `')">Reset</button>
  </div>
<div id="rasm2-shell-` + this.id +
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
window.customElements.define("rasm2-wasm", RasmElement);

class RasmProgressElement extends HTMLElement {
  connectedCallback() {
    globalId++;
    this.id = "rasm2-wasm-progress";
    const htmlString = "";
    // "<div><button onclick='rasm2wasm.init_async()'>rasm2wasm.init()</button></div>";
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
window.customElements.define("rasm2-wasm-progress", RasmProgressElement);

interface Window {
  Runno: any; // Replace 'any' with the actual type if you know it
}

const { WASI } = window.Runno;

export function reset(id) {
  const div = document.getElementById("rasm2-shell-" + id);
  div.innerHTML = "";
  const orig = document.getElementById("rasm2-orig-" + id);
  const input = document.getElementById("rasm2-input-" + id);
  input.value = orig.innerHTML;
}

let rasm2_wasm = null;
let rasm2_wasm_async = function () {};
let loading = false;

function rasm2wasm_init() {
  if (loading) {
    // wait til loaded
    return;
  }
  loading = true;
  rasm2_wasm = fetch("rasm2.wasm?v=5.8.8");
  const detail = { received: 100, length: 100, loading: false };
  progress(detail);
  loading = false;
}

export function cancel() {
  rasm2wasm_cancel_async();
  const pc = document.getElementById("rasm2-wasm-progress");
  const htmlString = "";
  // "<div><button onclick='rasm2wasm.init_async()'>rasm2wasm.init()</button></div>";
  pc.innerHTML = htmlString;
}
var rasm2wasm_cancel_async = () => {};

export async function init_async() {
  try {
    const { get, cancel } = httpFetch("./");
    rasm2wasm_cancel_async = cancel;
    window.addEventListener("fetch-progress", (e) => {
      progress(e.detail);
    });
    window.addEventListener("fetch-finished", (e) => {
      const detail = { received: 100, length: 100, loading: false };
      progress(detail);
    });
    // add this abortbutton somewhere
    // abortbutton.addEventListener('click', cancel);
    rasm2_wasm = await get("radare2.wasm?v=5.8.8");
    // should be fast because must be cached
  } catch (e) {
    console.error(e);
  }
  rasm2wasm_init();
  return true;
}

export function progress(detail) {
  const percent = 0 | ((detail.received * 100) / detail.length);
  const pc = document.getElementById("rasm2-wasm-progress");
  if (percent === 100) {
    //pc.innerHTML = "<div style='border:2px solid black;background-color:green;display:inline-block'> rasm2wasm.ok</div>";
    pc.innerHTML = "";
  } else {
    pc.innerHTML =
      "<button onclick='rasm2wasm.cancel()'>cancel</button> <div style='border:2px solid black;background-color:grey;width:" +
      percent + "px'> rasm2wasm.progress(" + percent + "%)</div>";
  }
}

export async function listArchs(id) {
  if (rasm2_wasm == null) {
    await init_async();
  }
  div = document.getElementById("rasm2-shell-" + id);
  div.innerHTML = "";

  const result = WASI.start(rasm2_wasm, {
    args: ["rasm2", "-L"],
    env: { SOME_KEY: "some value" },
    stdout: (out) => {
      div.innerHTML += out;
    },
    stderr: (err) => {
      console.error("stderr", err), div.innerHTML += err;
    },
  });
  rasm2wasm_init();
}

export async function assemble(id) {
  if (rasm2_wasm == null) {
    await init_async();
  }
  div = document.getElementById("rasm2-shell-" + id);
  div.innerHTML = "";
  let arch = document.getElementById("rasm2-arch-" + id).innerHTML;
  let bits = document.getElementById("rasm2-bits-" + id).innerHTML;
  let addr = document.getElementById("rasm2-addr-" + id).innerHTML;
  let cpu = document.getElementById("rasm2-cpu-" + id).innerHTML;
  let input = document.getElementById("rasm2-input-" + id).value;

  if (!bits) {
    bits = 64;
  }
  if (!addr) {
    addr = 0;
  }
  let args = [];
  if (cpu) {
    args = ["rasm2", "-a", arch, "-b", bits, "-c", cpu, "-s", addr, input];
  } else {
    args = ["rasm2", "-a", arch, "-b", bits, "-s", addr, input];
  }
  const result = WASI.start(rasm2_wasm, {
    args: args,
    env: { SOME_KEY: "some value" },
    stdout: (out) => {
      div.innerHTML += out;
    },
    stderr: (err) => {
      console.error("stderr", err), div.innerHTML += err;
    },
  });
  rasm2wasm_init();
}
export async function disassemble(id) {
  if (rasm2_wasm == null) {
    await init_async();
  }
  div = document.getElementById("rasm2-shell-" + id);
  div.innerHTML = "";
  let arch = document.getElementById("rasm2-arch-" + id).innerHTML;
  let bits = document.getElementById("rasm2-bits-" + id).innerHTML;
  let addr = document.getElementById("rasm2-addr-" + id).innerHTML;
  let cpu = document.getElementById("rasm2-cpu-" + id).innerHTML;
  let input = document.getElementById("rasm2-input-" + id).value;

  if (!bits) {
    bits = 64;
  }
  if (!addr) {
    addr = 0;
  }
  let args = [];
  if (cpu) {
    args = [
      "rasm2",
      "-a",
      arch,
      "-b",
      bits,
      "-c",
      cpu,
      "-s",
      addr,
      "-D",
      input,
    ];
  } else {
    args = ["rasm2", "-a", arch, "-b", bits, "-s", addr, "-D", input];
  }
  const result = WASI.start(rasm2_wasm, {
    args: args,
    env: { SOME_KEY: "some value" },
    stdout: (out) => {
      div.innerHTML += out;
    },
    stderr: (err) => {
      console.error("stderr", err), div.innerHTML += err;
    },
  });
  rasm2wasm_init();
}
