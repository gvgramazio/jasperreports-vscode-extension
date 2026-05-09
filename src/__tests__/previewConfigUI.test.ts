import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import {
  promptDataSource,
  promptFormat,
  configurePreview,
} from "../previewConfigUI";

vi.mock("../compiler", () => ({
  getActiveJrxmlPath: vi.fn(),
}));

vi.mock("../previewConfig", () => ({
  getPreviewConfig: vi.fn(),
  setPreviewConfig: vi.fn(),
  resolveFormat: vi.fn(() => "html"),
}));

import { getActiveJrxmlPath } from "../compiler";
import { getPreviewConfig, setPreviewConfig } from "../previewConfig";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("promptDataSource", () => {
  it("returns 'cancelled' when user dismisses the quick pick", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const result = await promptDataSource();
    expect(result).toBe("cancelled");
  });

  it("returns undefined for empty data source selection", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Empty",
      value: undefined,
    } as never);

    const result = await promptDataSource();
    expect(result).toBeUndefined();
  });

  it("returns file path when browse is selected and file chosen", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Choose file...",
      value: "__browse__",
    } as never);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([
      { fsPath: "/data/test.json" } as vscode.Uri,
    ]);

    const result = await promptDataSource();
    expect(result).toBe("/data/test.json");
  });

  it("returns 'cancelled' when browse is selected but dialog dismissed", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Choose file...",
      value: "__browse__",
    } as never);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue(undefined);

    const result = await promptDataSource();
    expect(result).toBe("cancelled");
  });

  it("returns 'cancelled' when browse returns empty array", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "Choose file...",
      value: "__browse__",
    } as never);
    vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([]);

    const result = await promptDataSource();
    expect(result).toBe("cancelled");
  });

  it("includes current path option when provided", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "data.json",
      value: "/existing/data.json",
    } as never);

    const result = await promptDataSource("/existing/data.json");
    expect(result).toBe("/existing/data.json");
    expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ value: "/existing/data.json", picked: true }),
      ]),
      expect.anything(),
    );
  });
});

describe("promptFormat", () => {
  it("returns 'cancelled' when user dismisses", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);

    const result = await promptFormat();
    expect(result).toBe("cancelled");
  });

  it("returns selected format", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "PDF",
      value: "pdf",
    } as never);

    const result = await promptFormat();
    expect(result).toBe("pdf");
  });

  it("marks current format as picked", async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
      label: "PDF",
      value: "pdf",
    } as never);

    await promptFormat("pdf");
    expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ value: "pdf", picked: true }),
      ]),
      expect.anything(),
    );
  });
});

describe("configurePreview", () => {
  const mockContext = {
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    },
    subscriptions: [],
    extensionUri: { fsPath: "/ext" },
  } as unknown as vscode.ExtensionContext;

  it("does nothing when no active jrxml file", async () => {
    vi.mocked(getActiveJrxmlPath).mockReturnValue(undefined);

    await configurePreview(mockContext);

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });

  it("aborts when data source prompt is cancelled", async () => {
    vi.mocked(getActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(getPreviewConfig).mockReturnValue(undefined);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

    await configurePreview(mockContext);

    expect(setPreviewConfig).not.toHaveBeenCalled();
  });

  it("aborts when format prompt is cancelled", async () => {
    vi.mocked(getActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(getPreviewConfig).mockReturnValue(undefined);
    // Data source selected
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Empty",
      value: undefined,
    } as never);
    // Format cancelled
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

    await configurePreview(mockContext);

    expect(setPreviewConfig).not.toHaveBeenCalled();
  });

  it("saves config and shows message on success", async () => {
    vi.mocked(getActiveJrxmlPath).mockReturnValue("/test/report.jrxml");
    vi.mocked(getPreviewConfig).mockReturnValue(undefined);
    // Data source selected
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Empty",
      value: undefined,
    } as never);
    // Format selected
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "HTML",
      value: "html",
    } as never);

    await configurePreview(mockContext);

    expect(setPreviewConfig).toHaveBeenCalledWith(
      mockContext,
      "/test/report.jrxml",
      { dataSourcePath: undefined, format: "html" },
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("HTML"),
    );
  });
});
