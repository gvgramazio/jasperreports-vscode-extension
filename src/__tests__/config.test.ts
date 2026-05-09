import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  getClasspath,
  getJavaHome,
  getSourcePaths,
  getSchemaVersion,
  getCustomJrxmlSchemaPath,
  getCustomJrtxSchemaPath,
  isLiveReloadEnabled,
  getPreviewFormat,
  getExpressionEnterBehavior,
} from "../config";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockConfig(values: Record<string, unknown>) {
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
    get: vi.fn(
      (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    ),
    update: vi.fn(),
  } as unknown as vscode.WorkspaceConfiguration);
}

describe("config", () => {
  it("getClasspath returns configured classpath", () => {
    mockConfig({ classpath: ["/lib/jr.jar"] });
    expect(getClasspath()).toEqual(["/lib/jr.jar"]);
  });

  it("getClasspath returns empty array by default", () => {
    mockConfig({});
    expect(getClasspath()).toEqual([]);
  });

  it("getJavaHome returns trimmed configured value", () => {
    mockConfig({ "java.home": "  /usr/lib/jvm/java-17  " });
    expect(getJavaHome()).toBe("/usr/lib/jvm/java-17");
  });

  it("getJavaHome returns empty string by default", () => {
    mockConfig({});
    expect(getJavaHome()).toBe("");
  });

  it("getSourcePaths returns configured paths", () => {
    mockConfig({ "java.sourcePaths": ["/src/java"] });
    expect(getSourcePaths()).toEqual(["/src/java"]);
  });

  it("getSourcePaths returns empty array by default", () => {
    mockConfig({});
    expect(getSourcePaths()).toEqual([]);
  });

  it("getSchemaVersion returns configured version", () => {
    mockConfig({ "schema.version": "6.20.0" });
    expect(getSchemaVersion()).toBe("6.20.0");
  });

  it("getSchemaVersion returns 7.0.6 by default", () => {
    mockConfig({});
    expect(getSchemaVersion()).toBe("7.0.6");
  });

  it("getCustomJrxmlSchemaPath returns configured path", () => {
    mockConfig({ "schema.jrxmlPath": "/custom/jrxml.xsd" });
    expect(getCustomJrxmlSchemaPath()).toBe("/custom/jrxml.xsd");
  });

  it("getCustomJrtxSchemaPath returns configured path", () => {
    mockConfig({ "schema.jrtxPath": "/custom/jrtx.xsd" });
    expect(getCustomJrtxSchemaPath()).toBe("/custom/jrtx.xsd");
  });

  it("isLiveReloadEnabled returns true when enabled", () => {
    mockConfig({ "preview.liveReload": true });
    expect(isLiveReloadEnabled()).toBe(true);
  });

  it("isLiveReloadEnabled returns false by default", () => {
    mockConfig({});
    expect(isLiveReloadEnabled()).toBe(false);
  });

  it("getPreviewFormat returns configured format", () => {
    mockConfig({ "preview.format": "pdf" });
    expect(getPreviewFormat()).toBe("pdf");
  });

  it("getPreviewFormat returns html by default", () => {
    mockConfig({});
    expect(getPreviewFormat()).toBe("html");
  });

  it("getExpressionEnterBehavior returns configured value", () => {
    mockConfig({ "expression.enterBehavior": "newline" });
    expect(getExpressionEnterBehavior()).toBe("newline");
  });

  it("getExpressionEnterBehavior returns commit by default", () => {
    mockConfig({});
    expect(getExpressionEnterBehavior()).toBe("commit");
  });

  it("reads from jasperreports configuration section", () => {
    mockConfig({});
    getClasspath();
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
      "jasperreports",
    );
  });
});
