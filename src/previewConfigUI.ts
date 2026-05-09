import * as vscode from "vscode";
import * as path from "path";
import { getActiveJrxmlPath } from "./compiler";
import {
  type PreviewFormat,
  getPreviewConfig,
  setPreviewConfig,
  resolveFormat,
} from "./previewConfig";

const BROWSE_VALUE = "__browse__";

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
    value: BROWSE_VALUE,
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a data source for this report",
  });

  if (!selected) {
    return "cancelled";
  }

  if (selected.value === BROWSE_VALUE) {
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
  const defaultFormat = currentFormat ?? resolveFormat(undefined);

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
  const filePath = getActiveJrxmlPath();
  if (!filePath) return;

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
