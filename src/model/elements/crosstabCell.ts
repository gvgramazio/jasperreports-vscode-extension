import type { ElementDef } from "../types";
import { registerElement } from "../registry";

const crosstabCellDef: ElementDef = {
  tag: "cell",
  label: "Cell",
  attributeGroups: [
    {
      label: "Cell",
      attributes: [
        { name: "width", type: "integer" },
        { name: "height", type: "integer" },
        { name: "rowTotalGroup", type: "string" },
        { name: "columnTotalGroup", type: "string" },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "contents", maxOccurs: 1 },
    { tag: "element", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
  ],
};

registerElement(crosstabCellDef);

const whenNoDataCellDef: ElementDef = {
  tag: "whenNoDataCell",
  label: "When No Data Cell",
  attributeGroups: [
    {
      label: "When No Data Cell",
      attributes: [
        { name: "width", type: "integer" },
        { name: "height", type: "integer" },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "contents", maxOccurs: 1 },
    { tag: "element", maxOccurs: undefined },
  ],
};

registerElement(whenNoDataCellDef);

const headerCellDef: ElementDef = {
  tag: "headerCell",
  label: "Header Cell",
  attributeGroups: [
    {
      label: "Header Cell",
      attributes: [
        { name: "width", type: "integer" },
        { name: "height", type: "integer" },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "contents", maxOccurs: 1 },
    { tag: "element", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
  ],
};

registerElement(headerCellDef);

export { crosstabCellDef, whenNoDataCellDef, headerCellDef };
