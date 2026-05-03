import { JrxmlNode, AttributePosition } from "../jrxml-parser";

export interface PropertyEntry {
  name: string;
  value: string;
  editable?: boolean;
  attributePosition?: AttributePosition;
}

export interface PropertyGroup {
  label: string;
  entries: PropertyEntry[];
}

const EXPRESSION_TAGS = new Set([
  "printWhenExpression",
  "imageExpression",
  "textFieldExpression",
  "variableExpression",
  "initialValueExpression",
  "groupExpression",
  "datasetParameterExpression",
  "connectionExpression",
  "dataSourceExpression",
  "anchorNameExpression",
  "bookmarkLevelExpression",
  "hyperlinkReferenceExpression",
  "hyperlinkAnchorExpression",
  "hyperlinkPageExpression",
  "hyperlinkTooltipExpression",
  "patternExpression",
]);

const BOX_SIDES = ["top", "bottom", "left", "right"] as const;

export function formatNodeProperties(node: JrxmlNode): PropertyGroup[] {
  const groups: PropertyGroup[] = [];

  // Attributes
  const attrEntries = Object.entries(node.attributes).map(([name, value]) => ({
    name,
    value,
    editable: true,
    attributePosition: node.attributePositions?.[name],
  }));
  if (attrEntries.length > 0) {
    groups.push({ label: "Attributes", entries: attrEntries });
  }

  // Expressions
  const exprEntries: PropertyEntry[] = [];
  for (const child of node.children) {
    if (EXPRESSION_TAGS.has(child.tag)) {
      const text = child.text?.trim();
      if (text) {
        exprEntries.push({ name: child.tag, value: text });
      }
    }
  }
  if (exprEntries.length > 0) {
    groups.push({ label: "Expressions", entries: exprEntries });
  }

  // Style references
  const styleRef = node.attributes["style"];
  if (styleRef) {
    groups.push({
      label: "Style",
      entries: [{ name: "style", value: styleRef }],
    });
  }

  // Box (pen) properties
  const box = node.children.find((c) => c.tag === "box");
  if (box) {
    const boxEntries: PropertyEntry[] = [];
    for (const [name, value] of Object.entries(box.attributes)) {
      boxEntries.push({ name, value });
    }
    for (const side of BOX_SIDES) {
      const pen = box.children.find((c) => c.tag === `${side}Pen`);
      if (pen) {
        for (const [name, value] of Object.entries(pen.attributes)) {
          boxEntries.push({ name: `${side}.${name}`, value });
        }
      }
    }
    if (boxEntries.length > 0) {
      groups.push({ label: "Box", entries: boxEntries });
    }
  }

  // Pen properties (direct child)
  const pen = node.children.find((c) => c.tag === "pen");
  if (pen) {
    const penEntries = Object.entries(pen.attributes).map(([name, value]) => ({
      name,
      value,
    }));
    if (penEntries.length > 0) {
      groups.push({ label: "Pen", entries: penEntries });
    }
  }

  // reportElement child (common to all visual elements)
  const reportElement = node.children.find((c) => c.tag === "reportElement");
  if (reportElement) {
    const reEntries = Object.entries(reportElement.attributes).map(
      ([name, value]) => ({ name, value }),
    );
    if (reEntries.length > 0) {
      groups.push({ label: "Report Element", entries: reEntries });
    }
  }

  return groups;
}
