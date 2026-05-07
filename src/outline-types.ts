import * as vscode from "vscode";
import { JrxmlNode } from "./jrxml-parser";

export const SECTION_TAGS = [
  "title",
  "pageHeader",
  "columnHeader",
  "detail",
  "columnFooter",
  "pageFooter",
  "lastPageFooter",
  "summary",
  "noData",
  "background",
] as const;

export const SECTION_LABELS: Record<string, string> = {
  title: "Title",
  pageHeader: "Page Header",
  columnHeader: "Column Header",
  detail: "Detail",
  columnFooter: "Column Footer",
  pageFooter: "Page Footer",
  lastPageFooter: "Last Page Footer",
  summary: "Summary",
  noData: "No Data",
  background: "Background",
};

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
