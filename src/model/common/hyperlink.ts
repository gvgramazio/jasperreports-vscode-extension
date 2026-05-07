import { AttributeDef, AttributeGroup, ExpressionDef } from "../types";
import { HyperlinkTargetEnum, HyperlinkTypeEnum } from "../enums";

export const HYPERLINK_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "linkType", type: "enum", enumValues: HyperlinkTypeEnum },
  { name: "linkTarget", type: "enum", enumValues: HyperlinkTargetEnum },
] as const;

export const hyperlinkGroup: AttributeGroup = {
  label: "Hyperlink",
  attributes: HYPERLINK_ATTRIBUTES,
};

export const HYPERLINK_EXPRESSIONS: readonly ExpressionDef[] = [
  { tag: "hyperlinkReferenceExpression", label: "Hyperlink Reference" },
  { tag: "hyperlinkAnchorExpression", label: "Hyperlink Anchor" },
  { tag: "hyperlinkPageExpression", label: "Hyperlink Page" },
  { tag: "hyperlinkTooltipExpression", label: "Hyperlink Tooltip" },
] as const;
