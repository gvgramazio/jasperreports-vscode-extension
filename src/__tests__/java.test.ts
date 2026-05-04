import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  resolveJavaExecutable,
  resolveJavacExecutable,
  validateJava,
  validateJavac,
} from "../java";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "child_process";

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

describe("validateJava", () => {
  it("returns ok with version on success", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          'openjdk version "17.0.2" 2022-01-18\nOpenJDK Runtime',
        );
        return undefined as never;
      },
    );

    const result = await validateJava("/usr/bin/java");
    expect(result).toEqual({
      ok: true,
      version: 'openjdk version "17.0.2" 2022-01-18',
    });
  });

  it("returns error when execFile fails", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("ENOENT"),
          "",
          "",
        );
        return undefined as never;
      },
    );

    const result = await validateJava("/missing/java");
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Cannot run '/missing/java'"),
    });
  });

  it("returns 'unknown' when stderr is empty", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "",
        );
        return undefined as never;
      },
    );

    const result = await validateJava("/usr/bin/java");
    expect(result).toEqual({ ok: true, version: "" });
  });
});

describe("resolveJavacExecutable", () => {
  it("returns configured java.home path with javac", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "java.home") return "/custom/jdk";
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    expect(resolveJavacExecutable()).toBe("/custom/jdk/bin/javac");
  });

  it("returns JAVA_HOME javac when setting is empty", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.stubEnv("JAVA_HOME", "/env/jdk");

    expect(resolveJavacExecutable()).toBe("/env/jdk/bin/javac");
  });

  it("falls back to 'javac' when no config or env is set", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.stubEnv("JAVA_HOME", "");

    expect(resolveJavacExecutable()).toBe("javac");
  });
});

describe("validateJavac", () => {
  it("returns ok on success", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "",
          "javac 17.0.2",
        );
        return undefined as never;
      },
    );

    const result = await validateJavac("/usr/bin/javac");
    expect(result).toEqual({ ok: true });
  });

  it("returns error when javac is not found", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("ENOENT"),
          "",
          "",
        );
        return undefined as never;
      },
    );

    const result = await validateJavac("/missing/javac");
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("JDK required"),
    });
  });
});
