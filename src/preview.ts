import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";
import { resolveActiveJrxmlPath, resolveJavaEnv } from "./compiler";
import { cleanupTempDir } from "./java-sources";
import { getOutputChannel } from "./logger";
import {
  type PreviewFormat,
  getPreviewConfig,
  setPreviewConfig,
  resolveFormat,
} from "./previewConfig";
import { promptDataSource } from "./previewConfigUI";

const PREVIEW_PANEL_TYPE = "jasperreportsPreview";

let currentPanel: vscode.WebviewPanel | undefined;
let liveReloadDisposable: vscode.Disposable | undefined;

export async function previewReport(
  context: vscode.ExtensionContext,
  viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active,
  jrxmlPath?: string,
): Promise<void> {
  const filePath = resolveActiveJrxmlPath(jrxmlPath);
  if (!filePath) return;

  const env = await resolveJavaEnv(context.extensionPath);
  if (!env) return;

  // Resolve per-file config
  let fileConfig = getPreviewConfig(context, filePath);
  if (!fileConfig) {
    const dataSource = await promptDataSource();
    if (dataSource === "cancelled") {
      return;
    }
    fileConfig = { dataSourcePath: dataSource };
    await setPreviewConfig(context, filePath, fileConfig);
  }

  const format = resolveFormat(fileConfig);
  const dataSourcePath = fileConfig.dataSourcePath;
  const fileName = path.basename(filePath);

  const channel = getOutputChannel();
  channel.appendLine(`Previewing ${fileName} (${format})...`);
  channel.appendLine(`  Java: ${env.javaPath} (${env.javaVersion})`);
  channel.appendLine(`  File: ${filePath}`);
  if (dataSourcePath) {
    channel.appendLine(`  Data source: ${dataSourcePath}`);
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Previewing ${fileName}`,
        cancellable: false,
      },
      async () => {
        if (format === "pdf") {
          const pdfPath = await runPdfPreview(
            env.javaPath,
            env.classpath,
            filePath,
            dataSourcePath,
          );
          if (pdfPath) {
            const uri = vscode.Uri.file(pdfPath);
            await vscode.commands.executeCommand("vscode.open", uri, {
              viewColumn,
              preview: true,
            });
          }
        } else {
          const output = await runPreview(
            env.javaPath,
            env.classpath,
            filePath,
            format,
            dataSourcePath,
          );
          if (output !== undefined) {
            showPreviewPanel(fileName, output, format, viewColumn);
          }
        }
      },
    );
  } finally {
    if (env.tempClassDir) {
      cleanupTempDir(env.tempClassDir);
    }
  }

  setupLiveReload(context, filePath, viewColumn);
}

function runPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  format: PreviewFormat,
  dataSourcePath?: string,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const outputFile = path.join(tmpDir, `jr-preview-${Date.now()}.html`);

    const args = [
      "-cp",
      classpath,
      "JrCompiler",
      "preview",
      jrxmlPath,
      outputFile,
      format,
    ];
    if (dataSourcePath) {
      args.push(dataSourcePath);
    }

    const cwd = path.dirname(jrxmlPath);

    execFile(
      javaPath,
      args,
      { cwd, timeout: 60_000 },
      (err, stdout, stderr) => {
        const channel = getOutputChannel();
        if (stdout) {
          channel.appendLine(stdout);
        }
        if (stderr) {
          channel.appendLine(stderr);
        }

        if (err) {
          const errorMsg = stderr || err.message;
          channel.appendLine(`FAILED: ${errorMsg}`);
          channel.show(true);
          cleanupTempFile(outputFile);
          vscode.window.showErrorMessage(
            `Preview failed: ${errorMsg.split("\n")[0]}`,
          );
          resolve(undefined);
          return;
        }

        try {
          const html = fs.readFileSync(outputFile, "utf-8");
          fs.unlinkSync(outputFile);
          channel.appendLine(`OK → preview rendered (${format})`);
          resolve(html);
        } catch (readErr) {
          channel.appendLine(
            `FAILED: Failed to read preview output: ${readErr}`,
          );
          channel.show(true);
          vscode.window.showErrorMessage(
            `Failed to read preview output: ${readErr}`,
          );
          resolve(undefined);
        }
      },
    );
  });
}

function runPdfPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  dataSourcePath?: string,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const outputFile = path.join(tmpDir, `jr-preview-${Date.now()}.pdf`);

    const args = [
      "-cp",
      classpath,
      "JrCompiler",
      "preview",
      jrxmlPath,
      outputFile,
      "pdf",
    ];
    if (dataSourcePath) {
      args.push(dataSourcePath);
    }

    const cwd = path.dirname(jrxmlPath);

    execFile(
      javaPath,
      args,
      { cwd, timeout: 60_000 },
      (err, stdout, stderr) => {
        const channel = getOutputChannel();
        if (stdout) {
          channel.appendLine(stdout);
        }
        if (stderr) {
          channel.appendLine(stderr);
        }

        if (err) {
          const errorMsg = stderr || err.message;
          channel.appendLine(`FAILED: ${errorMsg}`);
          channel.show(true);
          cleanupTempFile(outputFile);
          vscode.window.showErrorMessage(
            `Preview failed: ${errorMsg.split("\n")[0]}`,
          );
          resolve(undefined);
          return;
        }

        if (!fs.existsSync(outputFile)) {
          channel.appendLine("FAILED: PDF output file was not created");
          channel.show(true);
          vscode.window.showErrorMessage("PDF output file was not created");
          resolve(undefined);
          return;
        }

        channel.appendLine("OK → preview rendered (pdf)");
        resolve(outputFile);
      },
    );
  });
}

function showPreviewPanel(
  fileName: string,
  content: string,
  format: PreviewFormat,
  column: vscode.ViewColumn,
): void {
  const html = wrapHtml(content);

  if (currentPanel) {
    currentPanel.title = `Preview: ${fileName}`;
    currentPanel.webview.html = html;
    currentPanel.reveal(column);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    PREVIEW_PANEL_TYPE,
    `Preview: ${fileName}`,
    column,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [],
    },
  );

  currentPanel.webview.html = html;

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
    disposeLiveReload();
  });
}

function wrapHtml(jasperHtml: string): string {
  const style = `<style>
      body { margin: 0; padding: 16px; background: white; }
    </style>`;

  if (jasperHtml.includes("</head>")) {
    return jasperHtml.replace("</head>", `${style}\n    </head>`);
  }
  return `${style}\n${jasperHtml}`;
}

function setupLiveReload(
  context: vscode.ExtensionContext,
  filePath: string,
  viewColumn: vscode.ViewColumn,
): void {
  disposeLiveReload();

  const config = vscode.workspace.getConfiguration("jasperreports");
  if (!config.get<boolean>("preview.liveReload", false)) {
    return;
  }

  liveReloadDisposable = vscode.workspace.onDidSaveTextDocument((doc) => {
    if (doc.fileName === filePath && currentPanel) {
      previewReport(context, viewColumn, filePath);
    }
  });
  context.subscriptions.push(liveReloadDisposable);
}

function cleanupTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // File may not exist if the process failed before writing
  }
}

function disposeLiveReload(): void {
  liveReloadDisposable?.dispose();
  liveReloadDisposable = undefined;
}

export function disposePreviewPanel(): void {
  currentPanel?.dispose();
  currentPanel = undefined;
  disposeLiveReload();
}
