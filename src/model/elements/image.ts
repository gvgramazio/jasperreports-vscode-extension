import type { ElementDef } from "../types";
import {
  ScaleImageEnum,
  HorizontalImageAlignEnum,
  VerticalImageAlignEnum,
  RotationEnum,
  OnErrorTypeEnum,
  EvaluationTimeEnum,
} from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { graphicElementGroup } from "../common/graphicElement";
import { hyperlinkGroup, HYPERLINK_EXPRESSIONS } from "../common/hyperlink";
import { registerElement } from "../registry";

const imageDef: ElementDef = {
  tag: "element",
  kind: "image",
  label: "Image",
  attributeGroups: [
    reportElementGroup,
    graphicElementGroup,
    {
      label: "Image",
      attributes: [
        {
          name: "scaleImage",
          type: "enum",
          enumValues: ScaleImageEnum,
        },
        { name: "rotation", type: "enum", enumValues: RotationEnum },
        {
          name: "hImageAlign",
          type: "enum",
          enumValues: HorizontalImageAlignEnum,
        },
        {
          name: "vImageAlign",
          type: "enum",
          enumValues: VerticalImageAlignEnum,
        },
        {
          name: "onErrorType",
          type: "enum",
          enumValues: OnErrorTypeEnum,
        },
        { name: "usingCache", type: "boolean" },
        { name: "isLazy", type: "boolean", defaultValue: "false" },
        {
          name: "evaluationTime",
          type: "enum",
          enumValues: EvaluationTimeEnum,
        },
        { name: "evaluationGroup", type: "string" },
        { name: "bookmarkLevel", type: "integer" },
      ],
    },
    hyperlinkGroup,
  ],
  expressions: [
    ...REPORT_ELEMENT_EXPRESSIONS,
    { tag: "expression", label: "Image Expression" },
    { tag: "anchorNameExpression", label: "Anchor Name" },
    { tag: "bookmarkLevelExpression", label: "Bookmark Level" },
    ...HYPERLINK_EXPRESSIONS,
  ],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
    { tag: "pen", maxOccurs: 1 },
    { tag: "hyperlinkParameter", maxOccurs: undefined },
  ],
};

registerElement(imageDef);

export { imageDef };
