import * as vscode from "vscode";
import * as path from "path";

const XML_EXTENSION_ID = "redhat.vscode-xml";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  console.log("JasperReports extension is now active.");

  registerXmlFileAssociations(context);
  await activateXmlExtension();
}

export function deactivate(): void {
  // cleanup
}

/**
 * Registers XML file associations so the Red Hat XML extension applies
 * the bundled (or user-overridden) XSD schemas to .jrxml and .jrtx files.
 */
function registerXmlFileAssociations(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("jasperreports");
  const version = config.get<string>("schema.version", "7.0.6");
  const customJrxmlPath = config.get<string>("schema.jrxmlPath", "");
  const customJrtxPath = config.get<string>("schema.jrtxPath", "");

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

  xmlConfig.update(
    "fileAssociations",
    filtered,
    vscode.ConfigurationTarget.Global,
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
    vscode.window
      .showInformationMessage(
        "Install the 'XML' extension (Red Hat) for JRXML/JRTX validation and auto-completion.",
        "Install",
      )
      .then((choice) => {
        if (choice === "Install") {
          vscode.commands.executeCommand(
            "workbench.extensions.installExtension",
            XML_EXTENSION_ID,
          );
        }
      });
  }
}
