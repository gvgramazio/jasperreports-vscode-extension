import type { ElementDef } from "../types";
import {
  OrientationEnum,
  PrintOrderEnum,
  RunDirectionEnum,
  WhenNoDataTypeEnum,
  WhenResourceMissingTypeEnum,
  SectionTypeEnum,
} from "../enums";
import { registerElement } from "../registry";

const jasperReportDef: ElementDef = {
  tag: "jasperReport",
  label: "Jasper Report",
  attributeGroups: [
    {
      label: "Report",
      attributes: [
        { name: "name", type: "string", required: true },
        { name: "language", type: "string" },
        { name: "uuid", type: "string" },
      ],
    },
    {
      label: "Page",
      attributes: [
        { name: "pageWidth", type: "integer", defaultValue: "595" },
        { name: "pageHeight", type: "integer", defaultValue: "842" },
        {
          name: "orientation",
          type: "enum",
          enumValues: OrientationEnum,
        },
        { name: "columnCount", type: "integer", defaultValue: "1" },
        { name: "columnWidth", type: "integer" },
        { name: "columnSpacing", type: "integer", defaultValue: "0" },
        { name: "leftMargin", type: "integer", defaultValue: "20" },
        { name: "rightMargin", type: "integer", defaultValue: "20" },
        { name: "topMargin", type: "integer", defaultValue: "30" },
        { name: "bottomMargin", type: "integer", defaultValue: "30" },
      ],
    },
    {
      label: "Layout",
      attributes: [
        { name: "printOrder", type: "enum", enumValues: PrintOrderEnum },
        {
          name: "columnDirection",
          type: "enum",
          enumValues: RunDirectionEnum,
        },
        {
          name: "sectionType",
          type: "enum",
          enumValues: SectionTypeEnum,
        },
        {
          name: "whenNoDataType",
          type: "enum",
          enumValues: WhenNoDataTypeEnum,
        },
        {
          name: "whenResourceMissingType",
          type: "enum",
          enumValues: WhenResourceMissingTypeEnum,
        },
        {
          name: "isTitleNewPage",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "isSummaryNewPage",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "isSummaryWithPageHeaderAndFooter",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "isFloatColumnFooter",
          type: "boolean",
          defaultValue: "false",
        },
        {
          name: "isIgnorePagination",
          type: "boolean",
          defaultValue: "false",
        },
      ],
    },
    {
      label: "Advanced",
      attributes: [
        { name: "scriptletClass", type: "string" },
        { name: "formatFactoryClass", type: "string" },
        { name: "resourceBundle", type: "string" },
      ],
    },
  ],
  expressions: [{ tag: "filterExpression", label: "Filter" }],
  children: [
    { tag: "property", maxOccurs: undefined },
    { tag: "propertyExpression", maxOccurs: undefined },
    { tag: "import", maxOccurs: undefined },
    { tag: "template", maxOccurs: undefined },
    { tag: "style", maxOccurs: undefined },
    { tag: "dataset", maxOccurs: undefined },
    { tag: "scriptlet", maxOccurs: undefined },
    { tag: "parameter", maxOccurs: undefined },
    { tag: "query", maxOccurs: 1 },
    { tag: "field", maxOccurs: undefined },
    { tag: "sortField", maxOccurs: undefined },
    { tag: "variable", maxOccurs: undefined },
    { tag: "group", maxOccurs: undefined },
    { tag: "background", maxOccurs: 1 },
    { tag: "title", maxOccurs: 1 },
    { tag: "pageHeader", maxOccurs: 1 },
    { tag: "columnHeader", maxOccurs: 1 },
    { tag: "detail", maxOccurs: 1 },
    { tag: "columnFooter", maxOccurs: 1 },
    { tag: "pageFooter", maxOccurs: 1 },
    { tag: "lastPageFooter", maxOccurs: 1 },
    { tag: "summary", maxOccurs: 1 },
    { tag: "noData", maxOccurs: 1 },
  ],
};

registerElement(jasperReportDef);

export { jasperReportDef };
