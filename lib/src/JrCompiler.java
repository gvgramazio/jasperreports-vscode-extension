import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Constructor;
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
 *   <li>{@code java -cp <cp> JrCompiler preview <file.jrxml> <output.html>} — compile, fill with empty data, export to HTML</li>
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
                    if (args.length != 3) {
                        System.err.println("Usage: java JrCompiler preview <file.jrxml> <output.html>");
                        System.exit(1);
                    }
                    preview(args[1], args[2]);
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

    private static void preview(String jrxmlPath, String outputHtml) throws Exception {
        // 1. Compile
        Class<?> compileManager = Class.forName(
            "net.sf.jasperreports.engine.JasperCompileManager");
        Method compileMethod = compileManager.getMethod(
            "compileReport", String.class);
        Object jasperReport = compileMethod.invoke(null, jrxmlPath);

        // 2. Fill with empty data source
        Class<?> fillManager = Class.forName(
            "net.sf.jasperreports.engine.JasperFillManager");
        Class<?> dataSourceClass = Class.forName(
            "net.sf.jasperreports.engine.JRDataSource");
        Class<?> emptyDsClass = Class.forName(
            "net.sf.jasperreports.engine.JREmptyDataSource");
        Class<?> jasperReportClass = Class.forName(
            "net.sf.jasperreports.engine.JasperReport");

        Constructor<?> emptyDsCtor = emptyDsClass.getConstructor();
        Object emptyDs = emptyDsCtor.newInstance();

        Method fillMethod = fillManager.getMethod(
            "fillReport", jasperReportClass, java.util.Map.class, dataSourceClass);
        Object jasperPrint = fillMethod.invoke(null, jasperReport,
            new HashMap<String, Object>(), emptyDs);

        // 3. Export to HTML
        Class<?> exportManager = Class.forName(
            "net.sf.jasperreports.engine.JasperExportManager");
        Class<?> jasperPrintClass = Class.forName(
            "net.sf.jasperreports.engine.JasperPrint");
        Method exportMethod = exportManager.getMethod(
            "exportReportToHtmlFile", jasperPrintClass, String.class);
        exportMethod.invoke(null, jasperPrint, outputHtml);
    }

    private static void printUsage() {
        System.err.println("Usage:");
        System.err.println("  java JrCompiler compile <file.jrxml>");
        System.err.println("  java JrCompiler preview <file.jrxml> <output.html>");
    }
}
