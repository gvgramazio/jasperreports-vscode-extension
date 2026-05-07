import * as vscode from "vscode";
import { JrxmlNode } from "./jrxml-parser";
import { jasperReportDef } from "./model/elements/jasperReport";

/**
 * Convert a camelCase tag name to a human-readable label.
 * e.g. "pageHeader" → "Page Header", "noData" → "No Data"
 */
export function tagToLabel(tag: string): string {
  return tag
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Section tags derived from jasperReport model children.
 * Sections are the single-occurrence band-container children.
 */
const NON_SECTION_SINGULAR_TAGS = new Set(["query"]);

export const SECTION_TAGS: readonly string[] = jasperReportDef.children
  .filter((c) => c.maxOccurs === 1 && !NON_SECTION_SINGULAR_TAGS.has(c.tag))
  .map((c) => c.tag);

export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  SECTION_TAGS.map((tag) => [tag, tagToLabel(tag)]),
);

export type OutlineItemKind =
  | "root"
  | "group-properties"
  | "group-styles"
  | "group-parameters"
  | "group-fields"
  | "group-variables"
  | "group-sortFields"
  | "group-groups"
  | "section"
  | "property"
  | "style"
  | "parameter"
  | "field"
  | "variable"
  | "sortField"
  | "group"
  | "groupHeader"
  | "groupFooter"
  | "band"
  | "element"
  | "add-section";

export class OutlineItem extends vscode.TreeItem {
  public parent: OutlineItem | null = null;

  constructor(
    public readonly label: string,
    public readonly kind: OutlineItemKind,
    public readonly node: JrxmlNode | null,
    public readonly children: OutlineItem[],
    description?: string,
  ) {
    super(
      label,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.description = description;
    this.iconPath = getIcon(kind);
    this.contextValue = kind;
    if (node?.position) {
      this.command = {
        command: "jasperreports.outline.reveal",
        title: "Go to Element",
        arguments: [node.position],
      };
    }
    // Set parent on children
    for (const child of children) {
      child.parent = this;
    }
  }
}

export function getIcon(kind: OutlineItemKind): vscode.ThemeIcon {
  switch (kind) {
    case "root":
      return new vscode.ThemeIcon("file");
    case "group-properties":
      return new vscode.ThemeIcon("symbol-property");
    case "group-styles":
      return new vscode.ThemeIcon("symbol-color");
    case "group-parameters":
      return new vscode.ThemeIcon("symbol-constant");
    case "group-fields":
      return new vscode.ThemeIcon("symbol-field");
    case "group-variables":
      return new vscode.ThemeIcon("symbol-variable");
    case "group-sortFields":
      return new vscode.ThemeIcon("arrow-swap");
    case "group-groups":
      return new vscode.ThemeIcon("list-tree");
    case "section":
      return new vscode.ThemeIcon("layout");
    case "property":
      return new vscode.ThemeIcon("symbol-property");
    case "style":
      return new vscode.ThemeIcon("symbol-color");
    case "parameter":
      return new vscode.ThemeIcon("symbol-constant");
    case "field":
      return new vscode.ThemeIcon("symbol-field");
    case "variable":
      return new vscode.ThemeIcon("symbol-variable");
    case "sortField":
      return new vscode.ThemeIcon("arrow-swap");
    case "group":
      return new vscode.ThemeIcon("list-tree");
    case "groupHeader":
    case "groupFooter":
      return new vscode.ThemeIcon("layout");
    case "band":
      return new vscode.ThemeIcon("layout");
    case "element":
      return new vscode.ThemeIcon("symbol-misc");
    case "add-section":
      return new vscode.ThemeIcon("add");
  }
}
