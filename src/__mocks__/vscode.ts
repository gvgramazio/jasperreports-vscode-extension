import { vi } from "vitest";

export const workspace = {
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
    update: vi.fn(),
  }),
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
  activeTextEditor: undefined as { document: { fileName: string } } | undefined,
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
