import { SaxesParser } from "saxes";

export interface NodePosition {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface JrxmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: JrxmlNode[];
  position: NodePosition;
  text?: string;
}

export interface JrxmlDocument {
  root: JrxmlNode | null;
}

interface OpenNode {
  tag: string;
  attributes: Record<string, string>;
  children: JrxmlNode[];
  startLine: number;
  startColumn: number;
  text: string;
}

export function parseJrxml(text: string): JrxmlDocument {
  const parser = new SaxesParser({ xmlns: false, position: true });
  const stack: OpenNode[] = [];
  let root: JrxmlNode | null = null;

  parser.on("opentag", (node) => {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(node.attributes)) {
      attrs[key] = value as string;
    }
    stack.push({
      tag: node.name,
      attributes: attrs,
      children: [],
      startLine: parser.line,
      startColumn: parser.column,
      text: "",
    });
  });

  parser.on("text", (text) => {
    if (stack.length > 0) {
      stack[stack.length - 1].text += text;
    }
  });

  parser.on("cdata", (cdata) => {
    if (stack.length > 0) {
      stack[stack.length - 1].text += cdata;
    }
  });

  parser.on("closetag", () => {
    const completed = stack.pop();
    if (!completed) return;

    const jrxmlNode: JrxmlNode = {
      tag: completed.tag,
      attributes: completed.attributes,
      children: completed.children,
      position: {
        startLine: completed.startLine,
        startColumn: completed.startColumn,
        endLine: parser.line,
        endColumn: parser.column,
      },
      text: completed.text || undefined,
    };

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(jrxmlNode);
    } else {
      root = jrxmlNode;
    }
  });

  parser.on("error", () => {
    // Gracefully ignore parse errors — return whatever was built so far
    parser.resume();
  });

  try {
    parser.write(text).close();
  } catch {
    // If parsing fails completely, return what we have
  }

  return { root };
}
