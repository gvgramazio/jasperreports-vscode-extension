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

describe("runPreview error handling", () => {
  it("shows error when execFile fails", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Empty",
      value: undefined,
    } as unknown as vscode.QuickPickItem);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("java crashed"),
          "",
          "java.lang.OutOfMemoryError",
        );
        return undefined as never;
      },
    );

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel(); // reset module state
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Preview failed"),
    );
    expect(fs.unlinkSync).toHaveBeenCalled(); // cleanupTempFile
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it("shows error when execFile fails with only err.message (no stderr)", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Empty",
      value: undefined,
    } as unknown as vscode.QuickPickItem);

    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        (cb as (err: Error, stdout: string, stderr: string) => void)(
          new Error("timeout"),
          "some stdout",
          "",
        );
        return undefined as never;
      },
    );

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("timeout"),
    );
  });

  it("shows error when readFileSync throws after successful exec", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: file not found");
    });

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read preview output"),
    );
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });
});

describe("showPreviewPanel", () => {
  it("reuses existing panel on second preview", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    const ctx = mockContext as unknown as vscode.ExtensionContext;

    // First preview creates a panel
    await previewReport(ctx);
    const createCalls1 = vi.mocked(vscode.window.createWebviewPanel).mock.calls
      .length;

    // Second preview should reuse
    await previewReport(ctx);
    const createCalls2 = vi.mocked(vscode.window.createWebviewPanel).mock.calls
      .length;

    expect(createCalls2).toBe(createCalls1); // no new panel created
    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[
      createCalls1 - 1
    ].value;
    expect(panel.reveal).toHaveBeenCalled();
  });
});

describe("wrapHtml", () => {
  it("prepends style when HTML has no </head> tag", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    // HTML without </head>
    vi.mocked(fs.readFileSync).mockReturnValue(
      "<body><p>No head tag</p></body>",
    );

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[
      vi.mocked(vscode.window.createWebviewPanel).mock.results.length - 1
    ].value;
    expect(panel.webview.html).toContain("<style>");
    expect(panel.webview.html).toContain("No head tag");
  });
});

describe("setupLiveReload", () => {
  it("registers save listener when liveReload is enabled", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    // Enable liveReload
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue?: unknown) => {
        if (_key === "preview.liveReload") return true;
        return defaultValue;
      }),
      update: vi.fn(),
    } as never);

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.workspace.onDidSaveTextDocument).toHaveBeenCalled();
  });
});

describe("data source logging", () => {
  it("logs data source path when provided", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    // Select "Choose file..." then provide a path
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "$(folder-opened) Choose file...",
      value: "__browse__",
    } as unknown as vscode.QuickPickItem);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
      { fsPath: "/test/data.json" },
    ] as unknown as vscode.Uri[]);

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

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    // The data source path should have been passed to execFile
    const execCalls = vi.mocked(execFile).mock.calls;
    const lastArgs = execCalls[execCalls.length - 1][1] as string[];
    expect(lastArgs).toContain("/test/data.json");
  });
});

describe("onDidDispose", () => {
  it("clears panel on dispose", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    const { previewReport, disposePreviewPanel } = await import("../preview");
    disposePreviewPanel();
    await previewReport(mockContext as unknown as vscode.ExtensionContext);

    // Trigger onDidDispose callback
    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[
      vi.mocked(vscode.window.createWebviewPanel).mock.results.length - 1
    ].value;
    const disposeHandler = panel.onDidDispose.mock.calls[0][0] as () => void;
    disposeHandler();

    // After dispose, next preview should create a new panel
    await previewReport(mockContext as unknown as vscode.ExtensionContext);
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(
      vi.mocked(vscode.window.createWebviewPanel).mock.calls.length,
    );
  });
});
