import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { resolveActiveJrxmlPath, resolveJavaEnv } from "./compiler";
import { cleanupTempDir } from "./java-sources";
import { getOutputChannel } from "./logger";
import { runJava } from "./java-runner";
import {
  type PreviewFormat,
  getPreviewConfig,
  setPreviewConfig,
  resolveFormat,
} from "./previewConfig";
import { promptDataSource } from "./previewConfigUI";

const PREVIEW_PANEL_TYPE = "jasperreportsPreview";

export class PreviewManager implements vscode.Disposable {
  private currentPanel: vscode.WebviewPanel | undefined;
  private liveReloadDisposable: vscode.Disposable | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async preview(
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active,
    jrxmlPath?: string,
  ): Promise<void> {
    const filePath = resolveActiveJrxmlPath(jrxmlPath);
    if (!filePath) return;

    const env = await resolveJavaEnv(this.context.extensionPath);
    if (!env) return;

    // Resolve per-file config
    let fileConfig = getPreviewConfig(this.context, filePath);
    if (!fileConfig) {
      const dataSource = await promptDataSource();
      if (dataSource === "cancelled") {
        return;
      }
      fileConfig = { dataSourcePath: dataSource };
      await setPreviewConfig(this.context, filePath, fileConfig);
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
              this.showPanel(fileName, output, viewColumn);
            }
          }
        },
      );
    } finally {
      if (env.tempClassDir) {
        cleanupTempDir(env.tempClassDir);
      }
    }

    this.setupLiveReload(filePath, viewColumn);
  }

  dispose(): void {
    this.currentPanel?.dispose();
    this.currentPanel = undefined;
    this.disposeLiveReload();
  }

  private showPanel(
    fileName: string,
    content: string,
    column: vscode.ViewColumn,
  ): void {
    const html = wrapHtml(content);

    if (this.currentPanel) {
      this.currentPanel.title = `Preview: ${fileName}`;
      this.currentPanel.webview.html = html;
      this.currentPanel.reveal(column);
      return;
    }

    this.currentPanel = vscode.window.createWebviewPanel(
      PREVIEW_PANEL_TYPE,
      `Preview: ${fileName}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );

    this.currentPanel.webview.html = html;

    this.currentPanel.onDidDispose(() => {
      this.currentPanel = undefined;
      this.disposeLiveReload();
    });
  }

  private setupLiveReload(
    filePath: string,
    viewColumn: vscode.ViewColumn,
  ): void {
    this.disposeLiveReload();

    const config = vscode.workspace.getConfiguration("jasperreports");
    if (!config.get<boolean>("preview.liveReload", false)) {
      return;
    }

    this.liveReloadDisposable = vscode.workspace.onDidSaveTextDocument(
      (doc) => {
        if (doc.fileName === filePath && this.currentPanel) {
          this.preview(viewColumn, filePath);
        }
      },
    );
    this.context.subscriptions.push(this.liveReloadDisposable);
  }

  private disposeLiveReload(): void {
    this.liveReloadDisposable?.dispose();
    this.liveReloadDisposable = undefined;
  }
}

async function runPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  format: PreviewFormat,
  dataSourcePath?: string,
): Promise<string | undefined> {
  const tmpDir = os.tmpdir();
  const outputFile = path.join(tmpDir, `jr-preview-${Date.now()}.html`);

  const args = ["JrCompiler", "preview", jrxmlPath, outputFile, format];
  if (dataSourcePath) {
    args.push(dataSourcePath);
  }

  const result = await runJava({
    javaPath,
    classpath,
    args,
    cwd: path.dirname(jrxmlPath),
  });

  if (!result.ok) {
    cleanupTempFile(outputFile);
    vscode.window.showErrorMessage(`Preview failed: ${result.error}`);
    return undefined;
  }

  try {
    const html = fs.readFileSync(outputFile, "utf-8");
    fs.unlinkSync(outputFile);
    const channel = getOutputChannel();
    channel.appendLine(`OK → preview rendered (${format})`);
    return html;
  } catch (readErr) {
    const channel = getOutputChannel();
    channel.appendLine(`FAILED: Failed to read preview output: ${readErr}`);
    channel.show(true);
    vscode.window.showErrorMessage(`Failed to read preview output: ${readErr}`);
    return undefined;
  }
}

async function runPdfPreview(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  dataSourcePath?: string,
): Promise<string | undefined> {
  const tmpDir = os.tmpdir();
  const outputFile = path.join(tmpDir, `jr-preview-${Date.now()}.pdf`);

  const args = ["JrCompiler", "preview", jrxmlPath, outputFile, "pdf"];
  if (dataSourcePath) {
    args.push(dataSourcePath);
  }

  const result = await runJava({
    javaPath,
    classpath,
    args,
    cwd: path.dirname(jrxmlPath),
  });

  if (!result.ok) {
    cleanupTempFile(outputFile);
    vscode.window.showErrorMessage(`Preview failed: ${result.error}`);
    return undefined;
  }

  if (!fs.existsSync(outputFile)) {
    const channel = getOutputChannel();
    channel.appendLine("FAILED: PDF output file was not created");
    channel.show(true);
    vscode.window.showErrorMessage("PDF output file was not created");
    return undefined;
  }

  const channel = getOutputChannel();
  channel.appendLine("OK → preview rendered (pdf)");
  return outputFile;
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

function cleanupTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // File may not exist if the process failed before writing
  }
}
