import { AttributeDef, AttributeGroup } from "../types";
import {
  HorizontalTextAlignEnum,
  VerticalTextAlignEnum,
  RotationEnum,
} from "../enums";

export const TEXT_ELEMENT_ATTRIBUTES: readonly AttributeDef[] = [
  { name: "fontName", type: "string" },
  { name: "fontSize", type: "integer" },
  { name: "bold", type: "boolean" },
  { name: "italic", type: "boolean" },
  { name: "underline", type: "boolean" },
  { name: "strikeThrough", type: "boolean" },
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
  { name: "rotation", type: "enum", enumValues: RotationEnum },
  { name: "markup", type: "string" },
  { name: "pdfFontName", type: "string" },
  { name: "pdfEncoding", type: "string" },
  { name: "pdfEmbedded", type: "boolean" },
] as const;

export const fontGroup: AttributeGroup = {
  label: "Font",
  attributes: TEXT_ELEMENT_ATTRIBUTES.filter((a) =>
    [
      "fontName",
      "fontSize",
      "bold",
      "italic",
      "underline",
      "strikeThrough",
      "pdfFontName",
      "pdfEncoding",
      "pdfEmbedded",
    ].includes(a.name),
  ),
};

export const textAlignmentGroup: AttributeGroup = {
  label: "Text Alignment",
  attributes: TEXT_ELEMENT_ATTRIBUTES.filter((a) =>
    ["hTextAlign", "vTextAlign", "rotation", "markup"].includes(a.name),
  ),
};
