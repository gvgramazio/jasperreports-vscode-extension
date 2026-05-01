import * as vscode from "vscode";
import * as path from "path";

export type PreviewFormat = "html" | "pdf";

export interface PreviewFileConfig {
  dataSourcePath?: string;
  format?: PreviewFormat;
}

const STORAGE_KEY = "jasperreports.previewConfigs";

type ConfigMap = Record<string, PreviewFileConfig>;

function toRelativePath(absolutePath: string): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    return path.relative(folder.uri.fsPath, absolutePath);
  }
  return absolutePath;
}

function getConfigMap(context: vscode.ExtensionContext): ConfigMap {
  return context.workspaceState.get<ConfigMap>(STORAGE_KEY) ?? {};
}

export function getPreviewConfig(
  context: vscode.ExtensionContext,
  jrxmlPath: string,
): PreviewFileConfig | undefined {
  const key = toRelativePath(jrxmlPath);
  return getConfigMap(context)[key];
}

export async function setPreviewConfig(
  context: vscode.ExtensionContext,
  jrxmlPath: string,
  config: PreviewFileConfig,
): Promise<void> {
  const key = toRelativePath(jrxmlPath);
  const map = getConfigMap(context);
  map[key] = config;
  await context.workspaceState.update(STORAGE_KEY, map);
}

export async function clearPreviewConfig(
  context: vscode.ExtensionContext,
  jrxmlPath: string,
): Promise<void> {
  const key = toRelativePath(jrxmlPath);
  const map = getConfigMap(context);
  delete map[key];
  await context.workspaceState.update(STORAGE_KEY, map);
}

export function getDefaultFormat(): PreviewFormat {
  const config = vscode.workspace.getConfiguration("jasperreports");
  return config.get<PreviewFormat>("preview.format", "html");
}

export function resolveFormat(
  fileConfig: PreviewFileConfig | undefined,
): PreviewFormat {
  return fileConfig?.format ?? getDefaultFormat();
}

interface DataSourceItem extends vscode.QuickPickItem {
  value: string | undefined;
}

export async function promptDataSource(
  currentPath?: string,
): Promise<string | undefined | "cancelled"> {
  const items: DataSourceItem[] = [
    {
      label: "$(clear-all) Empty Data Source",
      description: "Fill report with no data",
      value: undefined,
      picked: !currentPath,
    },
  ];

  if (currentPath) {
    items.push({
      label: `$(file) ${path.basename(currentPath)}`,
      description: currentPath,
      value: currentPath,
      picked: true,
    });
  }

  items.push({
    label: "$(folder-opened) Choose file...",
    description: "Select a JSON, CSV, or XML data source file",
    value: "__browse__",
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a data source for this report",
  });

  if (!selected) {
    return "cancelled";
  }

  if (selected.value === "__browse__") {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { "Data Source Files": ["json", "csv", "xml"] },
      title: "Select Data Source File",
    });
    if (!uris || uris.length === 0) {
      return "cancelled";
    }
    return uris[0].fsPath;
  }

  return selected.value;
}

interface FormatItem extends vscode.QuickPickItem {
  value: PreviewFormat;
}

export async function promptFormat(
  currentFormat?: PreviewFormat,
): Promise<PreviewFormat | "cancelled"> {
  const defaultFormat = currentFormat ?? getDefaultFormat();

  const items: FormatItem[] = [
    {
      label: "HTML",
      description: "Preview as HTML in a webview panel",
      value: "html",
      picked: defaultFormat === "html",
    },
    {
      label: "PDF",
      description: "Preview as PDF in a webview panel",
      value: "pdf",
      picked: defaultFormat === "pdf",
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select export format",
  });

  if (!selected) {
    return "cancelled";
  }

  return selected.value;
}

export async function configurePreview(
  context: vscode.ExtensionContext,
): Promise<void> {
  const filePath = vscode.window.activeTextEditor?.document.fileName;
  if (!filePath || !filePath.endsWith(".jrxml")) {
    vscode.window.showErrorMessage(
      "No .jrxml file is open. Open a JRXML file and try again.",
    );
    return;
  }

  const existing = getPreviewConfig(context, filePath);

  const dataSource = await promptDataSource(existing?.dataSourcePath);
  if (dataSource === "cancelled") {
    return;
  }

  const format = await promptFormat(existing?.format);
  if (format === "cancelled") {
    return;
  }

  await setPreviewConfig(context, filePath, {
    dataSourcePath: dataSource,
    format,
  });

  vscode.window.showInformationMessage(
    `Preview configured: ${format.toUpperCase()}, ${dataSource ? path.basename(dataSource) : "empty data source"}.`,
  );
}
