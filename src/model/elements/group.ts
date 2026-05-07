import type { ElementDef } from "../types";
import { FooterPositionEnum } from "../enums";
import { registerElement } from "../registry";

const groupDef: ElementDef = {
  tag: "group",
  label: "Group",
  attributeGroups: [
    {
      label: "Group",
      attributes: [
        { name: "name", type: "string", required: true },
        {
          name: "startNewColumn",
          type: "boolean",
          defaultValue: "false",
        },
        { name: "startNewPage", type: "boolean", defaultValue: "false" },
        {
          name: "resetPageNumber",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "reprintHeaderOnEachPage",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "reprintHeaderOnEachColumn",
          type: "boolean",
          defaultValue: "false",
        },
        { name: "minHeightToStartNewPage", type: "integer" },
        { name: "minDetailsToStartFromTop", type: "integer" },
        {
          name: "footerPosition",
          type: "enum",
          enumValues: FooterPositionEnum,
        },
        { name: "keepTogether", type: "boolean", defaultValue: "false" },
        {
          name: "preventOrphanFooter",
          type: "boolean",
          defaultValue: "false",
        },
      ],
    },
  ],
  expressions: [{ tag: "expression", label: "Group Expression" }],
  children: [
    { tag: "groupHeader", maxOccurs: 1 },
    { tag: "groupFooter", maxOccurs: 1 },
  ],
};

registerElement(groupDef);

export { groupDef };
