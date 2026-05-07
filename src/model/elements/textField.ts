import type { ElementDef } from "../types";
import { TextAdjustEnum, EvaluationTimeEnum } from "../enums";
import {
  reportElementGroup,
  REPORT_ELEMENT_EXPRESSIONS,
} from "../common/reportElement";
import { fontGroup, textAlignmentGroup } from "../common/textElement";
import { hyperlinkGroup, HYPERLINK_EXPRESSIONS } from "../common/hyperlink";
import { registerElement } from "../registry";

const textFieldDef: ElementDef = {
  tag: "element",
  kind: "textField",
  label: "Text Field",
  attributeGroups: [
    reportElementGroup,
    fontGroup,
    textAlignmentGroup,
    {
      label: "Text Field",
      attributes: [
        {
          name: "textAdjust",
          type: "enum",
          enumValues: TextAdjustEnum,
        },
        {
          name: "evaluationTime",
          type: "enum",
          enumValues: EvaluationTimeEnum,
        },
        { name: "evaluationGroup", type: "string" },
        { name: "pattern", type: "string" },
        { name: "blankWhenNull", type: "boolean" },
        { name: "bookmarkLevel", type: "integer" },
      ],
    },
    hyperlinkGroup,
  ],
  expressions: [
    ...REPORT_ELEMENT_EXPRESSIONS,
    { tag: "expression", label: "Expression" },
    { tag: "patternExpression", label: "Pattern" },
    { tag: "anchorNameExpression", label: "Anchor Name" },
    { tag: "bookmarkLevelExpression", label: "Bookmark Level" },
    ...HYPERLINK_EXPRESSIONS,
  ],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
    { tag: "paragraph", maxOccurs: 1 },
    { tag: "hyperlinkParameter", maxOccurs: undefined },
  ],
};

registerElement(textFieldDef);

export { textFieldDef };
