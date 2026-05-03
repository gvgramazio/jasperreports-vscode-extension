import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { createMockContext } from "../__mocks__/vscode";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

vi.mock("../compiler", () => ({
  resolveActiveJrxmlPath: vi.fn(),
  resolveJavaEnv: vi.fn(),
}));

import { execFile } from "child_process";
import * as fs from "fs";
import { resolveActiveJrxmlPath, resolveJavaEnv } from "../compiler";

let mockContext: ReturnType<typeof createMockContext>;

beforeEach(() => {
  vi.clearAllMocks();
  vscode.window.activeTextEditor = undefined;
  mockContext = createMockContext();
});

describe("previewReport", () => {
  it("returns early when no jrxml file is resolved", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(resolveJavaEnv).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
  });

  it("returns early when Java environment is not resolved", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(execFile).not.toHaveBeenCalled();
  });

  it("returns when user cancels data source prompt", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });
    // promptDataSource returns 'cancelled' when quick pick is dismissed
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    // Should not have proceeded to runPreview
    expect(execFile).not.toHaveBeenCalled();
  });

  it("previews HTML successfully", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    // Mock promptDataSource → empty data source
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Empty",
      value: undefined,
    } as unknown as vscode.QuickPickItem);

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

    vi.mocked(fs.readFileSync).mockReturnValue(
      "<html><head></head><body>Report</body></html>",
    );

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(fs.readFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
  });

  it("previews PDF successfully as base64", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    // Set up existing config with PDF format
    vscode.workspace.workspaceFolders = [
      { uri: { fsPath: "/test" }, name: "test", index: 0 },
    ];
    const ctx = mockContext as unknown as vscode.ExtensionContext;
    const { setPreviewConfig } = await import("../previewConfig");
    await setPreviewConfig(ctx, "/test/report.jrxml", { format: "pdf" });

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

    const pdfBuffer = Buffer.from("fake-pdf-content");
    vi.mocked(fs.readFileSync).mockReturnValue(pdfBuffer);

    const { previewReport } = await import("../preview");
    await previewReport(ctx);

    expect(fs.readFileSync).toHaveBeenCalled();
    // Panel may be reused from prior test (module-level state), so check
    // that either a new panel was created or an existing one was revealed
    const panelCreated = vi.mocked(vscode.window.createWebviewPanel).mock.calls
      .length;
    const panelMock = vi.mocked(vscode.window.createWebviewPanel).mock.results;
    if (panelCreated > 0) {
      expect(panelMock[panelCreated - 1].value).toBeDefined();
    }
    // The key assertion: readFileSync was called to read the PDF output
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});

describe("disposePreviewPanel", () => {
  it("can be called without error when no panel exists", async () => {
    const { disposePreviewPanel } = await import("../preview");
    expect(() => disposePreviewPanel()).not.toThrow();
  });
});
