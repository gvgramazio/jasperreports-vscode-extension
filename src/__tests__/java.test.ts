import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { resolveJavaExecutable } from "../java";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("resolveJavaExecutable", () => {
  it("returns configured java.home path when set", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "java.home") return "/custom/jdk";
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    expect(resolveJavaExecutable()).toBe("/custom/jdk/bin/java");
  });

  it("returns JAVA_HOME path when setting is empty", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.stubEnv("JAVA_HOME", "/env/jdk");

    expect(resolveJavaExecutable()).toBe("/env/jdk/bin/java");
  });

  it("falls back to 'java' when no config or env is set", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.stubEnv("JAVA_HOME", "");

    expect(resolveJavaExecutable()).toBe("java");
  });

  it("ignores whitespace-only java.home", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "java.home") return "   ";
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.stubEnv("JAVA_HOME", "");

    expect(resolveJavaExecutable()).toBe("java");
  });
});
