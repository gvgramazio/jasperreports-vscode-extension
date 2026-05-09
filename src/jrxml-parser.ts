import { SaxesParser } from "saxes";

export interface NodePosition {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface AttributePosition {
  nameStart: number;
  nameEnd: number;
  valueStart: number;
  valueEnd: number;
}

export interface JrxmlNode {
  tag: string;
  attributes: Record<string, string>;
  attributePositions?: Record<string, AttributePosition>;
  children: JrxmlNode[];
  position: NodePosition;
  text?: string;
}

export interface JrxmlDocument {
  root: JrxmlNode | null;
  hasErrors: boolean;
}

interface OpenNode {
  tag: string;
  attributes: Record<string, string>;
  attributePositions: Record<string, AttributePosition>;
  children: JrxmlNode[];
  startLine: number;
  startColumn: number;
  text: string;
}

export function parseJrxml(text: string): JrxmlDocument {
  const parser = new SaxesParser({ xmlns: false, position: true });
  const stack: OpenNode[] = [];
  let root: JrxmlNode | null = null;
  let hasErrors = false;
  const lines = text.split("\n");

  parser.on("opentag", (node) => {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(node.attributes)) {
      // Safe: xmlns:false guarantees string values (saxes types don't narrow this)
      attrs[key] = value as string;
    }

    const attrPositions = parseAttributePositions(
      lines,
      parser.line,
      parser.column,
      attrs,
    );

    stack.push({
      tag: node.name,
      attributes: attrs,
      attributePositions: attrPositions,
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
      attributePositions:
        Object.keys(completed.attributePositions).length > 0
          ? completed.attributePositions
          : undefined,
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
    hasErrors = true;
  });

  try {
    parser.write(text).close();
  } catch {
    // If parsing fails completely, return what we have
    hasErrors = true;
  }

  return { root, hasErrors };
}

/**
 * Scans the source text backwards from the saxes-reported tag-end position
 * to find the byte offsets of each attribute name and value within the tag.
 * Positions are 0-based byte offsets into the full source text.
 */
function parseAttributePositions(
  lines: string[],
  tagEndLine: number,
  tagEndColumn: number,
  attrs: Record<string, string>,
): Record<string, AttributePosition> {
  const result: Record<string, AttributePosition> = {};
  const attrNames = Object.keys(attrs);
  if (attrNames.length === 0) return result;

  // saxes reports line 1-based, column is the position of '>' (or '/' before '>').
  // We need to find the opening '<tagName' and scan forward for attributes.
  // Convert the tag end position to a 0-based offset into the source.
  const endOffset = lineColToOffset(lines, tagEndLine, tagEndColumn);

  // Walk backwards to find the '<' that opens this tag
  const fullText = lines.join("\n");
  let openBracket = -1;
  for (let i = endOffset; i >= 0; i--) {
    if (fullText[i] === "<") {
      openBracket = i;
      break;
    }
  }
  if (openBracket === -1) return result;

  // Extract the tag opening region (from '<' to the end position)
  const region = fullText.substring(openBracket, endOffset + 1);

  // For each attribute, find its position in the region
  for (const name of attrNames) {
    // Match: attrName="value" or attrName='value'
    // Use a regex that finds the attribute name followed by =, optional whitespace, then quoted value
    const pattern = new RegExp(
      `(?<=\\s)${escapeRegex(name)}\\s*=\\s*(['"])`,
      "g",
    );
    const match = pattern.exec(region);
    if (!match) continue;

    const nameStartInRegion = match.index;
    const nameEndInRegion = nameStartInRegion + name.length;
    const quote = match[1];
    const valueStartInRegion = match.index + match[0].length;
    // Find the closing quote
    const valueEndInRegion = region.indexOf(quote, valueStartInRegion);
    if (valueEndInRegion === -1) continue;

    result[name] = {
      nameStart: openBracket + nameStartInRegion,
      nameEnd: openBracket + nameEndInRegion,
      valueStart: openBracket + valueStartInRegion,
      valueEnd: openBracket + valueEndInRegion,
    };
  }

  return result;
}

function lineColToOffset(lines: string[], line: number, col: number): number {
  let offset = 0;
  // lines are 0-indexed in array, line param is 1-based
  for (let i = 0; i < line - 1; i++) {
    offset += lines[i].length + 1; // +1 for \n
  }
  offset += col;
  return offset;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
