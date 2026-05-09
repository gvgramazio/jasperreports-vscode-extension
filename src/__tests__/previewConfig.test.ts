import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { createMockContext } from "../__mocks__/vscode";

let mockContext: ReturnType<typeof createMockContext>;

beforeEach(() => {
  vi.clearAllMocks();
  mockContext = createMockContext();
  (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = [
    { uri: { fsPath: "/workspace" }, name: "workspace", index: 0 },
  ];
});

describe("getPreviewConfig / setPreviewConfig", () => {
  it("returns undefined for unknown files", async () => {
    const { getPreviewConfig } = await import("../previewConfig");
    const result = getPreviewConfig(
      mockContext as unknown as vscode.ExtensionContext,
      "/workspace/reports/test.jrxml",
    );
    expect(result).toBeUndefined();
  });

  it("round-trips config correctly", async () => {
    const { getPreviewConfig, setPreviewConfig } =
      await import("../previewConfig");
    const ctx = mockContext as unknown as vscode.ExtensionContext;

    await setPreviewConfig(ctx, "/workspace/reports/test.jrxml", {
      dataSourcePath: "/workspace/data/test.json",
      format: "pdf",
    });

    const result = getPreviewConfig(ctx, "/workspace/reports/test.jrxml");
    expect(result).toEqual({
      dataSourcePath: "/workspace/data/test.json",
      format: "pdf",
    });
  });

  it("uses workspace-relative paths as keys", async () => {
    const { setPreviewConfig } = await import("../previewConfig");
    const ctx = mockContext as unknown as vscode.ExtensionContext;

    await setPreviewConfig(ctx, "/workspace/reports/test.jrxml", {
      format: "html",
    });

    const storedMap = (ctx.workspaceState.update as ReturnType<typeof vi.fn>)
      .mock.calls[0][1] as Record<string, unknown>;
    expect(storedMap).toHaveProperty("reports/test.jrxml");
    expect(storedMap).not.toHaveProperty("/workspace/reports/test.jrxml");
  });

  it("stores multiple files independently", async () => {
    const { getPreviewConfig, setPreviewConfig } =
      await import("../previewConfig");
    const ctx = mockContext as unknown as vscode.ExtensionContext;

    await setPreviewConfig(ctx, "/workspace/a.jrxml", { format: "html" });
    await setPreviewConfig(ctx, "/workspace/b.jrxml", { format: "pdf" });

    expect(getPreviewConfig(ctx, "/workspace/a.jrxml")?.format).toBe("html");
    expect(getPreviewConfig(ctx, "/workspace/b.jrxml")?.format).toBe("pdf");
  });
});

describe("resolveFormat", () => {
  it("returns per-file format when set", async () => {
    const { resolveFormat } = await import("../previewConfig");
    expect(resolveFormat({ format: "pdf" })).toBe("pdf");
  });

  it("falls back to global default when no per-file format", async () => {
    const { resolveFormat } = await import("../previewConfig");
    expect(resolveFormat(undefined)).toBe("html");
    expect(resolveFormat({})).toBe("html");
  });
});

describe("promptDataSource", () => {
  it("returns 'cancelled' when user dismisses quick pick", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const { promptDataSource } = await import("../previewConfigUI");
    const result = await promptDataSource();
    expect(result).toBe("cancelled");
  });

  it("returns undefined for empty data source selection", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Empty Data Source",
      value: undefined,
    } as unknown as vscode.QuickPickItem);

    const { promptDataSource } = await import("../previewConfigUI");
    const result = await promptDataSource();
    expect(result).toBeUndefined();
  });

  it("returns 'cancelled' when file picker is dismissed", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Choose file...",
      value: "__browse__",
    } as unknown as vscode.QuickPickItem);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);

    const { promptDataSource } = await import("../previewConfigUI");
    const result = await promptDataSource();
    expect(result).toBe("cancelled");
  });

  it("returns selected file path from file picker", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Choose file...",
      value: "__browse__",
    } as unknown as vscode.QuickPickItem);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
      { fsPath: "/workspace/data/test.json" },
    ] as unknown as vscode.Uri[]);

    const { promptDataSource } = await import("../previewConfigUI");
    const result = await promptDataSource();
    expect(result).toBe("/workspace/data/test.json");
  });
});

describe("promptFormat", () => {
  it("returns 'cancelled' when user dismisses quick pick", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const { promptFormat } = await import("../previewConfigUI");
    const result = await promptFormat();
    expect(result).toBe("cancelled");
  });

  it("returns selected format", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "PDF",
      value: "pdf",
    } as unknown as vscode.QuickPickItem);

    const { promptFormat } = await import("../previewConfigUI");
    const result = await promptFormat();
    expect(result).toBe("pdf");
  });
});

describe("configurePreview", () => {
  it("shows error when no jrxml file is open", async () => {
    vscode.window.activeTextEditor = undefined;

    const { configurePreview } = await import("../previewConfigUI");
    await configurePreview(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("shows error when active file is not jrxml", async () => {
    vscode.window.activeTextEditor = {
      document: {
        fileName: "/test/file.xml",
      } as unknown as vscode.TextDocument,
    } as unknown as vscode.TextEditor;

    const { configurePreview } = await import("../previewConfigUI");
    await configurePreview(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining(".jrxml"),
    );
  });

  it("returns when user cancels data source prompt", async () => {
    vscode.window.activeTextEditor = {
      document: {
        fileName: "/workspace/report.jrxml",
      } as unknown as vscode.TextDocument,
    } as unknown as vscode.TextEditor;
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const { configurePreview } = await import("../previewConfigUI");
    await configurePreview(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it("returns when user cancels format prompt", async () => {
    vscode.window.activeTextEditor = {
      document: {
        fileName: "/workspace/report.jrxml",
      } as unknown as vscode.TextDocument,
    } as unknown as vscode.TextEditor;
    // First showQuickPick → data source selection
    vi.mocked(vscode.window.showQuickPick)
      .mockResolvedValueOnce({
        label: "Empty",
        value: undefined,
      } as unknown as vscode.QuickPickItem)
      // Second showQuickPick → format selection → cancelled
      .mockResolvedValueOnce(undefined);

    const { configurePreview } = await import("../previewConfigUI");
    await configurePreview(mockContext as unknown as vscode.ExtensionContext);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it("saves config and shows success message", async () => {
    vscode.window.activeTextEditor = {
      document: {
        fileName: "/workspace/report.jrxml",
      } as unknown as vscode.TextDocument,
    } as unknown as vscode.TextEditor;
    vi.mocked(vscode.window.showQuickPick)
      .mockResolvedValueOnce({
        label: "Empty",
        value: undefined,
      } as unknown as vscode.QuickPickItem)
      .mockResolvedValueOnce({
        label: "PDF",
        value: "pdf",
      } as unknown as vscode.QuickPickItem);

    const { configurePreview } = await import("../previewConfigUI");
    const { getPreviewConfig } = await import("../previewConfig");
    const ctx = mockContext as unknown as vscode.ExtensionContext;
    await configurePreview(ctx);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Preview configured"),
    );
    const saved = getPreviewConfig(ctx, "/workspace/report.jrxml");
    expect(saved?.format).toBe("pdf");
  });
});
