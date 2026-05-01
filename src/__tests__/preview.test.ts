import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import { createMockContext } from "../__mocks__/vscode";

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
});
