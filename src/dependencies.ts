import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { execFile } from "child_process";

const LIB_DIR_NAME = ".jasperreports";
const GROUP_ID = "net.sf.jasperreports";
const ARTIFACT_ID = "jasperreports";

/**
 * Generates a minimal Maven POM that depends on JasperReports.
 */
function buildPom(version: string): string {
  return `<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>tmp</groupId>
  <artifactId>jr-deps</artifactId>
  <version>1</version>
  <dependencies>
    <dependency>
      <groupId>${GROUP_ID}</groupId>
      <artifactId>${ARTIFACT_ID}</artifactId>
      <version>${version}</version>
    </dependency>
    <dependency>
      <groupId>${GROUP_ID}</groupId>
      <artifactId>${ARTIFACT_ID}-fonts</artifactId>
      <version>${version}</version>
    </dependency>
  </dependencies>
</project>
`;
}

/**
 * Resolves the `mvn` executable path.
 *
 * Resolution order:
 * 1. `MAVEN_HOME` environment variable
 * 2. `M2_HOME` environment variable
 * 3. `mvn` on the system PATH
 */
export function resolveMvnExecutable(): string {
  const mavenHome =
    process.env.MAVEN_HOME?.trim() || process.env.M2_HOME?.trim();
  if (mavenHome) {
    return path.join(mavenHome, "bin", "mvn");
  }
  return "mvn";
}

/**
 * Downloads JasperReports JARs and dependencies into the workspace,
 * then updates the `jasperreports.classpath` setting.
 */
export async function downloadDependencies(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Open a folder and try again.",
    );
    return;
  }

  const config = vscode.workspace.getConfiguration("jasperreports");
  const version = config.get<string>("schema.version", "7.0.6");

  const mvnPath = resolveMvnExecutable();

  const libDir = path.join(workspaceFolder.uri.fsPath, LIB_DIR_NAME);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Downloading JasperReports ${version} dependencies…`,
      cancellable: false,
    },
    () => runMavenDownload(mvnPath, version, libDir),
  );

  // Update workspace classpath setting
  const globPattern = path.join(libDir, "*");
  const currentClasspath = config.get<string[]>("classpath", []);
  if (!currentClasspath.includes(globPattern)) {
    const updatedClasspath = [...currentClasspath, globPattern];
    await config.update(
      "classpath",
      updatedClasspath,
      vscode.ConfigurationTarget.Workspace,
    );
  }

  vscode.window.showInformationMessage(
    `JasperReports ${version} dependencies downloaded to ${LIB_DIR_NAME}/`,
  );
}

function runMavenDownload(
  mvnPath: string,
  version: string,
  outputDir: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jr-deps-"));
    const pomPath = path.join(tmpDir, "pom.xml");
    fs.writeFileSync(pomPath, buildPom(version));

    const args = [
      "-f",
      pomPath,
      "dependency:copy-dependencies",
      `-DoutputDirectory=${outputDir}`,
      "-DincludeScope=runtime",
    ];

    execFile(mvnPath, args, { cwd: tmpDir }, (err, _stdout, stderr) => {
      // Clean up temp pom
      fs.rmSync(tmpDir, { recursive: true, force: true });

      if (err) {
        const errorMsg = stderr || err.message;
        reject(new Error(`Maven failed: ${errorMsg.split("\n")[0]}`));
        return;
      }
      resolve();
    });
  });
}
