import * as vscode from "vscode";
import type { PreviewFormat } from "./previewConfig";

const SECTION = "jasperreports";

function cfg(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(SECTION);
}

export function getClasspath(): string[] {
  return cfg().get<string[]>("classpath", []);
}

export function getJavaHome(): string {
  return cfg().get<string>("java.home", "").trim();
}

export function getSourcePaths(): string[] {
  return cfg().get<string[]>("java.sourcePaths", []);
}

export function getSchemaVersion(): string {
  return cfg().get<string>("schema.version", "7.0.6");
}

export function getCustomJrxmlSchemaPath(): string {
  return cfg().get<string>("schema.jrxmlPath", "");
}

export function getCustomJrtxSchemaPath(): string {
  return cfg().get<string>("schema.jrtxPath", "");
}

export function isLiveReloadEnabled(): boolean {
  return cfg().get<boolean>("preview.liveReload", false);
}

export function getPreviewFormat(): PreviewFormat {
  return cfg().get<PreviewFormat>("preview.format", "html");
}
