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

  it("activate registers xml file associations", () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    extension.activate(context);

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

  it("activate recommends xml extension when not installed", () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    vi.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);

    extension.activate(context);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("XML"),
      "Install",
    );
  });

  it("activate does not recommend xml extension when already installed", () => {
    const context = {
      extensionPath: "/mock/extension/path",
      subscriptions: [],
      globalStorageUri: { fsPath: "/mock/storage" },
    } as unknown as vscode.ExtensionContext;

    vi.mocked(vscode.extensions.getExtension).mockReturnValue(
      {} as vscode.Extension<unknown>,
    );

    extension.activate(context);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });
});
