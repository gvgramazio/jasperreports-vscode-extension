import { JrxmlNode } from "../../jrxml-parser";

export function makeNode(overrides: Partial<JrxmlNode> = {}): JrxmlNode {
  return {
    tag: "element",
    attributes: {},
    children: [],
    position: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
    ...overrides,
  };
}
