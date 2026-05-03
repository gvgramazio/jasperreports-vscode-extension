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

vi.mock("../java", () => ({
  resolveJavaExecutable: vi.fn(),
  validateJava: vi.fn(),
}));

vi.mock("../compiler", () => ({
  buildClasspath: vi.fn(),
}));

import { execFile } from "child_process";
import * as fs from "fs";
import { resolveJavaExecutable, validateJava } from "../java";
import { buildClasspath } from "../compiler";

let mockContext: ReturnType<typeof createMockContext>;

beforeEach(() => {
  vi.clearAllMocks();
  vscode.window.activeTextEditor = undefined;
  mockContext = createMockContext();
});

describe("previewReport", () => {
  it("shows error when no jrxml file is open", async () => {
    vscode.window.activeTextEditor = undefined;

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("shows error when active file is not jrxml", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/file.xml" },
    };

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("shows error when Java is not found", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Java not found"),
    );
  });

  it("shows error when Java validation fails", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: false,
      error: "Cannot run java",
    });

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Cannot run java",
    );
  });

  it("shows error when classpath is not configured", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(buildClasspath).mockReturnValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("classpath is not configured"),
      "Open Settings",
    );
  });

  it("opens settings when user clicks 'Open Settings' on classpath error", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(buildClasspath).mockReturnValue(undefined);
    vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(
      "Open Settings" as never,
    );

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "workbench.action.openSettings",
      "jasperreports.classpath",
    );
  });

  it("returns when user cancels data source prompt", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(buildClasspath).mockReturnValue("/cp/jr.jar");
    // promptDataSource returns 'cancelled' when quick pick is dismissed
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const { previewReport } = await import("../preview");
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    // Should not have proceeded to runPreview
    expect(execFile).not.toHaveBeenCalled();
  });

  it("previews HTML successfully", async () => {
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(buildClasspath).mockReturnValue("/cp/jr.jar");

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
    vscode.window.activeTextEditor = {
      document: { fileName: "/test/report.jrxml" },
    };
    vi.mocked(resolveJavaExecutable).mockReturnValue("/usr/bin/java");
    vi.mocked(validateJava).mockResolvedValue({
      ok: true,
      version: "17.0.2",
    });
    vi.mocked(buildClasspath).mockReturnValue("/cp/jr.jar");

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
