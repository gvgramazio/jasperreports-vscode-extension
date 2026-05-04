import * as vscode from "vscode";
import * as path from "path";
import { execFile } from "child_process";
import { resolveJavaExecutable, validateJava } from "./java";
import { compileJavaSources, cleanupTempDir } from "./java-sources";
import { getOutputChannel } from "./logger";

/**
 * Resolves the active .jrxml file path from an explicit argument or the active editor.
 * Shows an error message and returns undefined if no .jrxml file is available.
 */
export function resolveActiveJrxmlPath(jrxmlPath?: string): string | undefined {
  const filePath =
    jrxmlPath ?? vscode.window.activeTextEditor?.document.fileName;
  if (!filePath || !filePath.endsWith(".jrxml")) {
    vscode.window.showErrorMessage(
      "No .jrxml file is open. Open a JRXML file and try again.",
    );
    return undefined;
  }
  return filePath;
}

export interface JavaEnv {
  javaPath: string;
  javaVersion: string;
  classpath: string;
  tempClassDir?: string;
}

/**
 * Resolves and validates the Java executable and classpath.
 * Shows appropriate error messages and returns undefined on failure.
 */
export async function resolveJavaEnv(
  extensionPath: string,
): Promise<JavaEnv | undefined> {
  const javaPath = resolveJavaExecutable();
  if (!javaPath) {
    vscode.window.showErrorMessage(
      "Java not found. Set 'jasperreports.java.home' or install Java.",
    );
    return undefined;
  }

  const javaResult = await validateJava(javaPath);
  if (!javaResult.ok) {
    vscode.window.showErrorMessage(javaResult.error);
    return undefined;
  }

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
    return undefined;
  }

  const config = vscode.workspace.getConfiguration("jasperreports");
  const sourcePaths = config.get<string[]>("java.sourcePaths", []);

  if (sourcePaths.length > 0) {
    const tempClassDir = await compileJavaSources(classpath, sourcePaths);
    if (!tempClassDir) {
      return undefined;
    }
    const separator = process.platform === "win32" ? ";" : ":";
    return {
      javaPath,
      javaVersion: javaResult.version,
      classpath: classpath + separator + tempClassDir,
      tempClassDir,
    };
  }

  return { javaPath, javaVersion: javaResult.version, classpath };
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
  const filePath = resolveActiveJrxmlPath(jrxmlPath);
  if (!filePath) return;

  const env = await resolveJavaEnv(extensionPath);
  if (!env) return;

  const channel = getOutputChannel();
  const fileName = path.basename(filePath);
  channel.appendLine(`Compiling ${fileName}...`);
  channel.appendLine(`  Java: ${env.javaPath} (${env.javaVersion})`);
  channel.appendLine(`  File: ${filePath}`);
  channel.appendLine(`  Classpath: ${env.classpath}`);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Compiling ${fileName}`,
        cancellable: false,
      },
      () => runCompiler(env.javaPath, env.classpath, filePath, channel),
    );
  } finally {
    if (env.tempClassDir) {
      cleanupTempDir(env.tempClassDir);
    }
  }
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

    execFile(
      javaPath,
      args,
      { cwd, timeout: 60_000 },
      (err, stdout, stderr) => {
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
      },
    );
  });
}
