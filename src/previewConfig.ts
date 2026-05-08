import * as vscode from "vscode";
import * as path from "path";
import { getPreviewFormat } from "./config";

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

function getDefaultFormat(): PreviewFormat {
  return getPreviewFormat();
}

export function resolveFormat(
  fileConfig: PreviewFileConfig | undefined,
): PreviewFormat {
  return fileConfig?.format ?? getDefaultFormat();
}
