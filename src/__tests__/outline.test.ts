import { describe, it, expect, beforeEach } from "vitest";
import { JrxmlOutlineProvider, revealPosition } from "../outline";
import * as vscode from "vscode";

describe("JrxmlOutlineProvider", () => {
  let provider: JrxmlOutlineProvider;

  beforeEach(() => {
    provider = new JrxmlOutlineProvider();
  });

  it("returns empty array when no document is parsed", () => {
    const children = provider.getChildren();
    expect(children).toEqual([]);
  });

  it("returns root groups for a valid JRXML", () => {
    const xml = `<jasperReport name="Test" pageWidth="595" pageHeight="842">
  <style name="Normal" default="true"/>
  <parameter name="Title" class="java.lang.String"/>
  <field name="id" class="java.lang.Integer"/>
  <variable name="Count" class="java.lang.Integer" calculation="Count"/>
  <title height="50"/>
  <detail>
    <band height="20">
      <element kind="textField" x="0" y="0" width="100" height="20"/>
    </band>
  </detail>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const labels = roots.map((r) => r.label);
    expect(labels).toContain("Properties");
    expect(labels).toContain("Styles");
    expect(labels).toContain("Parameters");
    expect(labels).toContain("Fields");
    expect(labels).toContain("Variables");
    expect(labels).toContain("Title");
    expect(labels).toContain("Detail");
  });

  it("hides empty sections and groups", () => {
    const xml = `<jasperReport name="Test" pageWidth="595">
  <field name="id" class="java.lang.Integer"/>
  <detail>
    <band height="20"/>
  </detail>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const labels = roots.map((r) => r.label);
    expect(labels).not.toContain("Styles");
    expect(labels).not.toContain("Parameters");
    expect(labels).not.toContain("Variables");
    expect(labels).not.toContain("Sort Fields");
    expect(labels).not.toContain("Groups");
    expect(labels).not.toContain("Page Header");
    expect(labels).not.toContain("Summary");
  });

  it("shows element items with kind label and dimension description", () => {
    const xml = `<jasperReport name="Test">
  <detail>
    <band height="20">
      <element kind="textField" x="10" y="5" width="200" height="15"/>
    </band>
  </detail>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const detail = roots.find((r) => r.label === "Detail");
    expect(detail).toBeDefined();
    const bandItems = provider.getChildren(detail);
    expect(bandItems).toHaveLength(1);
    expect(bandItems[0].label).toBe("Band");
    expect(bandItems[0].description).toBe("h=20");
    const elements = provider.getChildren(bandItems[0]);
    expect(elements).toHaveLength(1);
    expect(elements[0].label).toBe("textField");
    expect(elements[0].description).toBe("10,5 200\u00D715");
  });

  it("shows variables with class and calculation in description", () => {
    const xml = `<jasperReport name="Test">
  <variable name="Total" class="java.math.BigDecimal" calculation="Sum"/>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const variables = roots.find((r) => r.label === "Variables");
    expect(variables).toBeDefined();
    const varItems = provider.getChildren(variables);
    expect(varItems).toHaveLength(1);
    expect(varItems[0].label).toBe("Total");
    expect(varItems[0].description).toBe("BigDecimal (Sum)");
  });

  it("shows groups with header and footer", () => {
    const xml = `<jasperReport name="Test">
  <group name="CityGroup">
    <groupHeader>
      <band height="20">
        <element kind="textField" x="0" y="0" width="100" height="15"/>
      </band>
    </groupHeader>
    <groupFooter>
      <band height="10"/>
    </groupFooter>
  </group>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const groups = roots.find((r) => r.label === "Groups");
    expect(groups).toBeDefined();
    const groupItems = provider.getChildren(groups);
    expect(groupItems).toHaveLength(1);
    expect(groupItems[0].label).toBe("CityGroup");
    const groupChildren = provider.getChildren(groupItems[0]);
    const childLabels = groupChildren.map((c) => c.label);
    expect(childLabels).toContain("Header");
    expect(childLabels).toContain("Footer");
  });

  it("clears tree when refresh is called without text", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
</jasperReport>`;
    provider.refresh(xml);
    expect(provider.getChildren().length).toBeGreaterThan(0);
    provider.refresh();
    expect(provider.getChildren()).toEqual([]);
  });

  it("all items are collapsed by default", () => {
    const xml = `<jasperReport name="Test" pageWidth="595">
  <field name="id" class="java.lang.Integer"/>
  <detail>
    <band height="20">
      <element kind="textField" x="0" y="0" width="100" height="20"/>
    </band>
  </detail>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    for (const item of roots) {
      if (item.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
        expect(item.collapsibleState).toBe(
          vscode.TreeItemCollapsibleState.Collapsed,
        );
      }
    }
  });

  it("leaf nodes have collapsible state None", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const fields = roots.find((r) => r.label === "Fields");
    const fieldItems = provider.getChildren(fields);
    expect(fieldItems[0].collapsibleState).toBe(
      vscode.TreeItemCollapsibleState.None,
    );
  });

  it("element items have a command for navigation", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const fields = roots.find((r) => r.label === "Fields");
    const fieldItems = provider.getChildren(fields);
    expect(fieldItems[0].command).toBeDefined();
    expect(fieldItems[0].command!.command).toBe("jasperreports.outline.reveal");
  });

  it("styles show default indicator in description", () => {
    const xml = `<jasperReport name="Test">
  <style name="Normal" default="true"/>
  <style name="Bold"/>
</jasperReport>`;
    provider.refresh(xml);
    const roots = provider.getChildren();
    const styles = roots.find((r) => r.label === "Styles");
    const styleItems = provider.getChildren(styles);
    expect(styleItems[0].description).toBe("default");
    expect(styleItems[1].description).toBeUndefined();
  });
});

describe("revealPosition", () => {
  it("does nothing when no active editor", () => {
    vscode.window.activeTextEditor = undefined;
    // Should not throw
    revealPosition({ startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 });
  });
});
