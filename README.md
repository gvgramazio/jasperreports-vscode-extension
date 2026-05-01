# JasperReports

VS Code extension for JasperReports `.jrxml` and `.jrtx` files.

## Features

### File Association & Syntax Highlighting

`.jrxml` and `.jrtx` files are automatically recognized with dedicated language IDs and full XML syntax highlighting.

### XSD Validation & Autocomplete

Ships with a bundled XSD schema for JasperReports 7.0.6. When paired with the [XML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml), you get:

- Real-time validation with error squiggles
- Autocomplete for elements, attributes, and enum values
- Hover documentation

The extension automatically activates the XML extension when needed and prompts to install it if not already present.

### Schema Configuration

| Setting | Description |
| --- | --- |
| `jasperreports.schema.version` | Bundled schema version (default: `7.0.6`) |
| `jasperreports.schema.jrxmlPath` | Path to a custom JRXML XSD (overrides bundled) |
| `jasperreports.schema.jrtxPath` | Path to a custom JRTX XSD (overrides bundled) |

### Snippets

37 snippets for rapid JRXML authoring, covering:

- **Data model** — `field`, `parameter`, `variable`, `sortField`, `query`, `property`
- **Styles** — `style`, `styleDefault`, `conditionalStyle`
- **Sections** — `title`, `pageHeader`, `columnHeader`, `detail`, `columnFooter`, `pageFooter`, `lastPageFooter`, `summary`, `noData`, `background`, `band`, `group`
- **Report elements** (JR 7.0.6 `<element kind="...">` format) — `textField`, `staticText`, `image`, `line`, `rectangle`, `ellipse`, `frame`, `subreport`, `chart`, `crosstab`, `component`, `elementGroup`, `generic`
- **Common children** — `expression`, `text`, `box`
- **Expression references** — `$F{}`, `$P{}`, `$V{}`, `$R{}`

## Installation

### From Marketplace

Search for **JasperReports** in the VS Code Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).

### From VSIX

1. Download the `.vsix` file from [GitHub Releases](https://github.com/gvgramazio/jasperreports-vscode-extension/releases).
2. In VS Code: Extensions → `...` → **Install from VSIX...** → select the file.

## Development

```sh
pnpm install
pnpm run build
# Press F5 to launch the Extension Development Host
```

## License

[MIT](LICENSE)
