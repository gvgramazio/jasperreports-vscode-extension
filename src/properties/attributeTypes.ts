export type AttributeType =
  | "integer"
  | "decimal"
  | "boolean"
  | "color"
  | "enum";

export interface AttributeTypeInfo {
  type: AttributeType;
  enumValues?: string[];
}

const INTEGER_ATTRS = new Set([
  "x",
  "y",
  "width",
  "height",
  "fontSize",
  "padding",
  "topPadding",
  "leftPadding",
  "bottomPadding",
  "rightPadding",
  "pageWidth",
  "pageHeight",
  "columnWidth",
  "topMargin",
  "bottomMargin",
  "leftMargin",
  "rightMargin",
  "columnSpacing",
  "columnCount",
  "bookmarkLevel",
]);

const DECIMAL_ATTRS = new Set(["lineWidth", "lineSpacingSize"]);

const BOOLEAN_ATTRS = new Set([
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "default",
  "blankWhenNull",
  "removeLineWhenBlank",
  "floating",
  "pdfEmbedded",
  "isForPrompting",
  "printRepeatedValues",
  "printInFirstWholeBand",
  "printWhenDetailOverflows",
  "isSummaryNewPage",
  "isSummaryWithPageHeaderAndFooter",
  "isFloatColumnFooter",
  "isTitleNewPage",
  "isIgnorePagination",
]);

const COLOR_ATTRS = new Set([
  "forecolor",
  "backcolor",
  "lineColor",
  "fillColor",
]);

const ENUM_MAP: Record<string, string[]> = {
  calculation: [
    "Nothing",
    "Count",
    "DistinctCount",
    "Sum",
    "Average",
    "Lowest",
    "Highest",
    "StandardDeviation",
    "Variance",
    "System",
    "First",
  ],
  resetType: ["None", "Report", "Page", "Column", "Group"],
  evaluationTime: [
    "Now",
    "Report",
    "Page",
    "Column",
    "Group",
    "Band",
    "Auto",
    "Master",
  ],
  hTextAlign: ["Left", "Center", "Right", "Justified"],
  vTextAlign: ["Top", "Middle", "Bottom"],
  hImageAlign: ["Left", "Center", "Right"],
  vImageAlign: ["Top", "Middle", "Bottom"],
  positionType: ["FixRelativeToTop", "Float", "FixRelativeToBottom"],
  stretchType: [
    "NoStretch",
    "RelativeToTallestObject",
    "RelativeToBandHeight",
    "ElementGroupHeight",
    "ContainerHeight",
    "ContainerBottom",
  ],
  printWhenGroupChanges: [],
  lineSpacing: ["Single", "OneAndHalf", "Double", "AtLeast", "Fixed"],
  rotation: ["None", "Left", "Right", "UpsideDown"],
  markup: ["none", "styled", "html", "rtf"],
  scaleImage: ["Clip", "FillFrame", "RetainShape", "RealHeight", "RealSize"],
  onErrorType: ["Error", "Blank", "Icon"],
  lineDirection: ["TopDown", "BottomUp"],
  lineStyle: ["Solid", "Dashed", "Dotted", "Double"],
  fill: ["Solid"],
  splitType: ["Stretch", "Prevent", "Immediate"],
  whenNoDataType: [
    "NoPages",
    "BlankPage",
    "AllSectionsNoDetail",
    "NoDataSection",
  ],
  orientation: ["Portrait", "Landscape"],
  whenResourceMissingType: ["Null", "Empty", "Key", "Error"],
  order: ["Ascending", "Descending"],
  kind: [
    "textField",
    "staticText",
    "image",
    "line",
    "rectangle",
    "ellipse",
    "frame",
    "subreport",
    "chart",
    "crosstab",
    "component",
    "generic",
  ],
  mode: ["Opaque", "Transparent"],
};

export function getAttributeType(name: string): AttributeTypeInfo | undefined {
  if (INTEGER_ATTRS.has(name)) return { type: "integer" };
  if (DECIMAL_ATTRS.has(name)) return { type: "decimal" };
  if (BOOLEAN_ATTRS.has(name))
    return { type: "boolean", enumValues: ["true", "false"] };
  if (COLOR_ATTRS.has(name)) return { type: "color" };
  if (name in ENUM_MAP && ENUM_MAP[name].length > 0)
    return { type: "enum", enumValues: ENUM_MAP[name] };
  return undefined;
}

export function validateAttributeValue(name: string, value: string): boolean {
  const info = getAttributeType(name);
  if (!info || value === "") return true;

  switch (info.type) {
    case "integer":
      return /^-?\d+$/.test(value);
    case "decimal":
      return /^-?\d+(\.\d+)?$/.test(value);
    case "boolean":
      return value === "true" || value === "false";
    case "color":
      return /^#[0-9a-fA-F]{6}$/.test(value);
    case "enum":
      return info.enumValues?.includes(value) ?? true;
    default:
      return true;
  }
}
