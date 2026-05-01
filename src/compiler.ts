import * as vscode from "vscode";
import * as path from "path";
import { execFile } from "child_process";
import { resolveJavaExecutable, validateJava } from "./java";

const OUTPUT_CHANNEL_NAME = "JasperReports";

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return outputChannel;
}

/**
 * Builds the classpath string for running the JR compiler.
 * Includes the bundled jr-compiler.jar and all user-configured classpath entries.
 */
export function buildClasspath(extensionPath: string): string | undefined {
  const config = vscode.workspace.getConfiguration("jasperreports");
  const userClasspath = config.get<string[]>("classpath", []);

  if (userClasspath.length === 0) {
    return undefined;
  }

  const compilerJar = path.join(extensionPath, "lib", "jr-compiler.jar");
  const separator = process.platform === "win32" ? ";" : ":";
  return [compilerJar, ...userClasspath].join(separator);
}

/**
 * Compiles a .jrxml file to .jasper using JasperCompileManager.
 */
export async function compileReport(
  extensionPath: string,
  jrxmlPath?: string,
): Promise<void> {
  const channel = getOutputChannel();

  // Resolve the file to compile
  const filePath =
    jrxmlPath ?? vscode.window.activeTextEditor?.document.fileName;
  if (!filePath || !filePath.endsWith(".jrxml")) {
    vscode.window.showErrorMessage(
      "No .jrxml file is open. Open a JRXML file and try again.",
    );
    return;
  }

  // Resolve Java
  const javaPath = resolveJavaExecutable();
  if (!javaPath) {
    vscode.window.showErrorMessage(
      "Java not found. Set 'jasperreports.java.home' or install Java.",
    );
    return;
  }

  const javaResult = await validateJava(javaPath);
  if (!javaResult.ok) {
    vscode.window.showErrorMessage(javaResult.error);
    return;
  }

  // Build classpath
  const classpath = buildClasspath(extensionPath);
  if (!classpath) {
    const action = await vscode.window.showErrorMessage(
      "JasperReports classpath is not configured. Set 'jasperreports.classpath' in settings.",
      "Open Settings",
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "jasperreports.classpath",
      );
    }
    return;
  }

  // Compile
  const fileName = path.basename(filePath);
  channel.appendLine(`Compiling ${fileName}...`);
  channel.appendLine(`  Java: ${javaPath} (${javaResult.version})`);
  channel.appendLine(`  File: ${filePath}`);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Compiling ${fileName}`,
      cancellable: false,
    },
    () => runCompiler(javaPath, classpath, filePath, channel),
  );
}

function runCompiler(
  javaPath: string,
  classpath: string,
  jrxmlPath: string,
  channel: vscode.OutputChannel,
): Promise<void> {
  return new Promise((resolve) => {
    const args = ["-cp", classpath, "JrCompiler", "compile", jrxmlPath];
    const cwd = path.dirname(jrxmlPath);

    execFile(javaPath, args, { cwd }, (err, stdout, stderr) => {
      if (stdout) {
        channel.appendLine(stdout);
      }
      if (stderr) {
        channel.appendLine(stderr);
      }

      if (err) {
        const jasperError = stderr || err.message;
        channel.appendLine(`FAILED: ${jasperError}`);
        channel.show(true);
        vscode.window.showErrorMessage(
          `Compilation failed: ${jasperError.split("\n")[0]}`,
        );
      } else {
        const jasperFile = jrxmlPath.replace(/\.jrxml$/, ".jasper");
        channel.appendLine(`OK → ${path.basename(jasperFile)}`);
        vscode.window.showInformationMessage(
          `Compiled successfully: ${path.basename(jasperFile)}`,
        );
      }
      resolve();
    });
  });
}

export function disposeOutputChannel(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
