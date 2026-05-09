import * as vscode from "vscode";
import * as path from "path";
import { compileReport } from "./compiler";
import {
  getSchemaVersion,
  getCustomJrxmlSchemaPath,
  getCustomJrtxSchemaPath,
} from "./config";
import { downloadDependencies } from "./dependencies";
import { disposeOutputChannel, getOutputChannel } from "./logger";
import {
  JrxmlOutlineProvider,
  OutlineItem,
  revealPosition,
  OutlineDragAndDropController,
  addElement,
  deleteElement,
  duplicateElement,
  addSection,
} from "./outline";
import { PreviewManager } from "./preview";
import { configurePreview } from "./previewConfigUI";
import { NodePosition } from "./jrxml-parser";
import { PropertiesViewProvider } from "./properties";

const XML_EXTENSION_ID = "redhat.vscode-xml";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const channel = getOutputChannel();
  channel.appendLine("JasperReports extension is now active.");

  const previewManager = new PreviewManager(context);

  await registerXmlFileAssociations(context);
  registerCommands(context, previewManager);
  registerOutlineView(context);
  context.subscriptions.push(previewManager, {
    dispose: () => disposeOutputChannel(),
  });
  await activateXmlExtension();
}

export function deactivate(): void {
  // All cleanup is handled via context.subscriptions
}

/**
 * Registers extension commands.
 */
function registerCommands(
  context: vscode.ExtensionContext,
  previewManager: PreviewManager,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("jasperreports.compile", () =>
      compileReport(context.extensionPath),
    ),
    vscode.commands.registerCommand("jasperreports.preview", () =>
      previewManager.preview(),
    ),
    vscode.commands.registerCommand("jasperreports.previewToSide", () =>
      previewManager.preview(vscode.ViewColumn.Beside),
    ),
    vscode.commands.registerCommand("jasperreports.downloadDependencies", () =>
      downloadDependencies(),
    ),
    vscode.commands.registerCommand("jasperreports.configurePreview", () =>
      configurePreview(context),
    ),
  );
}

/**
 * Registers the JRXML outline tree view and wires up auto-refresh listeners.
 */
function registerOutlineView(context: vscode.ExtensionContext): void {
  const outlineProvider = new JrxmlOutlineProvider();
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  context.subscriptions.push({
    dispose: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      outlineProvider.dispose();
    },
  });

  const treeView = vscode.window.createTreeView("jasperreports-outline", {
    treeDataProvider: outlineProvider,
    dragAndDropController: new OutlineDragAndDropController(),
  });
  context.subscriptions.push(treeView);

  // Properties panel
  const propertiesProvider = new PropertiesViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PropertiesViewProvider.viewType,
      propertiesProvider,
    ),
  );

  // Update properties when tree selection changes
  context.subscriptions.push(
    treeView.onDidChangeSelection((e) => {
      const selected = e.selection[0];
      if (selected) {
        propertiesProvider.update(selected.node, selected.label);
      } else {
        propertiesProvider.update(null, "");
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "jasperreports.outline.reveal",
      (position: NodePosition) => revealPosition(position),
    ),
  );

  // Outline context menu actions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "jasperreports.outline.add",
      (item: OutlineItem) => addElement(item),
    ),
    vscode.commands.registerCommand(
      "jasperreports.outline.delete",
      (item: OutlineItem) => deleteElement(item),
    ),
    vscode.commands.registerCommand(
      "jasperreports.outline.duplicate",
      (item: OutlineItem) => duplicateElement(item),
    ),
    vscode.commands.registerCommand("jasperreports.outline.addSection", () =>
      addSection(),
    ),
  );

  // Initial refresh if there's already an active JRXML editor
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isJrxmlDocument(activeEditor.document)) {
    outlineProvider.refresh(activeEditor.document.getText());
  }

  // Auto-refresh on document change (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!isJrxmlDocument(e.document)) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        outlineProvider.refresh(e.document.getText());
      }, 300);

      // Mark properties panel stale for external edits
      if (!propertiesProvider.editInProgress) {
        propertiesProvider.markStale();
      }
    }),
  );

  // Refresh when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isJrxmlDocument(editor.document)) {
        outlineProvider.refresh(editor.document.getText());
      } else {
        outlineProvider.refresh();
      }
    }),
  );
}

function isJrxmlDocument(document: vscode.TextDocument): boolean {
  return document.languageId === "jrxml";
}

/**
 * Registers XML file associations so the Red Hat XML extension applies
 * the bundled (or user-overridden) XSD schemas to .jrxml and .jrtx files.
 */
async function registerXmlFileAssociations(
  context: vscode.ExtensionContext,
): Promise<void> {
  const version = getSchemaVersion();
  const customJrxmlPath = getCustomJrxmlSchemaPath();
  const customJrtxPath = getCustomJrtxSchemaPath();

  const jrxmlXsd =
    customJrxmlPath ||
    vscode.Uri.file(
      path.join(context.extensionPath, "schemas", version, "jrxml.xsd"),
    ).toString();
  const jrtxXsd =
    customJrtxPath ||
    vscode.Uri.file(
      path.join(context.extensionPath, "schemas", version, "jrtx.xsd"),
    ).toString();

  const xmlConfig = vscode.workspace.getConfiguration("xml");
  const associations = xmlConfig.get<
    Array<{ pattern: string; systemId: string }>
  >("fileAssociations", []);

  const jrxmlAssoc = { pattern: "**/*.jrxml", systemId: jrxmlXsd };
  const jrtxAssoc = { pattern: "**/*.jrtx", systemId: jrtxXsd };

  // Remove any existing JasperReports associations to avoid duplicates
  const filtered = associations.filter(
    (a) => a.pattern !== "**/*.jrxml" && a.pattern !== "**/*.jrtx",
  );
  filtered.push(jrxmlAssoc, jrtxAssoc);

  await xmlConfig.update(
    "fileAssociations",
    filtered,
    vscode.ConfigurationTarget.Workspace,
  );
}

/**
 * Activates the Red Hat XML extension so it processes .jrxml/.jrtx files.
 * vscode-xml only activates on `onLanguage:xml` by default; opening a .jrxml
 * alone won't trigger it. We activate it programmatically and recommend
 * installation if it's missing.
 */
async function activateXmlExtension(): Promise<void> {
  const xmlExt = vscode.extensions.getExtension(XML_EXTENSION_ID);
  if (xmlExt) {
    if (!xmlExt.isActive) {
      await xmlExt.activate();
    }
  } else {
    const choice = await vscode.window.showInformationMessage(
      "Install the 'XML' extension (Red Hat) for JRXML/JRTX validation and auto-completion.",
      "Install",
    );
    if (choice === "Install") {
      vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        XML_EXTENSION_ID,
      );
    }
  }
}
