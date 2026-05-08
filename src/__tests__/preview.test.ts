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
    existsSync: vi.fn(),
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
let previewManager: InstanceType<typeof import("../preview").PreviewManager>;

beforeEach(async () => {
  vi.clearAllMocks();
  vscode.window.activeTextEditor = undefined;
  mockContext = createMockContext();
  const { PreviewManager } = await import("../preview");
  previewManager = new PreviewManager(
    mockContext as unknown as vscode.ExtensionContext,
  );
});

describe("PreviewManager", () => {
  it("returns early when no jrxml file is resolved", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue(undefined);

    await previewManager.preview();

    expect(resolveJavaEnv).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
  });

  it("returns early when Java environment is not resolved", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue(undefined);

    await previewManager.preview();

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

    await previewManager.preview();

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

    await previewManager.preview();

    expect(fs.readFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
  });

  it("previews PDF by opening file in VS Code", async () => {
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

    vi.mocked(fs.existsSync).mockReturnValue(true);

    await previewManager.preview();

    // PDF should be opened via vscode.open command, not in a webview
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "vscode.open",
      expect.objectContaining({ fsPath: expect.stringContaining(".pdf") }),
      expect.objectContaining({ preview: true }),
    );
  });

  it("shows error when PDF exec fails with stderr", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    vscode.workspace.workspaceFolders = [
      { uri: { fsPath: "/test" }, name: "test", index: 0 },
    ];
    const ctx = mockContext as unknown as vscode.ExtensionContext;
    const { setPreviewConfig } = await import("../previewConfig");
    await setPreviewConfig(ctx, "/test/report.jrxml", { format: "pdf" });

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

    previewManager.dispose();
    await previewManager.preview();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Preview failed"),
    );
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("shows error when PDF exec fails without stderr", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    vscode.workspace.workspaceFolders = [
      { uri: { fsPath: "/test" }, name: "test", index: 0 },
    ];
    const ctx = mockContext as unknown as vscode.ExtensionContext;
    const { setPreviewConfig } = await import("../previewConfig");
    await setPreviewConfig(ctx, "/test/report.jrxml", { format: "pdf" });

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

    previewManager.dispose();
    await previewManager.preview();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("timeout"),
    );
  });

  it("shows error when PDF output file is missing after exec", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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

    vi.mocked(fs.existsSync).mockReturnValue(false);

    previewManager.dispose();
    await previewManager.preview();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "PDF output file was not created",
    );
  });

  it("logs stdout and stderr from PDF preview", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

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
          "pdf stdout output",
          "pdf stderr output",
        );
        return undefined as never;
      },
    );

    vi.mocked(fs.existsSync).mockReturnValue(true);

    previewManager.dispose();
    await previewManager.preview();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "vscode.open",
      expect.objectContaining({ fsPath: expect.stringContaining(".pdf") }),
      expect.objectContaining({ preview: true }),
    );
  });

  it("passes dataSource to PDF preview args", async () => {
    vi.mocked(resolveActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(resolveJavaEnv).mockResolvedValue({
      javaPath: "/usr/bin/java",
      javaVersion: "17.0.2",
      classpath: "/cp/jr.jar",
    });

    vscode.workspace.workspaceFolders = [
      { uri: { fsPath: "/test" }, name: "test", index: 0 },
    ];
    const ctx = mockContext as unknown as vscode.ExtensionContext;
    const { setPreviewConfig } = await import("../previewConfig");
    await setPreviewConfig(ctx, "/test/report.jrxml", {
      format: "pdf",
      dataSourcePath: "/test/data.json",
    });

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

    vi.mocked(fs.existsSync).mockReturnValue(true);

    previewManager.dispose();
    await previewManager.preview();

    const execCalls = vi.mocked(execFile).mock.calls;
    const lastArgs = execCalls[execCalls.length - 1][1] as string[];
    expect(lastArgs).toContain("/test/data.json");
  });
});

describe("dispose", () => {
  it("can be called without error when no panel exists", async () => {
    expect(() => previewManager.dispose()).not.toThrow();
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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();

    // First preview creates a panel
    await previewManager.preview();
    const createCalls1 = vi.mocked(vscode.window.createWebviewPanel).mock.calls
      .length;

    // Second preview should reuse
    await previewManager.preview();
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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();
    await previewManager.preview();

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

    previewManager.dispose();
    await previewManager.preview();

    // Trigger onDidDispose callback
    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[
      vi.mocked(vscode.window.createWebviewPanel).mock.results.length - 1
    ].value;
    const disposeHandler = panel.onDidDispose.mock.calls[0][0] as () => void;
    disposeHandler();

    // After dispose, next preview should create a new panel
    await previewManager.preview();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(
      vi.mocked(vscode.window.createWebviewPanel).mock.calls.length,
    );
  });
});
