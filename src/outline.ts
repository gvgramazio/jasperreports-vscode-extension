import * as vscode from "vscode";
import {
  parseJrxml,
  JrxmlNode,
  JrxmlDocument,
  NodePosition,
} from "./jrxml-parser";

const SECTION_TAGS = [
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

const SECTION_LABELS: Record<string, string> = {
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

type OutlineItemKind =
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
  | "element";

export class OutlineItem extends vscode.TreeItem {
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
    if (node?.position) {
      this.command = {
        command: "jasperreports.outline.reveal",
        title: "Go to Element",
        arguments: [node.position],
      };
    }
  }
}

function getIcon(kind: OutlineItemKind): vscode.ThemeIcon {
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
  }
}

export class JrxmlOutlineProvider implements vscode.TreeDataProvider<OutlineItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    OutlineItem | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private document: JrxmlDocument = { root: null };

  refresh(text?: string): void {
    if (text !== undefined) {
      this.document = parseJrxml(text);
    } else {
      this.document = { root: null };
    }
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: OutlineItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: OutlineItem): OutlineItem[] {
    if (!element) {
      return this.buildRoot();
    }
    return element.children;
  }

  private buildRoot(): OutlineItem[] {
    const root = this.document.root;
    if (!root) return [];

    const items: OutlineItem[] = [];

    // Properties (report attributes)
    const propItems = this.buildProperties(root);
    if (propItems.length > 0) {
      items.push(
        new OutlineItem("Properties", "group-properties", null, propItems),
      );
    }

    // Styles
    const styles = root.children.filter((c) => c.tag === "style");
    if (styles.length > 0) {
      items.push(
        new OutlineItem(
          "Styles",
          "group-styles",
          null,
          styles.map((s) => this.buildStyleItem(s)),
        ),
      );
    }

    // Parameters
    const params = root.children.filter((c) => c.tag === "parameter");
    if (params.length > 0) {
      items.push(
        new OutlineItem(
          "Parameters",
          "group-parameters",
          null,
          params.map((p) => this.buildDataItem(p, "parameter")),
        ),
      );
    }

    // Fields
    const fields = root.children.filter((c) => c.tag === "field");
    if (fields.length > 0) {
      items.push(
        new OutlineItem(
          "Fields",
          "group-fields",
          null,
          fields.map((f) => this.buildDataItem(f, "field")),
        ),
      );
    }

    // Variables
    const variables = root.children.filter((c) => c.tag === "variable");
    if (variables.length > 0) {
      items.push(
        new OutlineItem(
          "Variables",
          "group-variables",
          null,
          variables.map((v) => this.buildVariableItem(v)),
        ),
      );
    }

    // Sort Fields
    const sortFields = root.children.filter((c) => c.tag === "sortField");
    if (sortFields.length > 0) {
      items.push(
        new OutlineItem(
          "Sort Fields",
          "group-sortFields",
          null,
          sortFields.map((s) => this.buildDataItem(s, "sortField")),
        ),
      );
    }

    // Groups
    const groups = root.children.filter((c) => c.tag === "group");
    if (groups.length > 0) {
      items.push(
        new OutlineItem(
          "Groups",
          "group-groups",
          null,
          groups.map((g) => this.buildGroupItem(g)),
        ),
      );
    }

    // Sections (bands)
    for (const tag of SECTION_TAGS) {
      const sections = root.children.filter((c) => c.tag === tag);
      for (const section of sections) {
        items.push(this.buildSectionItem(section, tag));
      }
    }

    return items;
  }

  private buildProperties(root: JrxmlNode): OutlineItem[] {
    const items: OutlineItem[] = [];
    const skipAttrs = new Set(["name", "uuid"]);
    for (const [key, value] of Object.entries(root.attributes)) {
      if (skipAttrs.has(key)) continue;
      items.push(new OutlineItem(key, "property", null, [], value));
    }
    return items;
  }

  private buildStyleItem(node: JrxmlNode): OutlineItem {
    const name = node.attributes["name"] || "unnamed";
    const isDefault = node.attributes["default"] === "true";
    const desc = isDefault ? "default" : undefined;
    return new OutlineItem(name, "style", node, [], desc);
  }

  private buildDataItem(
    node: JrxmlNode,
    kind: "parameter" | "field" | "sortField",
  ): OutlineItem {
    const name = node.attributes["name"] || "unnamed";
    const cls = node.attributes["class"] || "";
    const shortClass = cls.split(".").pop() || "";
    return new OutlineItem(name, kind, node, [], shortClass);
  }

  private buildVariableItem(node: JrxmlNode): OutlineItem {
    const name = node.attributes["name"] || "unnamed";
    const cls = node.attributes["class"] || "";
    const shortClass = cls.split(".").pop() || "";
    const calc = node.attributes["calculation"] || "";
    const desc = calc ? `${shortClass} (${calc})` : shortClass;
    return new OutlineItem(name, "variable", node, [], desc);
  }

  private buildGroupItem(node: JrxmlNode): OutlineItem {
    const name = node.attributes["name"] || "unnamed";
    const children: OutlineItem[] = [];

    const headers = node.children.filter((c) => c.tag === "groupHeader");
    for (const header of headers) {
      const bands = header.children.filter((c) => c.tag === "band");
      const bandItems = bands.map((b) => this.buildBandItem(b));
      children.push(
        new OutlineItem("Header", "groupHeader", header, bandItems),
      );
    }

    const footers = node.children.filter((c) => c.tag === "groupFooter");
    for (const footer of footers) {
      const bands = footer.children.filter((c) => c.tag === "band");
      const bandItems = bands.map((b) => this.buildBandItem(b));
      children.push(
        new OutlineItem("Footer", "groupFooter", footer, bandItems),
      );
    }

    return new OutlineItem(name, "group", node, children);
  }

  private buildSectionItem(node: JrxmlNode, tag: string): OutlineItem {
    const label = SECTION_LABELS[tag] || tag;
    const bands = node.children.filter((c) => c.tag === "band");
    // If the section itself is a band container (e.g. <detail><band>...)
    if (bands.length > 0) {
      const bandItems = bands.map((b) => this.buildBandItem(b));
      return new OutlineItem(label, "section", node, bandItems);
    }
    // Some sections have the band attributes directly (e.g. <title height="70">)
    // Treat as a band with elements directly inside
    const elements = node.children.filter((c) => c.tag === "element");
    if (elements.length > 0) {
      const elementItems = elements.map((e) => this.buildElementItem(e));
      return new OutlineItem(label, "section", node, elementItems);
    }
    return new OutlineItem(label, "section", node, []);
  }

  private buildBandItem(node: JrxmlNode): OutlineItem {
    const height = node.attributes["height"] || "?";
    const elements = node.children.filter((c) => c.tag === "element");
    const elementItems = elements.map((e) => this.buildElementItem(e));
    return new OutlineItem("Band", "band", node, elementItems, `h=${height}`);
  }

  private buildElementItem(node: JrxmlNode): OutlineItem {
    const kind = node.attributes["kind"] || "unknown";
    const x = node.attributes["x"] || "0";
    const y = node.attributes["y"] || "0";
    const w = node.attributes["width"] || "0";
    const h = node.attributes["height"] || "0";
    const desc = `${x},${y} ${w}\u00D7${h}`;
    return new OutlineItem(kind, "element", node, [], desc);
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}

export function revealPosition(position: NodePosition): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  // saxes lines are 1-based, VS Code positions are 0-based
  const startPos = new vscode.Position(
    position.startLine - 1,
    Math.max(0, position.startColumn - 1),
  );
  const range = new vscode.Range(startPos, startPos);
  editor.selection = new vscode.Selection(startPos, startPos);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}
