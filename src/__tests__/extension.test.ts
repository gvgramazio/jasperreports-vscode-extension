import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import * as extension from "../extension";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extension", () => {
  it("exports an activate function", () => {
    expect(typeof extension.activate).toBe("function");
  });

  it("exports a deactivate function", () => {
    expect(typeof extension.deactivate).toBe("function");
  });

  it("activate registers xml file associations", async () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    await extension.activate(context);

    const xmlConfig = vscode.workspace.getConfiguration("xml");
    expect(xmlConfig.update).toHaveBeenCalledWith(
      "fileAssociations",
      expect.arrayContaining([
        expect.objectContaining({ pattern: "**/*.jrxml" }),
        expect.objectContaining({ pattern: "**/*.jrtx" }),
      ]),
      vscode.ConfigurationTarget.Global,
    );
  });

  it("activate recommends xml extension when not installed", async () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    vi.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);

    await extension.activate(context);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("XML"),
      "Install",
    );
  });

  it("activate activates xml extension when installed but inactive", async () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    const mockActivate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({
      isActive: false,
      activate: mockActivate,
    } as unknown as vscode.Extension<unknown>);

    await extension.activate(context);

    expect(mockActivate).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it("activate does not re-activate xml extension when already active", async () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    const mockActivate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({
      isActive: true,
      activate: mockActivate,
    } as unknown as vscode.Extension<unknown>);

    await extension.activate(context);

    expect(mockActivate).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });
});
