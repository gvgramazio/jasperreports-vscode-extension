import { describe, it, expect, vi } from "vitest";
import { Uri } from "vscode";
import { parseJrxml } from "../jrxml-parser";
import { JrxmlOutlineProvider } from "../outline";
import { PropertiesViewProvider } from "../properties/PropertiesViewProvider";
import { formatNodeProperties } from "../properties/formatNode";
// Ensure model elements are registered
import "../model/elements";

describe("parse → outline → properties integration", () => {
  const SAMPLE_JRXML = `<jasperReport name="IntegrationTest" pageWidth="595" pageHeight="842">
  <style name="Bold" isBold="true"/>
  <parameter name="Title" class="java.lang.String"/>
  <field name="id" class="java.lang.Integer"/>
  <field name="name" class="java.lang.String"/>
  <variable name="RowCount" class="java.lang.Integer" calculation="Count"/>
  <title height="50">
    <band height="50">
      <element kind="staticText" x="0" y="0" width="200" height="30">
        <text><![CDATA[Integration Test Report]]></text>
      </element>
    </band>
  </title>
  <detail>
    <band height="20">
      <element kind="textField" x="0" y="0" width="100" height="20">
        <expression><![CDATA[$F{name}]]></expression>
      </element>
    </band>
  </detail>
</jasperReport>`;

  it("parses JRXML, builds outline tree, and formats properties for a field", () => {
    // Step 1: Parse
    const doc = parseJrxml(SAMPLE_JRXML);
    expect(doc.hasErrors).toBe(false);
    expect(doc.root).not.toBeNull();

    // Step 2: Build outline
    const outlineProvider = new JrxmlOutlineProvider();
    outlineProvider.refresh(SAMPLE_JRXML);
    const roots = outlineProvider.getChildren();
    expect(roots.length).toBeGreaterThan(0);

    // Find the Fields group
    const fieldsGroup = roots.find((r) => r.label === "Fields");
    expect(fieldsGroup).toBeDefined();

    const fieldItems = outlineProvider.getChildren(fieldsGroup);
    expect(fieldItems).toHaveLength(2);
    expect(fieldItems[0].label).toBe("id");
    expect(fieldItems[1].label).toBe("name");

    // Step 3: Format properties for the "id" field node
    const idNode = fieldItems[0].node!;
    expect(idNode.tag).toBe("field");
    expect(idNode.attributes["name"]).toBe("id");

    const groups = formatNodeProperties(idNode);
    expect(groups.length).toBeGreaterThan(0);

    const attrGroup = groups.find((g) => g.label === "Field");
    expect(attrGroup).toBeDefined();

    const nameEntry = attrGroup!.entries.find((e) => e.name === "name");
    expect(nameEntry).toBeDefined();
    expect(nameEntry!.value).toBe("id");
  });

  it("renders properties HTML via PropertiesViewProvider for an outline node", () => {
    const outlineProvider = new JrxmlOutlineProvider();
    outlineProvider.refresh(SAMPLE_JRXML);
    const roots = outlineProvider.getChildren();

    const parametersGroup = roots.find((r) => r.label === "Parameters");
    const paramItems = outlineProvider.getChildren(parametersGroup);
    expect(paramItems).toHaveLength(1);
    expect(paramItems[0].label).toBe("Title");

    // Set up PropertiesViewProvider with a mock webview
    const extensionUri = Uri.file("/ext");
    const provider = new PropertiesViewProvider(extensionUri as never);
    const mockWebviewView = {
      webview: {
        options: {},
        html: "",
        asWebviewUri: vi.fn(
          (uri: { fsPath: string }) => `vscode-webview:///${uri.fsPath}`,
        ),
        cspSource: "https://webview.example",
        onDidReceiveMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        postMessage: vi.fn(),
      },
    };
    provider.resolveWebviewView(mockWebviewView as never);

    // Update with the outline node
    const paramNode = paramItems[0].node!;
    provider.update(paramNode, paramItems[0].label);

    expect(mockWebviewView.webview.html).toContain("Title");
    expect(mockWebviewView.webview.html).toContain("Parameter");
    expect(mockWebviewView.webview.html).toContain("name");
  });

  it("handles element with expression through the full pipeline", () => {
    const outlineProvider = new JrxmlOutlineProvider();
    outlineProvider.refresh(SAMPLE_JRXML);
    const roots = outlineProvider.getChildren();

    // Navigate to detail > band > textField
    const detailSection = roots.find((r) => r.label === "Detail");
    expect(detailSection).toBeDefined();

    const detailChildren = outlineProvider.getChildren(detailSection);
    // band
    expect(detailChildren.length).toBeGreaterThan(0);

    const bandChildren = outlineProvider.getChildren(detailChildren[0]);
    expect(bandChildren.length).toBeGreaterThan(0);

    const textFieldItem = bandChildren[0];
    const textFieldNode = textFieldItem.node!;

    // Verify the parsed node has expression child
    const exprChild = textFieldNode.children.find(
      (c) => c.tag === "expression",
    );
    expect(exprChild).toBeDefined();
    expect(exprChild!.text).toBe("$F{name}");

    // Format properties should include expressions
    const groups = formatNodeProperties(textFieldNode);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup).toBeDefined();
    const exprEntry = exprGroup!.entries.find((e) => e.name === "expression");
    expect(exprEntry).toBeDefined();
    expect(exprEntry!.value).toBe("$F{name}");
  });
});
