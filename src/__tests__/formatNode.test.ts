import { describe, it, expect } from "vitest";
import { formatNodeProperties, PropertyGroup } from "../properties/formatNode";
import { JrxmlNode } from "../jrxml-parser";
// Ensure model elements are registered
import "../model/elements";

function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "unknownTag",
    attributes: {},
    children: [],
    position: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
    ...overrides,
  };
}

describe("formatNodeProperties — legacy (no model)", () => {
  it("returns empty array for node with no attributes or children", () => {
    const node = makeNode();
    expect(formatNodeProperties(node)).toEqual([]);
  });

  it("returns Attributes group for node attributes", () => {
    const node = makeNode({
      attributes: { x: "10", y: "20", width: "100", height: "50" },
    });
    const groups = formatNodeProperties(node);
    expect(groups[0].label).toBe("Attributes");
    expect(groups[0].entries).toHaveLength(4);
    expect(groups[0].entries[0]).toMatchObject({
      name: "x",
      value: "10",
      editable: true,
      present: true,
    });
  });

  it("returns Expressions group for expression children with text", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "textFieldExpression",
          text: "$F{name}",
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup).toBeDefined();
    expect(exprGroup!.entries).toEqual([
      { name: "textFieldExpression", value: "$F{name}", present: true },
    ]);
  });

  it("skips expression children with no text content", () => {
    const node = makeNode({
      children: [
        makeNode({ tag: "textFieldExpression", text: "" }),
        makeNode({ tag: "textFieldExpression" }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup).toBeUndefined();
  });

  it("returns Style group when style attribute present", () => {
    const node = makeNode({
      attributes: { style: "Bold", width: "100" },
    });
    const groups = formatNodeProperties(node);
    const styleGroup = groups.find((g) => g.label === "Style");
    expect(styleGroup).toBeDefined();
    expect(styleGroup!.entries).toEqual([
      { name: "style", value: "Bold", present: true },
    ]);
  });

  it("returns Box group with pen properties", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "box",
          attributes: { padding: "2" },
          children: [
            makeNode({
              tag: "topPen",
              attributes: { lineWidth: "1.0", lineColor: "#000000" },
            }),
          ],
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const boxGroup = groups.find((g) => g.label === "Box");
    expect(boxGroup).toBeDefined();
    expect(boxGroup!.entries).toEqual([
      { name: "padding", value: "2", present: true },
      { name: "top.lineWidth", value: "1.0", present: true },
      { name: "top.lineColor", value: "#000000", present: true },
    ]);
  });

  it("returns Pen group for direct pen child", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "pen",
          attributes: { lineWidth: "0.5", lineStyle: "Dashed" },
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const penGroup = groups.find((g) => g.label === "Pen");
    expect(penGroup).toBeDefined();
    expect(penGroup!.entries).toEqual([
      { name: "lineWidth", value: "0.5", present: true },
      { name: "lineStyle", value: "Dashed", present: true },
    ]);
  });

  it("returns Report Element group for reportElement child", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "reportElement",
          attributes: { x: "0", y: "0", width: "200", height: "30" },
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element");
    expect(reGroup).toBeDefined();
    expect(reGroup!.entries).toHaveLength(4);
  });

  it("trims whitespace from expression text", () => {
    const node = makeNode({
      children: [
        makeNode({
          tag: "imageExpression",
          text: "  $P{logo}  ",
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions");
    expect(exprGroup!.entries[0].value).toBe("$P{logo}");
  });

  it("marks uuid attribute as read-only", () => {
    const node = makeNode({
      attributes: { uuid: "abc-123", x: "10" },
    });
    const groups = formatNodeProperties(node);
    const attrGroup = groups.find((g) => g.label === "Attributes")!;
    const uuidEntry = attrGroup.entries.find((e) => e.name === "uuid");
    const xEntry = attrGroup.entries.find((e) => e.name === "x");
    expect(uuidEntry!.editable).toBe(false);
    expect(xEntry!.editable).toBe(true);
  });

  it("skips Box group when box child has no attributes and no pens", () => {
    const node = makeNode({
      children: [makeNode({ tag: "box", attributes: {}, children: [] })],
    });
    const groups = formatNodeProperties(node);
    const boxGroup = groups.find((g) => g.label === "Box");
    expect(boxGroup).toBeUndefined();
  });

  it("skips Pen group when pen child has no attributes", () => {
    const node = makeNode({
      children: [makeNode({ tag: "pen", attributes: {} })],
    });
    const groups = formatNodeProperties(node);
    const penGroup = groups.find((g) => g.label === "Pen");
    expect(penGroup).toBeUndefined();
  });

  it("skips Report Element group when reportElement has no attributes", () => {
    const node = makeNode({
      children: [makeNode({ tag: "reportElement", attributes: {} })],
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element");
    expect(reGroup).toBeUndefined();
  });
});

describe("formatNodeProperties — model-driven", () => {
  it("uses model attribute groups for a registered element", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField", x: "10", y: "20" },
    });
    const groups = formatNodeProperties(node);
    // Should have model-driven groups, not just "Attributes"
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Report Element");
    expect(labels).toContain("Font");
    expect(labels).toContain("Text Alignment");
    expect(labels).toContain("Text Field");
    expect(labels).toContain("Expressions");
  });

  it("shows all model attributes, marking present vs absent", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField", x: "10" },
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element")!;
    expect(reGroup).toBeDefined();

    const xEntry = reGroup.entries.find((e) => e.name === "x");
    expect(xEntry).toBeDefined();
    expect(xEntry!.value).toBe("10");
    expect(xEntry!.present).toBe(true);

    // width is in model but not in node attributes
    const widthEntry = reGroup.entries.find((e) => e.name === "width");
    expect(widthEntry).toBeDefined();
    expect(widthEntry!.value).toBe("");
    expect(widthEntry!.present).toBe(false);
  });

  it("includes typeInfo from model for known types", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField", x: "10", forecolor: "#FF0000" },
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element")!;

    const xEntry = reGroup.entries.find((e) => e.name === "x");
    expect(xEntry!.typeInfo).toEqual({ type: "integer" });

    const fcEntry = reGroup.entries.find((e) => e.name === "forecolor");
    expect(fcEntry!.typeInfo).toEqual({ type: "color" });
  });

  it("includes expressions from model definition", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField" },
      children: [makeNode({ tag: "expression", text: "$F{name}" })],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions")!;
    expect(exprGroup).toBeDefined();
    // Model defines all expression tags
    const exprEntry = exprGroup.entries.find((e) => e.name === "expression");
    expect(exprEntry).toBeDefined();
    expect(exprEntry!.value).toBe("$F{name}");
    expect(exprEntry!.present).toBe(true);

    // Absent expressions have empty value
    const absentExpr = exprGroup.entries.find(
      (e) => e.name === "patternExpression",
    );
    expect(absentExpr).toBeDefined();
    expect(absentExpr!.value).toBe("");
    expect(absentExpr!.present).toBe(false);
  });

  it("marks expressions as editable with isExpression flag", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField" },
      children: [makeNode({ tag: "expression", text: "$F{name}" })],
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions")!;

    for (const entry of exprGroup.entries) {
      expect(entry.editable).toBe(true);
      expect(entry.isExpression).toBe(true);
    }
  });

  it("marks absent expressions as editable with isExpression flag", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField" },
    });
    const groups = formatNodeProperties(node);
    const exprGroup = groups.find((g) => g.label === "Expressions")!;
    const absentExpr = exprGroup.entries.find(
      (e) => e.name === "patternExpression",
    );
    expect(absentExpr!.editable).toBe(true);
    expect(absentExpr!.isExpression).toBe(true);
    expect(absentExpr!.present).toBe(false);
  });

  it("marks uuid as read-only in model-driven mode", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField", uuid: "abc" },
    });
    const groups = formatNodeProperties(node);
    const reGroup = groups.find((g) => g.label === "Report Element")!;
    const uuidEntry = reGroup.entries.find((e) => e.name === "uuid");
    expect(uuidEntry!.editable).toBe(false);
  });

  it("appends Box group from file for model-driven elements", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField" },
      children: [
        makeNode({
          tag: "box",
          attributes: { padding: "5" },
          children: [],
        }),
      ],
    });
    const groups = formatNodeProperties(node);
    const boxGroup = groups.find((g) => g.label === "Box");
    expect(boxGroup).toBeDefined();
    expect(boxGroup!.entries).toEqual([
      { name: "padding", value: "5", present: true },
    ]);
  });

  it("works for non-element registered tags like field", () => {
    const node = makeNode({
      tag: "field",
      attributes: { name: "myField", class: "java.lang.String" },
    });
    const groups = formatNodeProperties(node);
    // field is registered, should use model groups
    const fieldGroup = groups.find((g) => g.label === "Field");
    expect(fieldGroup).toBeDefined();

    const nameEntry = fieldGroup!.entries.find((e) => e.name === "name");
    expect(nameEntry!.value).toBe("myField");
    expect(nameEntry!.present).toBe(true);
  });

  it("works for band (registered, no kind)", () => {
    const node = makeNode({
      tag: "band",
      attributes: { height: "100", splitType: "Stretch" },
    });
    const groups = formatNodeProperties(node);
    const bandGroup = groups.find((g) => g.label === "Band");
    expect(bandGroup).toBeDefined();

    const heightEntry = bandGroup!.entries.find((e) => e.name === "height");
    expect(heightEntry!.value).toBe("100");
    expect(heightEntry!.present).toBe(true);
    expect(heightEntry!.typeInfo).toEqual({ type: "integer" });
  });

  it("includes enum typeInfo with enumValues", () => {
    const node = makeNode({
      tag: "element",
      attributes: { kind: "textField", hTextAlign: "Center" },
    });
    const groups = formatNodeProperties(node);
    const alignGroup = groups.find((g) => g.label === "Text Alignment")!;
    const entry = alignGroup.entries.find((e) => e.name === "hTextAlign");
    expect(entry!.typeInfo?.type).toBe("enum");
    expect(entry!.typeInfo?.enumValues).toContain("Left");
    expect(entry!.typeInfo?.enumValues).toContain("Center");
    expect(entry!.typeInfo?.enumValues).toContain("Right");
  });

  it("falls back to legacy for unregistered tags", () => {
    const node = makeNode({
      tag: "customTag",
      attributes: { foo: "bar" },
    });
    const groups = formatNodeProperties(node);
    expect(groups[0].label).toBe("Attributes");
    expect(groups[0].entries[0]).toMatchObject({
      name: "foo",
      value: "bar",
      present: true,
    });
  });
});
