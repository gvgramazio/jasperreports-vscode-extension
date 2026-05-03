import { vi } from "vitest";

export const workspace = {
  workspaceFolders: undefined as
    | Array<{ uri: { fsPath: string }; name: string; index: number }>
    | undefined,
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    update: vi.fn(),
  }),
  onDidChangeTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  applyEdit: vi.fn().mockResolvedValue(true),
};

export const window = {
  showInformationMessage: vi.fn().mockResolvedValue(undefined),
  showErrorMessage: vi.fn().mockResolvedValue(undefined),
  showWarningMessage: vi.fn().mockResolvedValue(undefined),
  createOutputChannel: vi.fn().mockReturnValue({
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  }),
  withProgress: vi
    .fn()
    .mockImplementation(
      (_options: unknown, task: (progress: unknown) => Promise<unknown>) =>
        task({ report: vi.fn() }),
    ),
  activeTextEditor: undefined as
    | {
        document: {
          fileName: string;
          languageId?: string;
          getText?: () => string;
        };
        revealRange?: ReturnType<typeof vi.fn>;
        selection?: unknown;
      }
    | undefined,
  createWebviewPanel: vi.fn().mockReturnValue({
    webview: { html: "" },
    reveal: vi.fn(),
    onDidDispose: vi.fn(),
    dispose: vi.fn(),
    title: "",
  }),
  createTreeView: vi.fn().mockReturnValue({
    dispose: vi.fn(),
    reveal: vi.fn(),
    onDidChangeSelection: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  }),
  registerWebviewViewProvider: vi.fn().mockReturnValue({ dispose: vi.fn() }),
  showQuickPick: vi.fn().mockResolvedValue(undefined),
  showInputBox: vi.fn().mockResolvedValue(undefined),
  showOpenDialog: vi.fn().mockResolvedValue(undefined),
  onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
};

export const extensions = {
  getExtension: vi.fn().mockReturnValue(undefined),
};

export const commands = {
  executeCommand: vi.fn(),
  registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
};

export const Uri = {
  file: (fsPath: string) => ({ fsPath, toString: () => `file://${fsPath}` }),
  parse: (uri: string) => ({ fsPath: uri, toString: () => uri }),
  joinPath: (base: { fsPath: string }, ...segments: string[]) => {
    const joined = [base.fsPath, ...segments].join("/");
    return { fsPath: joined, toString: () => `file://${joined}` };
  },
};

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum TextEditorRevealType {
  Default = 0,
  InCenter = 1,
  InCenterIfOutsideViewport = 2,
  AtTop = 3,
}

export class TreeItem {
  label: string;
  collapsibleState: TreeItemCollapsibleState;
  description?: string;
  iconPath?: unknown;
  command?: unknown;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None,
  ) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export class ThemeIcon {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class EventEmitter<T> {
  private _listeners: Array<(e: T) => void> = [];

  event = (listener: (e: T) => void) => {
    this._listeners.push(listener);
    return { dispose: () => {} };
  };

  fire(data: T): void {
    for (const listener of this._listeners) {
      listener(data);
    }
  }

  dispose(): void {
    this._listeners = [];
  }
}

export class Position {
  line: number;
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  start: Position;
  end: Position;
  constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }
}

export class Selection {
  anchor: Position;
  active: Position;
  constructor(anchor: Position, active: Position) {
    this.anchor = anchor;
    this.active = active;
  }
}

export class WorkspaceEdit {
  private _edits: Array<{
    type: string;
    uri?: unknown;
    range?: Range;
    newText?: string;
    position?: Position;
  }> = [];

  replace(uri: unknown, range: Range, newText: string): void {
    this._edits.push({ type: "replace", uri, range, newText });
  }

  insert(uri: unknown, position: Position, newText: string): void {
    this._edits.push({ type: "insert", uri, position, newText });
  }

  delete(uri: unknown, range: Range): void {
    this._edits.push({ type: "delete", uri, range });
  }

  entries(): Array<[unknown, Array<{ range?: Range; newText?: string }>]> {
    const byUri = new Map<
      unknown,
      Array<{ range?: Range; newText?: string }>
    >();
    for (const edit of this._edits) {
      const key = edit.uri;
      if (!byUri.has(key)) byUri.set(key, []);
      byUri.get(key)!.push({ range: edit.range, newText: edit.newText });
    }
    return [...byUri.entries()];
  }

  get size(): number {
    return this._edits.length;
  }
}

export class DataTransferItem {
  readonly value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}

export class DataTransfer {
  private _items = new Map<string, DataTransferItem>();

  get(mimeType: string): DataTransferItem | undefined {
    return this._items.get(mimeType);
  }

  set(mimeType: string, value: DataTransferItem): void {
    this._items.set(mimeType, value);
  }
}

export function createMockContext(
  extensionPath = "/ext",
): Record<string, unknown> {
  const store = new Map<string, unknown>();
  return {
    extensionPath,
    extensionUri: Uri.file(extensionPath),
    subscriptions: [],
    workspaceState: {
      get: vi.fn((key: string) => store.get(key)),
      update: vi.fn((key: string, value: unknown) => {
        if (value === undefined) {
          store.delete(key);
        } else {
          store.set(key, value);
        }
        return Promise.resolve();
      }),
      keys: vi.fn(() => [...store.keys()]),
    },
  };
}
