import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";
import { resolveJavaExecutable, validateJava } from "./java";
import { buildClasspath } from "./compiler";
import { getOutputChannel } from "./logger";
import {
  type PreviewFormat,
  getPreviewConfig,
  setPreviewConfig,
  resolveFormat,
  promptDataSource,
} from "./previewConfig";

const PREVIEW_PANEL_TYPE = "jasperreportsPreview";

let currentPanel: vscode.WebviewPanel | undefined;
let liveReloadDisposable: vscode.Disposable | undefined;

export async function previewReport(
  context: vscode.ExtensionContext,
  viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active,
  jrxmlPath?: string,
): Promise<void> {
  const filePath =
    jrxmlPath ?? vscode.window.activeTextEditor?.document.fileName;
  if (!filePath || !filePath.endsWith(".jrxml")) {
    vscode.window.showErrorMessage(
      "No .jrxml file is open. Open a JRXML file and try again.",
    );
    return;
  }

  // Resolve Java
  const javaPath = resolveJavaExecutable();
  if (!javaPath) {
    vscode.window.showErrorMessage(
      "Java not found. Set 'jasperreports.java.home' or install Java.",
    );
    return;
  }

  const javaResult = await validateJava(javaPath);
  if (!javaResult.ok) {
    vscode.window.showErrorMessage(javaResult.error);
    return;
  }

  // Build classpath
  const classpath = buildClasspath(context.extensionPath);
  if (!classpath) {
    const action = await vscode.window.showErrorMessage(
      "JasperReports classpath is not configured. Set 'jasperreports.classpath' in settings.",
      "Open Settings",
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "jasperreports.classpath",
      );
    }
    return;
  }

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
  channel.appendLine(`  Java: ${javaPath} (${javaResult.version})`);
  channel.appendLine(`  File: ${filePath}`);
  if (dataSourcePath) {
    channel.appendLine(`  Data source: ${dataSourcePath}`);
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Previewing ${fileName}`,
      cancellable: false,
    },
    async () => {
      const output = await runPreview(
        javaPath,
        classpath,
        filePath,
        format,
        dataSourcePath,
      );
      showPreviewPanel(fileName, output, format, viewColumn);
    },
  );

  setupLiveReload(context, filePath, viewColumn);
}

function runPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  format: PreviewFormat,
  dataSourcePath?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const ext = format === "pdf" ? "pdf" : "html";
    const outputFile = path.join(tmpDir, `jr-preview-${Date.now()}.${ext}`);

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

    execFile(javaPath, args, { cwd }, (err, stdout, stderr) => {
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
        reject(new Error(errorMsg.split("\n")[0]));
        return;
      }

      try {
        if (format === "pdf") {
          const pdfBytes = fs.readFileSync(outputFile);
          fs.unlinkSync(outputFile);
          channel.appendLine(`OK → preview rendered (${format})`);
          resolve(pdfBytes.toString("base64"));
        } else {
          const html = fs.readFileSync(outputFile, "utf-8");
          fs.unlinkSync(outputFile);
          channel.appendLine(`OK → preview rendered (${format})`);
          resolve(html);
        }
      } catch (readErr) {
        channel.appendLine(`FAILED: Failed to read preview output: ${readErr}`);
        channel.show(true);
        reject(new Error(`Failed to read preview output: ${readErr}`));
      }
    });
  });
}

function showPreviewPanel(
  fileName: string,
  content: string,
  format: PreviewFormat,
  column: vscode.ViewColumn,
): void {
  const html = format === "pdf" ? wrapPdf(content) : wrapHtml(content);

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
    },
  );

  currentPanel.webview.html = html;

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
    disposeLiveReload();
  });
}

function wrapHtml(jasperHtml: string): string {
  return jasperHtml.replace(
    "</head>",
    `<style>
      body { margin: 0; padding: 16px; background: white; }
    </style>
    </head>`,
  );
}

function wrapPdf(base64Pdf: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;overflow:hidden;">
  <object data="data:application/pdf;base64,${base64Pdf}"
    type="application/pdf"
    style="width:100%;height:100vh;">
    <p>PDF preview is not supported in this environment.
       Use the "Configure Preview" command to switch to HTML format.</p>
  </object>
</body>
</html>`;
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

function disposeLiveReload(): void {
  liveReloadDisposable?.dispose();
  liveReloadDisposable = undefined;
}

export function disposePreviewPanel(): void {
  currentPanel?.dispose();
  currentPanel = undefined;
  disposeLiveReload();
}
