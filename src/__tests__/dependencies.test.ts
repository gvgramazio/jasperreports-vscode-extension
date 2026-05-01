import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { resolveMvnExecutable } from "../dependencies";

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
});
