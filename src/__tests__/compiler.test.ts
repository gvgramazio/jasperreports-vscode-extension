import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { buildClasspath } from "../compiler";

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
});
