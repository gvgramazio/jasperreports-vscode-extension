import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { resolveMvnExecutable } from "../dependencies";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    mkdtempSync: vi.fn(() => "/tmp/jr-deps-mock"),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

import { execFile } from "child_process";
import * as fs from "fs";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveMvnExecutable", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MAVEN_HOME;
    delete process.env.M2_HOME;
  });

  it("returns mvn on PATH when no env vars are set", () => {
    expect(resolveMvnExecutable()).toBe("mvn");
  });

  it("uses MAVEN_HOME when set", () => {
    process.env.MAVEN_HOME = "/opt/maven";
    expect(resolveMvnExecutable()).toContain("/opt/maven/bin/mvn");
  });

  it("uses M2_HOME when MAVEN_HOME is not set", () => {
    process.env.M2_HOME = "/opt/m2";
    expect(resolveMvnExecutable()).toContain("/opt/m2/bin/mvn");
  });

  it("prefers MAVEN_HOME over M2_HOME", () => {
    process.env.MAVEN_HOME = "/opt/maven";
    process.env.M2_HOME = "/opt/m2";
    expect(resolveMvnExecutable()).toContain("/opt/maven/bin/mvn");
  });
});

describe("downloadDependencies", () => {
  it("shows error when no workspace is open", async () => {
    vi.mocked(vscode.workspace).workspaceFolders = undefined;

    const { downloadDependencies } = await import("../dependencies");
    await downloadDependencies();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("No workspace folder"),
    );
  });

  it("downloads successfully and updates classpath", async () => {
    vi.mocked(vscode.workspace).workspaceFolders = [
      {
        uri: { fsPath: "/workspace" } as unknown as vscode.Uri,
        name: "ws",
        index: 0,
      },
    ];

    const mockGet = vi.fn((key: string, defaultValue?: unknown) => {
      if (key === "schema.version") return "7.0.6";
      if (key === "classpath") return [];
      return defaultValue;
    });
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    } as unknown as vscode.WorkspaceConfiguration);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    const { downloadDependencies } = await import("../dependencies");
    await downloadDependencies();

    // Verify Maven was called
    expect(execFile).toHaveBeenCalled();
    // Verify temp pom was written with all required dependencies
    const pomContent = vi
      .mocked(fs.writeFileSync)
      .mock.calls.find((call) =>
        (call[0] as string).includes("pom.xml"),
      )?.[1] as string;
    expect(pomContent).toBeDefined();
    for (const dep of [
      "jasperreports",
      "jasperreports-barcode4j",
      "jasperreports-charts",
      "jasperreports-data-adapters",
      "jasperreports-excel-poi",
      "jasperreports-fonts",
      "jasperreports-functions",
      "jasperreports-jdt",
      "jasperreports-json",
      "jasperreports-pdf",
      "jasperreports-xalan",
    ]) {
      expect(pomContent).toContain(`<artifactId>${dep}</artifactId>`);
    }
    // Verify temp dir was cleaned up
    expect(fs.rmSync).toHaveBeenCalled();
    // Verify classpath was updated
    expect(mockUpdate).toHaveBeenCalledWith(
      "classpath",
      expect.arrayContaining([expect.stringContaining(".jasperreports")]),
      vscode.ConfigurationTarget.Workspace,
    );
    // Verify success message
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("downloaded"),
    );
  });

  it("does not duplicate classpath when glob already exists", async () => {
    vi.mocked(vscode.workspace).workspaceFolders = [
      {
        uri: { fsPath: "/workspace" } as unknown as vscode.Uri,
        name: "ws",
        index: 0,
      },
    ];

    const existingGlob = "/workspace/.jasperreports/*";
    const mockGet = vi.fn((key: string, defaultValue?: unknown) => {
      if (key === "schema.version") return "7.0.6";
      if (key === "classpath") return [existingGlob];
      return defaultValue;
    });
    const mockUpdate = vi.fn();
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    } as unknown as vscode.WorkspaceConfiguration);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    const { downloadDependencies } = await import("../dependencies");
    await downloadDependencies();

    // classpath should not be updated since glob already present
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when Maven fails", async () => {
    vi.mocked(vscode.workspace).workspaceFolders = [
      {
        uri: { fsPath: "/workspace" } as unknown as vscode.Uri,
        name: "ws",
        index: 0,
      },
    ];

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "schema.version") return "7.0.6";
        if (key === "classpath") return [];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "BUILD FAILURE\nDetails...",
        );
        return undefined as never;
      },
    );

    // withProgress will invoke the task, which calls runMavenDownload, which rejects
    vi.mocked(vscode.window.withProgress).mockImplementation((async (
      _opts: unknown,
      task: (progress: unknown) => Promise<unknown>,
    ) => {
      await expect(task({ report: vi.fn() })).rejects.toThrow("Maven failed");
    }) as unknown as typeof vscode.window.withProgress);

    const { downloadDependencies } = await import("../dependencies");
    await downloadDependencies();

    // Verify cleanup happened
    expect(fs.rmSync).toHaveBeenCalled();
  });
});
