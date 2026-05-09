import { describe, it, expect, vi, beforeEach } from "vitest";
import * as vscode from "vscode";
import * as extension from "../extension";

const {
  mockRefresh,
  mockDispose,
  mockUpdate,
  mockMarkStale,
  MockPropertiesViewProvider,
  getLastPropertiesInstance,
} = vi.hoisted(() => {
  const mockRefresh = vi.fn();
  const mockDispose = vi.fn();
  const mockUpdate = vi.fn();
  const mockMarkStale = vi.fn();

  let lastInstance: { editInProgress: boolean } | undefined;

  class MockPropertiesViewProvider {
    static viewType = "jasperreports-properties";
    update = mockUpdate;
    markStale = mockMarkStale;
    editInProgress = false;
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastInstance = this;
    }
  }

  const getLastPropertiesInstance = () => lastInstance!;

  return {
    mockRefresh,
    mockDispose,
    mockUpdate,
    mockMarkStale,
    MockPropertiesViewProvider,
    getLastPropertiesInstance,
  };
});

vi.mock("../outline", () => {
  class MockJrxmlOutlineProvider {
    refresh = mockRefresh;
    dispose = mockDispose;
    getTreeItem = vi.fn();
    getChildren = vi.fn();
  }
  return {
    JrxmlOutlineProvider: MockJrxmlOutlineProvider,
    OutlineItem: class {},
    revealPosition: vi.fn(),
    OutlineDragAndDropController: vi.fn(),
    addElement: vi.fn(),
    deleteElement: vi.fn(),
    duplicateElement: vi.fn(),
    addSection: vi.fn(),
  };
});

vi.mock("../properties", () => ({
  PropertiesViewProvider: MockPropertiesViewProvider,
}));

// Mock other imported modules to avoid side effects
vi.mock("../compiler", () => ({ compileReport: vi.fn() }));
vi.mock("../dependencies", () => ({ downloadDependencies: vi.fn() }));
let mockPreviewInstance: {
  preview: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

vi.mock("../preview", () => {
  class MockPreviewManager {
    preview = vi.fn();
    dispose = vi.fn();
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      mockPreviewInstance = this;
    }
  }
  return { PreviewManager: MockPreviewManager };
});
vi.mock("../previewConfigUI", () => ({ configurePreview: vi.fn() }));
vi.mock("../logger", () => ({
  getOutputChannel: vi.fn().mockReturnValue({
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  }),
  disposeOutputChannel: vi.fn(),
}));

function createContext(): vscode.ExtensionContext {
  return {
    extensionPath: "/mock/extension/path",
    extensionUri: { fsPath: "/mock/extension/path" },
    subscriptions: [] as { dispose(): void }[],
    globalStorageUri: { fsPath: "/mock/storage" },
  } as unknown as vscode.ExtensionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(
    vscode.window as unknown as { activeTextEditor: unknown },
  ).activeTextEditor = undefined;
});

describe("extension", () => {
  it("exports an activate function", () => {
    expect(typeof extension.activate).toBe("function");
  });

  it("exports a deactivate function", () => {
    expect(typeof extension.deactivate).toBe("function");
  });

  it("activate registers xml file associations", async () => {
    const context = createContext();
    await extension.activate(context);

    const xmlConfig = vscode.workspace.getConfiguration("xml");
    expect(xmlConfig.update).toHaveBeenCalledWith(
      "fileAssociations",
      expect.arrayContaining([
        expect.objectContaining({ pattern: "**/*.jrxml" }),
        expect.objectContaining({ pattern: "**/*.jrtx" }),
      ]),
      vscode.ConfigurationTarget.Workspace,
    );
  });

  it("activate recommends xml extension when not installed", async () => {
    const context = createContext();
    vi.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);

    await extension.activate(context);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("XML"),
      "Install",
    );
  });

  it("activate activates xml extension when installed but inactive", async () => {
    const context = createContext();
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
    const context = createContext();
    const mockActivate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({
      isActive: true,
      activate: mockActivate,
    } as unknown as vscode.Extension<unknown>);

    await extension.activate(context);

    expect(mockActivate).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it("installs xml extension when user clicks Install", async () => {
    const context = createContext();
    vi.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(
      "Install" as never,
    );

    await extension.activate(context);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "workbench.extensions.installExtension",
      "redhat.vscode-xml",
    );
  });

  it("deactivate does not throw", () => {
    expect(() => extension.deactivate()).not.toThrow();
  });

  it("registers commands during activation", async () => {
    const context = createContext();
    await extension.activate(context);

    const registeredCommands = vi
      .mocked(vscode.commands.registerCommand)
      .mock.calls.map((c) => c[0]);
    expect(registeredCommands).toContain("jasperreports.compile");
    expect(registeredCommands).toContain("jasperreports.preview");
    expect(registeredCommands).toContain("jasperreports.previewToSide");
    expect(registeredCommands).toContain("jasperreports.downloadDependencies");
    expect(registeredCommands).toContain("jasperreports.configurePreview");
    expect(registeredCommands).toContain("jasperreports.outline.reveal");
    expect(registeredCommands).toContain("jasperreports.outline.add");
    expect(registeredCommands).toContain("jasperreports.outline.delete");
  });

  it("creates outline tree view during activation", async () => {
    const context = createContext();
    await extension.activate(context);

    expect(vscode.window.createTreeView).toHaveBeenCalledWith(
      "jasperreports-outline",
      expect.objectContaining({ treeDataProvider: expect.anything() }),
    );
  });

  it("registers properties webview view provider", async () => {
    const context = createContext();
    await extension.activate(context);

    expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalledWith(
      "jasperreports-properties",
      expect.anything(),
    );
  });

  it("registers expression editor content provider", async () => {
    const context = createContext();
    await extension.activate(context);

    expect(vscode.workspace.registerFileSystemProvider).toHaveBeenCalledWith(
      "jrexpr",
      expect.anything(),
    );
  });

  it("invokes command callbacks correctly", async () => {
    const context = createContext();
    await extension.activate(context);

    const { compileReport } = await import("../compiler");
    const { downloadDependencies } = await import("../dependencies");
    const { configurePreview } = await import("../previewConfigUI");

    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const findCallback = (name: string) =>
      calls.find((c) => c[0] === name)![1] as () => void;

    findCallback("jasperreports.compile")();
    expect(compileReport).toHaveBeenCalledWith(context.extensionPath);

    findCallback("jasperreports.preview")();
    expect(mockPreviewInstance.preview).toHaveBeenCalledWith();

    findCallback("jasperreports.previewToSide")();
    expect(mockPreviewInstance.preview).toHaveBeenCalledWith(
      vscode.ViewColumn.Beside,
    );

    findCallback("jasperreports.downloadDependencies")();
    expect(downloadDependencies).toHaveBeenCalled();

    findCallback("jasperreports.configurePreview")();
    expect(configurePreview).toHaveBeenCalledWith(context);
  });

  it("invokes outline action command callbacks", async () => {
    const context = createContext();
    await extension.activate(context);

    const { addElement, deleteElement } = await import("../outline");

    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const findCallback = (name: string) =>
      calls.find((c) => c[0] === name)![1] as (item: unknown) => void;

    const fakeItem = { label: "test" };
    findCallback("jasperreports.outline.add")(fakeItem);
    expect(addElement).toHaveBeenCalledWith(fakeItem);

    findCallback("jasperreports.outline.delete")(fakeItem);
    expect(deleteElement).toHaveBeenCalledWith(fakeItem);
  });

  it("refreshes outline on document change for jrxml files", async () => {
    vi.useFakeTimers();
    const context = createContext();
    await extension.activate(context);

    const onDocChange = vi.mocked(vscode.workspace.onDidChangeTextDocument);
    const handler = onDocChange.mock.calls[0][0] as (e: unknown) => void;

    handler({
      document: { languageId: "jrxml", getText: () => "<jrxml/>" },
    });

    vi.advanceTimersByTime(300);
    expect(mockRefresh).toHaveBeenCalledWith("<jrxml/>");
    expect(mockMarkStale).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("does not refresh outline on document change for non-jrxml files", async () => {
    const context = createContext();
    await extension.activate(context);

    const onDocChange = vi.mocked(vscode.workspace.onDidChangeTextDocument);
    const handler = onDocChange.mock.calls[0][0] as (e: unknown) => void;

    mockRefresh.mockClear();
    handler({
      document: { languageId: "xml", getText: () => "<xml/>" },
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("does not markStale when editInProgress is true", async () => {
    vi.useFakeTimers();
    const context = createContext();
    await extension.activate(context);

    // Set editInProgress on the actual instance created during activate
    getLastPropertiesInstance().editInProgress = true;

    const onDocChange = vi.mocked(vscode.workspace.onDidChangeTextDocument);
    const handler = onDocChange.mock.calls[0][0] as (e: unknown) => void;

    handler({
      document: { languageId: "jrxml", getText: () => "<jrxml/>" },
    });

    vi.advanceTimersByTime(300);
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockMarkStale).not.toHaveBeenCalled();

    // Reset
    getLastPropertiesInstance().editInProgress = false;
    vi.useRealTimers();
  });

  it("debounces document change refresh", async () => {
    vi.useFakeTimers();
    const context = createContext();
    await extension.activate(context);

    const onDocChange = vi.mocked(vscode.workspace.onDidChangeTextDocument);
    const handler = onDocChange.mock.calls[0][0] as (e: unknown) => void;

    mockRefresh.mockClear();
    handler({ document: { languageId: "jrxml", getText: () => "first" } });
    handler({ document: { languageId: "jrxml", getText: () => "second" } });

    vi.advanceTimersByTime(300);
    // Only the last call should trigger refresh
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledWith("second");

    vi.useRealTimers();
  });

  it("refreshes outline when active editor changes to jrxml", async () => {
    const context = createContext();
    await extension.activate(context);

    const onEditorChange = vi.mocked(vscode.window.onDidChangeActiveTextEditor);
    const handler = onEditorChange.mock.calls[0][0] as (
      editor: unknown,
    ) => void;

    mockRefresh.mockClear();
    handler({
      document: { languageId: "jrxml", getText: () => "<report/>" },
    });

    expect(mockRefresh).toHaveBeenCalledWith("<report/>");
  });

  it("refreshes outline with no args when editor changes to non-jrxml", async () => {
    const context = createContext();
    await extension.activate(context);

    const onEditorChange = vi.mocked(vscode.window.onDidChangeActiveTextEditor);
    const handler = onEditorChange.mock.calls[0][0] as (
      editor: unknown,
    ) => void;

    mockRefresh.mockClear();
    handler({
      document: { languageId: "xml", getText: () => "<xml/>" },
    });

    expect(mockRefresh).toHaveBeenCalledWith();
  });

  it("refreshes outline with no args when editor becomes undefined", async () => {
    const context = createContext();
    await extension.activate(context);

    const onEditorChange = vi.mocked(vscode.window.onDidChangeActiveTextEditor);
    const handler = onEditorChange.mock.calls[0][0] as (
      editor: unknown,
    ) => void;

    mockRefresh.mockClear();
    handler(undefined);

    expect(mockRefresh).toHaveBeenCalledWith();
  });

  it("updates properties on tree selection change", async () => {
    const context = createContext();
    await extension.activate(context);

    const treeView = vi.mocked(vscode.window.createTreeView).mock.results[0]
      .value as { onDidChangeSelection: ReturnType<typeof vi.fn> };
    const handler = treeView.onDidChangeSelection.mock.calls[0][0] as (
      e: unknown,
    ) => void;

    const fakeNode = { tag: "band" };
    handler({ selection: [{ node: fakeNode, label: "Title" }] });
    expect(mockUpdate).toHaveBeenCalledWith(fakeNode, "Title");
  });

  it("clears properties on empty tree selection", async () => {
    const context = createContext();
    await extension.activate(context);

    const treeView = vi.mocked(vscode.window.createTreeView).mock.results[0]
      .value as { onDidChangeSelection: ReturnType<typeof vi.fn> };
    const handler = treeView.onDidChangeSelection.mock.calls[0][0] as (
      e: unknown,
    ) => void;

    handler({ selection: [] });
    expect(mockUpdate).toHaveBeenCalledWith(null, "");
  });

  it("performs initial refresh when active editor has jrxml", async () => {
    (
      vscode.window as unknown as { activeTextEditor: unknown }
    ).activeTextEditor = {
      document: { languageId: "jrxml", getText: () => "<initial/>" },
    };

    const context = createContext();
    await extension.activate(context);

    expect(mockRefresh).toHaveBeenCalledWith("<initial/>");
  });

  it("skips initial refresh when active editor is not jrxml", async () => {
    (
      vscode.window as unknown as { activeTextEditor: unknown }
    ).activeTextEditor = {
      document: { languageId: "xml", getText: () => "<xml/>" },
    };

    const context = createContext();
    mockRefresh.mockClear();
    await extension.activate(context);

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("dispose subscription clears debounce timer and disposes outline", async () => {
    vi.useFakeTimers();
    const context = createContext();
    await extension.activate(context);

    // Start a debounce timer
    const onDocChange = vi.mocked(vscode.workspace.onDidChangeTextDocument);
    const handler = onDocChange.mock.calls[0][0] as (e: unknown) => void;
    handler({ document: { languageId: "jrxml", getText: () => "<x/>" } });

    // Dispose all subscriptions (simulates extension deactivation)
    for (const sub of context.subscriptions) {
      sub.dispose();
    }

    expect(mockDispose).toHaveBeenCalled();

    // Timer should have been cleared, so advancing should NOT trigger refresh
    mockRefresh.mockClear();
    vi.advanceTimersByTime(300);
    expect(mockRefresh).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("uses custom schema paths when configured", async () => {
    const mockGet = vi.fn((key: string, defaultValue?: unknown) => {
      if (key === "schema.jrxmlPath") return "/custom/jrxml.xsd";
      if (key === "schema.jrtxPath") return "/custom/jrtx.xsd";
      return defaultValue;
    });

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation(
      (section?: string) => {
        if (section === "jasperreports") {
          return { get: mockGet, update: vi.fn() } as never;
        }
        return {
          get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
          update: vi.fn(),
        } as never;
      },
    );

    const context = createContext();
    await extension.activate(context);

    // The xml config update should use the custom paths
    const xmlUpdateCalls = vi.mocked(vscode.workspace.getConfiguration).mock
      .results;
    const xmlConfig = xmlUpdateCalls.find((r) => {
      const val = r.value as { update: ReturnType<typeof vi.fn> };
      return val.update?.mock?.calls?.some(
        (c: unknown[]) => c[0] === "fileAssociations",
      );
    });

    if (xmlConfig) {
      const updateCall = (
        xmlConfig.value as { update: ReturnType<typeof vi.fn> }
      ).update.mock.calls.find((c: unknown[]) => c[0] === "fileAssociations");
      const associations = updateCall![1] as Array<{
        pattern: string;
        systemId: string;
      }>;
      const jrxml = associations.find((a) => a.pattern === "**/*.jrxml");
      const jrtx = associations.find((a) => a.pattern === "**/*.jrtx");
      expect(jrxml!.systemId).toBe("/custom/jrxml.xsd");
      expect(jrtx!.systemId).toBe("/custom/jrtx.xsd");
    }
  });

  it("pushes preview and logger dispose to subscriptions", async () => {
    const context = createContext();
    await extension.activate(context);

    const { disposeOutputChannel } = await import("../logger");

    // Dispose all subscriptions
    for (const sub of context.subscriptions) {
      sub.dispose();
    }

    expect(mockPreviewInstance.dispose).toHaveBeenCalled();
    expect(disposeOutputChannel).toHaveBeenCalled();
  });
});
