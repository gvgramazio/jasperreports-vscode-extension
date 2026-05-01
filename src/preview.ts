import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";
import { resolveJavaExecutable, validateJava } from "./java";
import { buildClasspath } from "./compiler";

const PREVIEW_PANEL_TYPE = "jasperreportsPreview";

let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Compiles a .jrxml, fills with an empty data source, exports to HTML,
 * and displays the result in a VS Code webview panel.
 */
export async function previewReport(
  extensionPath: string,
  jrxmlPath?: string,
): Promise<void> {
  // Resolve the file to preview
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
  const classpath = buildClasspath(extensionPath);
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

  const fileName = path.basename(filePath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Previewing ${fileName}`,
      cancellable: false,
    },
    async () => {
      const htmlContent = await runPreview(javaPath, classpath, filePath);
      showPreviewPanel(fileName, htmlContent);
    },
  );
}

function runPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use a temp file for the HTML output
    const tmpDir = os.tmpdir();
    const outputHtml = path.join(tmpDir, `jr-preview-${Date.now()}.html`);

    const args = [
      "-cp",
      classpath,
      "JrCompiler",
      "preview",
      jrxmlPath,
      outputHtml,
    ];
    const cwd = path.dirname(jrxmlPath);

    execFile(javaPath, args, { cwd }, (err, _stdout, stderr) => {
      if (err) {
        const errorMsg = stderr || err.message;
        reject(new Error(errorMsg.split("\n")[0]));
        return;
      }

      try {
        const html = fs.readFileSync(outputHtml, "utf-8");
        // Clean up temp file
        fs.unlinkSync(outputHtml);
        resolve(html);
      } catch (readErr) {
        reject(new Error(`Failed to read preview output: ${readErr}`));
      }
    });
  });
}

function showPreviewPanel(fileName: string, htmlContent: string): void {
  const column = vscode.ViewColumn.Beside;

  if (currentPanel) {
    currentPanel.title = `Preview: ${fileName}`;
    currentPanel.webview.html = wrapHtml(htmlContent);
    currentPanel.reveal(column);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    PREVIEW_PANEL_TYPE,
    `Preview: ${fileName}`,
    column,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    },
  );

  currentPanel.webview.html = wrapHtml(htmlContent);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

/**
 * Wraps JasperReports HTML output in a minimal document with
 * a white background and basic styling for the webview.
 */
function wrapHtml(jasperHtml: string): string {
  // JasperReports exportReportToHtmlFile produces a full HTML document.
  // We inject a small style override for the webview context.
  return jasperHtml.replace(
    "</head>",
    `<style>
      body { margin: 0; padding: 16px; background: white; }
    </style>
    </head>`,
  );
}

export function disposePreviewPanel(): void {
  currentPanel?.dispose();
  currentPanel = undefined;
}
