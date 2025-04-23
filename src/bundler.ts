import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

await esbuild.build({
  // entryPoints: ["r2wasm.ts", "ansi2html.ts"],
  entryPoints: [Deno.args[0]],
  // entryPoints: ["r2wasm.ts"],
  bundle: true,
  format: "iife",
  //  format: "esm",
  target: "es2017",
  platform: "browser",
  outdir: "dist", // "out.js",
  globalName: Deno.args[1], // "r2wasm",
  minify: true,
  // treeShaking: false,
  //  keepNames: true,
  //  plugins: [...denoPlugins()],
  tsconfigRaw: {
    compilerOptions: {
      lib: ["dom"],
    },
  },
});

esbuild.stop();
