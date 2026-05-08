import { execFile } from "child_process";
import { getJavaHome } from "./config";

/**
 * Resolves the path to the `java` executable.
 *
 * Resolution order:
 * 1. `jasperreports.java.home` extension setting
 * 2. `JAVA_HOME` environment variable
 * 3. `java` on the system PATH
 *
 * Returns `undefined` if Java cannot be found.
 */
export function resolveJavaExecutable(): string | undefined {
  const configuredHome = getJavaHome();

  if (configuredHome) {
    return `${configuredHome}/bin/java`;
  }

  const javaHome = process.env.JAVA_HOME?.trim();
  if (javaHome) {
    return `${javaHome}/bin/java`;
  }

  // Fall back to PATH
  return "java";
}

/**
 * Resolves the path to the `javac` executable, derived from the same
 * resolution logic as `resolveJavaExecutable`.
 *
 * Returns `undefined` if no JDK home is configured and `JAVA_HOME` is unset.
 * Falls back to `"javac"` on PATH as a last resort.
 */
export function resolveJavacExecutable(): string {
  const configuredHome = getJavaHome();

  if (configuredHome) {
    return `${configuredHome}/bin/javac`;
  }

  const javaHome = process.env.JAVA_HOME?.trim();
  if (javaHome) {
    return `${javaHome}/bin/javac`;
  }

  return "javac";
}

/**
 * Validates that the resolved javac executable actually runs.
 * Returns success or an error message on failure.
 */
export function validateJavac(
  javacPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    execFile(javacPath, ["-version"], (err) => {
      if (err) {
        resolve({
          ok: false,
          error: `JDK required for source path compilation. Cannot run '${javacPath}': ${err.message}`,
        });
        return;
      }
      resolve({ ok: true });
    });
  });
}

/**
 * Validates that the resolved java executable actually runs.
 * Returns the version string on success, or an error message on failure.
 */
export function validateJava(
  javaPath: string,
): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    execFile(javaPath, ["-version"], (err, _stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          error: `Cannot run '${javaPath}': ${err.message}`,
        });
        return;
      }
      // java -version prints to stderr
      const version = stderr.split("\n")[0] ?? "unknown";
      resolve({ ok: true, version });
    });
  });
}
