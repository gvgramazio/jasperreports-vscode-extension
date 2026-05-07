import type { ElementDef } from "../types";
import {
  ModeEnum,
  FillEnum,
  ScaleImageEnum,
  HorizontalTextAlignEnum,
  VerticalTextAlignEnum,
  HorizontalImageAlignEnum,
  VerticalImageAlignEnum,
  RotationEnum,
} from "../enums";
import { registerElement } from "../registry";

const styleDef: ElementDef = {
  tag: "style",
  label: "Style",
  attributeGroups: [
    {
      label: "Style",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "isDefault", type: "boolean", defaultValue: "false" },
        { name: "style", type: "string" },
        { name: "mode", type: "enum", enumValues: ModeEnum },
        { name: "forecolor", type: "color" },
        { name: "backcolor", type: "color" },
        { name: "fill", type: "enum", enumValues: FillEnum },
        { name: "radius", type: "integer" },
        { name: "scaleImage", type: "enum", enumValues: ScaleImageEnum },
        {
          name: "hTextAlign",
          type: "enum",
          enumValues: HorizontalTextAlignEnum,
        },
        {
          name: "vTextAlign",
          type: "enum",
          enumValues: VerticalTextAlignEnum,
        },
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
        { name: "rotation", type: "enum", enumValues: RotationEnum },
        { name: "markup", type: "string" },
        { name: "pattern", type: "string" },
        { name: "blankWhenNull", type: "boolean" },
        { name: "fontName", type: "string" },
        { name: "fontSize", type: "decimal" },
        { name: "bold", type: "boolean" },
        { name: "italic", type: "boolean" },
        { name: "underline", type: "boolean" },
        { name: "strikeThrough", type: "boolean" },
        { name: "pdfFontName", type: "string" },
        { name: "pdfEncoding", type: "string" },
        { name: "pdfEmbedded", type: "boolean" },
      ],
    },
  ],
  expressions: [],
  children: [
    { tag: "conditionalStyle", maxOccurs: undefined },
    { tag: "box", maxOccurs: 1 },
    { tag: "pen", maxOccurs: 1 },
    { tag: "paragraph", maxOccurs: 1 },
  ],
};

registerElement(styleDef);

export { styleDef };
