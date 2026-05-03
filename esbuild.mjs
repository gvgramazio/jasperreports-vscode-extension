import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const extensionOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node22",
  sourcemap: true,
  minify: false,
};

/** @type {esbuild.BuildOptions} */
const webviewOptions = {
  entryPoints: ["src/properties/webview-main.ts"],
  bundle: true,
  outfile: "dist/webview-properties.js",
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  minify: true,
};

if (watch) {
  const extCtx = await esbuild.context(extensionOptions);
  const webCtx = await esbuild.context(webviewOptions);
  await Promise.all([extCtx.watch(), webCtx.watch()]);
  console.log("Watching for changes...");
} else {
  await Promise.all([
    esbuild.build(extensionOptions),
    esbuild.build(webviewOptions),
  ]);
  console.log("Build complete.");
}
