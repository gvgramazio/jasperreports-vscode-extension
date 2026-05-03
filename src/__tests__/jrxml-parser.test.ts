import { describe, it, expect } from "vitest";
import { parseJrxml } from "../jrxml-parser";

describe("jrxml-parser", () => {
  it("parses a minimal JRXML with root element", () => {
    const xml = `<jasperReport name="Test" pageWidth="595" pageHeight="842"></jasperReport>`;
    const doc = parseJrxml(xml);
    expect(doc.root).not.toBeNull();
    expect(doc.hasErrors).toBe(false);
    expect(doc.root!.tag).toBe("jasperReport");
    expect(doc.root!.attributes["name"]).toBe("Test");
    expect(doc.root!.attributes["pageWidth"]).toBe("595");
  });

  it("returns null root for empty input", () => {
    const doc = parseJrxml("");
    expect(doc.root).toBeNull();
  });

  it("extracts fields with name and class", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
  <field name="name" class="java.lang.String"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const fields = doc.root!.children.filter((c) => c.tag === "field");
    expect(fields).toHaveLength(2);
    expect(fields[0].attributes["name"]).toBe("id");
    expect(fields[0].attributes["class"]).toBe("java.lang.Integer");
    expect(fields[1].attributes["name"]).toBe("name");
  });

  it("extracts parameters", () => {
    const xml = `<jasperReport name="Test">
  <parameter name="ReportTitle" class="java.lang.String"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const params = doc.root!.children.filter((c) => c.tag === "parameter");
    expect(params).toHaveLength(1);
    expect(params[0].attributes["name"]).toBe("ReportTitle");
  });

  it("extracts variables with calculation attribute", () => {
    const xml = `<jasperReport name="Test">
  <variable name="Counter" class="java.lang.Integer" calculation="Count">
    <expression><![CDATA[Boolean.TRUE]]></expression>
  </variable>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const vars = doc.root!.children.filter((c) => c.tag === "variable");
    expect(vars).toHaveLength(1);
    expect(vars[0].attributes["name"]).toBe("Counter");
    expect(vars[0].attributes["calculation"]).toBe("Count");
  });

  it("extracts styles", () => {
    const xml = `<jasperReport name="Test">
  <style name="Sans_Normal" default="true" fontName="DejaVu Sans"/>
  <style name="Sans_Bold" fontName="DejaVu Sans" bold="true"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const styles = doc.root!.children.filter((c) => c.tag === "style");
    expect(styles).toHaveLength(2);
    expect(styles[0].attributes["name"]).toBe("Sans_Normal");
    expect(styles[0].attributes["default"]).toBe("true");
  });

  it("extracts bands with elements using kind attribute", () => {
    const xml = `<jasperReport name="Test">
  <detail>
    <band height="20">
      <element kind="textField" x="0" y="0" width="100" height="20">
        <expression><![CDATA[$F{name}]]></expression>
      </element>
      <element kind="staticText" x="100" y="0" width="50" height="20">
        <text><![CDATA[Label]]></text>
      </element>
    </band>
  </detail>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const detail = doc.root!.children.find((c) => c.tag === "detail");
    expect(detail).toBeDefined();
    const band = detail!.children.find((c) => c.tag === "band");
    expect(band).toBeDefined();
    expect(band!.attributes["height"]).toBe("20");
    const elements = band!.children.filter((c) => c.tag === "element");
    expect(elements).toHaveLength(2);
    expect(elements[0].attributes["kind"]).toBe("textField");
    expect(elements[1].attributes["kind"]).toBe("staticText");
  });

  it("extracts groups with header and footer bands", () => {
    const xml = `<jasperReport name="Test">
  <group name="CityGroup">
    <groupHeader>
      <band height="20">
        <element kind="textField" x="0" y="0" width="100" height="15"/>
      </band>
    </groupHeader>
    <groupFooter>
      <band height="15">
        <element kind="staticText" x="0" y="0" width="50" height="15"/>
      </band>
    </groupFooter>
  </group>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const groups = doc.root!.children.filter((c) => c.tag === "group");
    expect(groups).toHaveLength(1);
    expect(groups[0].attributes["name"]).toBe("CityGroup");
    const headers = groups[0].children.filter((c) => c.tag === "groupHeader");
    expect(headers).toHaveLength(1);
    const footers = groups[0].children.filter((c) => c.tag === "groupFooter");
    expect(footers).toHaveLength(1);
    const headerBand = headers[0].children.find((c) => c.tag === "band");
    expect(headerBand).toBeDefined();
    expect(
      headerBand!.children.filter((c) => c.tag === "element"),
    ).toHaveLength(1);
  });

  it("tracks line positions correctly", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
  <title height="50">
    <band height="50">
      <element kind="staticText" x="0" y="0" width="100" height="20"/>
    </band>
  </title>
</jasperReport>`;
    const doc = parseJrxml(xml);
    // Root starts at line 1
    expect(doc.root!.position.startLine).toBe(1);
    // Field is on line 2
    const field = doc.root!.children.find((c) => c.tag === "field");
    expect(field!.position.startLine).toBe(2);
    // Title starts on line 3
    const title = doc.root!.children.find((c) => c.tag === "title");
    expect(title!.position.startLine).toBe(3);
  });

  it("handles malformed XML gracefully", () => {
    const xml = `<jasperReport name="Test">
  <field name="id"
  <broken`;
    const doc = parseJrxml(xml);
    // Should not throw, returns whatever was parsed
    expect(doc).toBeDefined();
    expect(doc.hasErrors).toBe(true);
  });

  it("parses self-closing elements", () => {
    const xml = `<jasperReport name="Test">
  <sortField name="city" order="Descending"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const sortFields = doc.root!.children.filter((c) => c.tag === "sortField");
    expect(sortFields).toHaveLength(1);
    expect(sortFields[0].attributes["name"]).toBe("city");
    expect(sortFields[0].attributes["order"]).toBe("Descending");
  });

  it("extracts multiple sections", () => {
    const xml = `<jasperReport name="Test">
  <title height="70"/>
  <pageHeader height="20"/>
  <detail>
    <band height="15"/>
  </detail>
  <pageFooter height="40"/>
  <summary height="30"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const tags = doc.root!.children.map((c) => c.tag);
    expect(tags).toContain("title");
    expect(tags).toContain("pageHeader");
    expect(tags).toContain("detail");
    expect(tags).toContain("pageFooter");
    expect(tags).toContain("summary");
  });

  it("captures CDATA text content", () => {
    const xml = `<jasperReport name="Test">
  <variable name="x" class="java.lang.Integer">
    <expression><![CDATA[$F{amount} + 1]]></expression>
  </variable>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const variable = doc.root!.children.find((c) => c.tag === "variable");
    const expr = variable!.children.find((c) => c.tag === "expression");
    expect(expr!.text).toBe("$F{amount} + 1");
  });

  it("captures plain text content", () => {
    const xml = `<jasperReport name="Test">
  <property name="key">value</property>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const prop = doc.root!.children.find((c) => c.tag === "property");
    expect(prop!.text).toBe("value");
  });

  it("text is undefined when element has no text content", () => {
    const xml = `<jasperReport name="Test">
  <field name="id" class="java.lang.Integer"/>
</jasperReport>`;
    const doc = parseJrxml(xml);
    const field = doc.root!.children.find((c) => c.tag === "field");
    expect(field!.text).toBeUndefined();
  });

  it("tracks attribute positions with correct byte offsets", () => {
    const xml = `<jasperReport name="Test" pageWidth="595">
</jasperReport>`;
    const doc = parseJrxml(xml);
    const root = doc.root!;
    expect(root.attributePositions).toBeDefined();
    expect(root.attributePositions!["name"]).toBeDefined();
    expect(root.attributePositions!["pageWidth"]).toBeDefined();

    // Verify the value offsets point to correct content
    const namePos = root.attributePositions!["name"];
    expect(xml.substring(namePos.valueStart, namePos.valueEnd)).toBe("Test");

    const pwPos = root.attributePositions!["pageWidth"];
    expect(xml.substring(pwPos.valueStart, pwPos.valueEnd)).toBe("595");
  });

  it("tracks attribute name positions", () => {
    const xml = `<field name="id" class="java.lang.Integer"/>`;
    const doc = parseJrxml(xml);
    const field = doc.root!;
    const namePos = field.attributePositions!["name"];
    expect(xml.substring(namePos.nameStart, namePos.nameEnd)).toBe("name");

    const classPos = field.attributePositions!["class"];
    expect(xml.substring(classPos.nameStart, classPos.nameEnd)).toBe("class");
  });

  it("handles multi-line attribute positions", () => {
    const xml = `<element
  kind="textField"
  x="10"
  y="20"/>`;
    const doc = parseJrxml(xml);
    const el = doc.root!;
    expect(el.attributePositions).toBeDefined();

    const kindPos = el.attributePositions!["kind"];
    expect(xml.substring(kindPos.valueStart, kindPos.valueEnd)).toBe(
      "textField",
    );

    const xPos = el.attributePositions!["x"];
    expect(xml.substring(xPos.valueStart, xPos.valueEnd)).toBe("10");

    const yPos = el.attributePositions!["y"];
    expect(xml.substring(yPos.valueStart, yPos.valueEnd)).toBe("20");
  });

  it("attributePositions is undefined when no attributes", () => {
    const xml = `<root></root>`;
    const doc = parseJrxml(xml);
    expect(doc.root!.attributePositions).toBeUndefined();
  });
});
