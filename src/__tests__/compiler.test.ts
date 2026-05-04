import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { buildClasspath } from "../compiler";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("../java", () => ({
  resolveJavaExecutable: vi.fn(),
  validateJava: vi.fn(),
}));

vi.mock("../java-sources", () => ({
  compileJavaSources: vi.fn(),
  cleanupTempDir: vi.fn(),
}));

import { execFile } from "child_process";
import { resolveJavaExecutable, validateJava } from "../java";
import { compileJavaSources, cleanupTempDir } from "../java-sources";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildClasspath", () => {
  it("returns undefined when classpath is empty", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    expect(buildClasspath("/ext")).toBeUndefined();
  });

  it("includes jr-compiler.jar and user paths", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/libs/jr.jar", "/libs/dep.jar"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const cp = buildClasspath("/ext");
    expect(cp).toContain("jr-compiler.jar");
    expect(cp).toContain("/libs/jr.jar");
    expect(cp).toContain("/libs/dep.jar");
  });

  it("uses platform-specific separator", () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/a.jar", "/b.jar"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const cp = buildClasspath("/ext")!;
    const separator = process.platform === "win32" ? ";" : ":";
    const parts = cp.split(separator);
    expect(parts).toHaveLength(3); // jr-compiler.jar + 2 user paths
  });
});

describe("compileReport", () => {
  it("shows error when no jrxml file is open", async () => {
    vscode.window.activeTextEditor = undefined;

    const { compileReport } = await import("../compiler");
    await compileReport("/ext");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("shows error when active file is not jrxml", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/file.xml" },
    };

    const { compileReport } = await import("../compiler");
    await compileReport("/ext");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("shows error when Java is not found", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue(undefined);

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Java not found"),
    );
  });

  it("shows error when Java validation fails", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: false,
      error: "Cannot run '/usr/bin/java': ENOENT",
    });

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Cannot run"),
    );
  });

  it("shows error when classpath is not configured", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("classpath is not configured"),
      "Open Settings",
    );
  });

  it("opens settings when user clicks 'Open Settings' on classpath error", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);
    vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(
      "Open Settings" as never,
    );

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "workbench.action.openSettings",
      "jasperreports.classpath",
    );
  });

  it("compiles successfully and shows info message", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/libs/jr.jar"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "Compiled OK",
          "",
        );
        return undefined as never;
      },
    );

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Compiled successfully"),
    );
  });

  it("shows error message when compilation fails", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/libs/jr.jar"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("exit code 1"),
          "",
          "net.sf.jasperreports.engine.JRException: Error compiling\nDetails...",
        );
        return undefined as never;
      },
    );

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Compilation failed"),
    );
  });

  it("compiles java sources when sourcePaths is configured", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/libs/jr.jar"];
        if (key === "java.sourcePaths") return ["/src/java"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);
    vi.mocked(compileJavaSources).mockResolvedValue("/tmp/jr-sources-abc");

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: null, stdout: string, stderr: string) => void)(
          null,
          "Compiled OK",
          "",
        );
        return undefined as never;
      },
    );

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    expect(compileJavaSources).toHaveBeenCalled();
    expect(cleanupTempDir).toHaveBeenCalledWith("/tmp/jr-sources-abc");
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Compiled successfully"),
    );
  });

  it("fails when java source compilation fails", async () => {
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === "classpath") return ["/libs/jr.jar"];
        if (key === "java.sourcePaths") return ["/src/java"];
        return defaultValue;
      }),
      update: vi.fn(),
    } as unknown as vscode.WorkspaceConfiguration);
    vi.mocked(compileJavaSources).mockResolvedValue(undefined);

    const { compileReport } = await import("../compiler");
    await compileReport("/ext", "/test/report.jrxml");

    // Should not proceed to JRXML compilation
    expect(execFile).not.toHaveBeenCalled();
  });
});
