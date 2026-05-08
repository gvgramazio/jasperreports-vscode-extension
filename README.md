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

| Setting                          | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `jasperreports.schema.version`   | Bundled schema version (default: `7.0.6`)      |
| `jasperreports.schema.jrxmlPath` | Path to a custom JRXML XSD (overrides bundled) |
| `jasperreports.schema.jrtxPath`  | Path to a custom JRTX XSD (overrides bundled)  |

### Snippets

44 snippets for rapid JRXML authoring, covering:

- **Root** — `jasperReport`
- **Data model** — `field`, `fieldDesc`, `parameter`, `parameterDefault`, `variable`, `sortField`, `query`, `property`
- **Styles** — `style`, `styleDefault`, `conditionalStyle`
- **Sections** — `title`, `pageHeader`, `columnHeader`, `detail`, `columnFooter`, `pageFooter`, `lastPageFooter`, `summary`, `noData`, `background`, `band`, `group`
- **Report elements** (JR 7.0.6 `<element kind="...">` format) — `textField`, `staticText`, `image`, `line`, `rectangle`, `ellipse`, `frame`, `subreport`, `chart`, `crosstab`, `component`, `elementGroup`, `generic`, `break`
- **Common children** — `expression`, `text`, `box`
- **Expression references** — `$F{}`, `$P{}`, `$V{}`, `$R{}`

### Compile JRXML

Compile `.jrxml` files to `.jasper` directly from VS Code.

- **Command Palette** → `JasperReports: Compile JRXML`
- Progress notification during compilation
- Errors shown in the output channel and as notifications
- Requires Java (JRE 8+) and JasperReports JARs on the classpath
- Optionally compiles custom `.java` source files before JRXML compilation (requires a JDK)

#### Compile Settings

| Setting                          | Description                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jasperreports.java.home`        | Path to a JRE/JDK installation (auto-detects `JAVA_HOME` if empty)                                                                               |
| `jasperreports.classpath`        | Array of paths to JasperReports JARs and dependencies (supports globs like `/path/to/libs/*`)                                                    |
| `jasperreports.java.sourcePaths` | Directories containing `.java` source files (e.g. custom scriptlets). Compiled automatically before JRXML compilation. Requires a JDK (`javac`). |

### Preview Report

Preview filled reports as HTML or PDF directly inside VS Code.

- **Command Palette** → `JasperReports: Preview Report` (active editor column)
- **Command Palette** → `JasperReports: Preview Report to the Side` (side panel)
- **Command Palette** → `JasperReports: Configure Preview` (change data source and format for the current file)
- First invocation prompts for a data source (empty, or a JSON/CSV/XML file); subsequent runs reuse the saved choice with no prompts
- Supports HTML (webview) and PDF (embedded in webview) output formats
- Per-file configuration stored automatically — each JRXML remembers its data source and format
- Optional live reload: auto-refreshes the preview when the JRXML file is saved
- Requires the same Java and classpath configuration as the compile command

#### Preview Settings

| Setting                            | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `jasperreports.preview.format`     | Default export format: `html` or `pdf` (default: `html`) |
| `jasperreports.preview.liveReload` | Auto re-run preview on save (default: `false`)           |

### Download Dependencies

Automatically download JasperReports JARs and all transitive dependencies into your workspace.

- **Command Palette** → `JasperReports: Download Dependencies`
- Downloads the version matching the `jasperreports.schema.version` setting
- JARs are saved to `.jasperreports/` in the workspace root
- Automatically updates `jasperreports.classpath` in workspace settings
- Requires [Maven](https://maven.apache.org/) installed and available on PATH (or via `MAVEN_HOME`/`M2_HOME`)

### Report Outline

A dedicated activity bar panel showing the structure of the active `.jrxml` file as an interactive tree.

- **Properties** — report-level attributes (page size, margins, etc.)
- **Styles** — named styles with default indicator
- **Parameters, Fields, Variables, Sort Fields** — data model elements with type info
- **Groups** — group definitions with header/footer bands
- All data groups are always visible, even when empty (shown with an `(empty)` indicator)
- **Sections** — title, page header, detail, page footer, summary, etc. with nested bands and elements
- Elements display their kind (e.g. `textField`, `staticText`) with position and size (`x,y w×h`)
- **Click to navigate** — clicking any item reveals and selects the corresponding XML element in the editor
- **Auto-refresh** — the tree updates automatically when the document changes (300ms debounce)
- Opens a welcome view when no `.jrxml` file is active

### Properties Panel

A webview panel below the Report Outline showing detailed properties for the selected tree item.

- **Model-driven groups** — for elements with a registered model definition, properties are organized into semantic groups (Report Element, Font, Text Alignment, Hyperlink, etc.) derived from the element schema rather than a flat attribute list
- **Full schema view** — all attributes defined in the model are shown, including those not yet present in the file; absent attributes appear dimmed (0.5 opacity) with empty values
- **Attributes** — all element attributes in a tabular view, **editable inline** (blur or Enter commits, Escape reverts); enum attributes use dropdown selectors; color attributes include a visual color picker; boolean attributes use three-state checkboxes (checked/unchecked/indeterminate); clearing a present attribute to blank removes it from the XML; `uuid` is read-only
- **Expressions** — expression content (e.g. `expression`, `imageExpression`) **editable inline** for model-driven elements; editing an existing expression updates its CDATA content, clearing removes the child element, and typing into an absent expression creates a new child element with CDATA wrapping
- **Box & Pen** — border and line properties including per-side pen attributes
- **Legacy fallback** — elements not yet in the model registry display the original flat layout (Attributes, Expressions, Style, Report Element groups)
- Automatically updates when selecting a different node in the outline tree
- After an inline edit, the panel re-parses the document and refreshes with fresh positions
- When the document changes externally, a stale banner prompts you to refresh
- Themed using VS Code CSS variables for seamless integration

### Outline Actions

Context menu actions available on tree items:

- **Add** — right-click a group (Fields, Parameters, Variables, Sort Fields, Groups, Styles), a section, a band, or a group to add child elements; shows a QuickPick when multiple child types are available (e.g. element types for bands, groupHeader/groupFooter for groups)
- **Add Section** — an "Add Section..." node appears at the bottom of the outline when not all sections are present; click it to pick from missing sections (Title, Page Header, Detail, etc.) and insert at the correct position
- **Delete** — right-click any field, parameter, variable, sortField, group, groupHeader, groupFooter, section, band, element, or style to delete it (with confirmation)
- **Duplicate** — right-click any style, parameter, field, variable, sortField, group, band, or element to duplicate it; named items get a `_copy` suffix, and `uuid` attributes are regenerated
- **Drag & Drop Reorder** — drag sibling items within the same parent to reorder them; drop on a sibling to insert before it, or drop on the parent to move to the end

### Property Editing UX

- **Dirty indicator** — a left border accent appears while you are typing an uncommitted change
- **Applied indicator** — a subtle background tint marks values that have been applied but not yet saved to disk
- **Input validation** — attributes with known types (integer, decimal, boolean, color) are validated as you type; invalid values are highlighted with an error border

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
