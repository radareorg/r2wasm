	  let globalId = 1;
class RadareElement extends HTMLElement {
  connectedCallback() {
    globalId ++;
    this.id = "r2id" + globalId;
    const language = this.getAttribute("language");
    const script = this.getAttribute("script").replace("\\n", "\n");
    const htmlString = `
  <div style="background-color:#808080;border-radius:5px;box-sizing:border-box;padding:5px">
  <textarea id="script-`+this.id+`" style="font-family:monospace;background-color:black;color:white;box-sizing:border-box;width:98%;padding:5px;height:6em;margin:5px;border-radius:5px;resize:none">` + script + `</textarea>
  <div id="orig-`+this.id+`" style="visibility:hidden">` + script + `</div>
  <div style="text-align:left; margin:5px">
  <button onclick="run_any('`+this.id+`', '`+language+`')">Run</button>
  <button onclick="reset_any('`+this.id+`')">Reset</button>
  </div>
<div id="shell-`+this.id+`" style="overflow:scroll;margin:5px;display:block;background-color:black;border-radius:5px;color:white;white-space:pre;font-family:monospace"></div>
	</div>
	 `;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    //this.shadowRoot.append(doc.body.firstChild);
    this.appendChild(doc.body.firstChild);
  }
  constructor() {
    super();
        // this.attachShadow({ mode: 'open' });
        // Create elements
        const wrapper = document.createElement('div');

        // Style the elements
        wrapper.style.padding = '10px';

        // Append elements to the shadow root
        // this.shadowRoot.append(wrapper);

  }
}
window.customElements.define('r2-wasm', RadareElement);

  const { WASI } = window.Runno;
  let script_name = "/script.r2";
  let script_r2_js = "";
  let script_r2 = '';
  function sample_r2() {
    script_name = "/script.r2";
    script_r2 = `?E Hello World
pd 10
 `
    document.getElementById("script").value = script_r2;
  }
  function sample_r2js() {
    script_name = "/script.r2.js";
    script_r2_js = `console.log(r2.cmd("x"));
 `
    const el = document.getElementById("script");
    el.value = script_r2_js;
  }
  function reset_any(id) {
    const div = document.getElementById("shell-"+id);
    div.innerHTML = '';
    const orig = document.getElementById("orig-"+id);
    const script = document.getElementById("script-"+id);
    script.value = orig.innerHTML;
  }
  function run_any(id, language) {
    const div = document.getElementById("shell-"+id);
    const el = document.getElementById("script-"+id);
    div.innerHTML = 'Loading...';
      run_wasm(id, language, el.value);
  }
  function run_js() {
	  script_name = "/script.r2.js";
	  const el = document.getElementById("script");
	  script_r2_js = el.value;
    	div = document.getElementById("shell");
    	div.innerHTML = 'Loading...';
	  run_wasm();
  }
  function run_r2() {
	  script_name = "/script.r2";
	  const el = document.getElementById("script");
	  script_r2 = el.value;
    	div = document.getElementById("shell");
    	div.innerHTML = 'Loading...';
	  run_wasm();
  }
var convert = new Convert();

function run_wasm(id, language, script) {
    	div = document.getElementById("shell-"+id);
    	div.innerHTML = '';
	const script_name = language === "r2js"? "/script.r2.js": "/script.r2";
	script_r2 = script;
	script_r2_js = script;
const result = WASI.start(fetch("radare2.wasm?v=5.8.8"), {
    //args: ["radare2", "-qescr.color=0", "-i", script_name, "some-file.txt"],
    args: ["radare2", "-qi", script_name, "some-file.txt"],
    env: { SOME_KEY: "some value" },
    stdout: (out) => {
    	div.innerHTML += convert.toHtml(out);
///console.log("stdout", out),
    },
    stderr: (err) => {
    console.error("stderr", err),
    	div.innerHTML += out;
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
}

