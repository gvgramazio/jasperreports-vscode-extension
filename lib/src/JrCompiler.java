import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Constructor;
import java.io.File;
import java.util.HashMap;

/**
 * Thin CLI wrapper for JasperReports operations.
 * <p>
 * Uses reflection so this class has zero compile-time dependencies on JasperReports.
 * The JasperReports JARs must be on the classpath at runtime.
 * <p>
 * Commands:
 * <ul>
 *   <li>{@code java -cp <cp> JrCompiler compile <file.jrxml>} — compile to .jasper</li>
 *   <li>{@code java -cp <cp> JrCompiler preview <file.jrxml> <output> <format> [dataSourcePath]} — compile, fill, export</li>
 * </ul>
 */
public class JrCompiler {
    public static void main(String[] args) {
        if (args.length < 1) {
            printUsage();
            System.exit(1);
        }
        String command = args[0];
        try {
            switch (command) {
                case "compile":
                    if (args.length != 2) {
                        System.err.println("Usage: java JrCompiler compile <file.jrxml>");
                        System.exit(1);
                    }
                    compile(args[1]);
                    break;
                case "preview":
                    if (args.length < 4 || args.length > 5) {
                        System.err.println("Usage: java JrCompiler preview <file.jrxml> <output> <format> [dataSourcePath]");
                        System.exit(1);
                    }
                    String dsPath = args.length == 5 ? args[4] : null;
                    preview(args[1], args[2], args[3], dsPath);
                    break;
                default:
                    printUsage();
                    System.exit(1);
            }
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            cause.printStackTrace();
            System.exit(2);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(3);
        }
    }

    private static void compile(String jrxmlPath) throws Exception {
        Class<?> compileManager = Class.forName(
            "net.sf.jasperreports.engine.JasperCompileManager");
        Method compileMethod = compileManager.getMethod(
            "compileReportToFile", String.class);
        compileMethod.invoke(null, jrxmlPath);
    }

    private static void preview(String jrxmlPath, String outputFile,
                                String format, String dataSourcePath) throws Exception {
        // 1. Compile
        Class<?> compileManager = Class.forName(
            "net.sf.jasperreports.engine.JasperCompileManager");
        Method compileMethod = compileManager.getMethod(
            "compileReport", String.class);
        Object jasperReport = compileMethod.invoke(null, jrxmlPath);

        // 2. Create data source
        Object dataSource = createDataSource(dataSourcePath);

        // 3. Fill
        Class<?> fillManager = Class.forName(
            "net.sf.jasperreports.engine.JasperFillManager");
        Class<?> dataSourceInterface = Class.forName(
            "net.sf.jasperreports.engine.JRDataSource");
        Class<?> jasperReportClass = Class.forName(
            "net.sf.jasperreports.engine.JasperReport");

        Method fillMethod = fillManager.getMethod(
            "fillReport", jasperReportClass, java.util.Map.class, dataSourceInterface);
        Object jasperPrint = fillMethod.invoke(null, jasperReport,
            new HashMap<String, Object>(), dataSource);

        // 4. Export
        Class<?> exportManager = Class.forName(
            "net.sf.jasperreports.engine.JasperExportManager");
        Class<?> jasperPrintClass = Class.forName(
            "net.sf.jasperreports.engine.JasperPrint");

        if ("pdf".equalsIgnoreCase(format)) {
            Method exportMethod = exportManager.getMethod(
                "exportReportToPdfFile", jasperPrintClass, String.class);
            exportMethod.invoke(null, jasperPrint, outputFile);
        } else {
            Method exportMethod = exportManager.getMethod(
                "exportReportToHtmlFile", jasperPrintClass, String.class);
            exportMethod.invoke(null, jasperPrint, outputFile);
        }
    }

    private static Object createDataSource(String dataSourcePath) throws Exception {
        if (dataSourcePath == null || dataSourcePath.isEmpty()) {
            Class<?> emptyDsClass = Class.forName(
                "net.sf.jasperreports.engine.JREmptyDataSource");
            Constructor<?> ctor = emptyDsClass.getConstructor();
            return ctor.newInstance();
        }

        String lowerPath = dataSourcePath.toLowerCase();
        if (lowerPath.endsWith(".json")) {
            Class<?> jsonDsClass = Class.forName(
                "net.sf.jasperreports.json.data.JsonDataSource");
            Constructor<?> ctor = jsonDsClass.getConstructor(File.class);
            return ctor.newInstance(new File(dataSourcePath));
        } else if (lowerPath.endsWith(".csv")) {
            Class<?> csvDsClass = Class.forName(
                "net.sf.jasperreports.engine.data.JRCsvDataSource");
            Constructor<?> ctor = csvDsClass.getConstructor(File.class);
            return ctor.newInstance(new File(dataSourcePath));
        } else if (lowerPath.endsWith(".xml")) {
            Class<?> xmlDsClass = Class.forName(
                "net.sf.jasperreports.engine.data.JRXmlDataSource");
            Constructor<?> ctor = xmlDsClass.getConstructor(File.class);
            return ctor.newInstance(new File(dataSourcePath));
        } else {
            throw new IllegalArgumentException(
                "Unsupported data source file type: " + dataSourcePath +
                ". Supported extensions: .json, .csv, .xml");
        }
    }

    private static void printUsage() {
        System.err.println("Usage:");
        System.err.println("  java JrCompiler compile <file.jrxml>");
        System.err.println("  java JrCompiler preview <file.jrxml> <output> <format> [dataSourcePath]");
        System.err.println();
        System.err.println("  format: html | pdf");
        System.err.println("  dataSourcePath: path to .json, .csv, or .xml file (optional, defaults to empty)");
    }
}
