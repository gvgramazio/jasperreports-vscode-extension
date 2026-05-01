import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 * Thin CLI wrapper that compiles a JRXML file to a .jasper file.
 * <p>
 * Uses reflection to call {@code JasperCompileManager.compileReportToFile}
 * so this class has zero compile-time dependencies on JasperReports.
 * The JasperReports JARs must be on the classpath at runtime.
 * <p>
 * Usage: {@code java -cp <jasperreports-jars>:jr-compiler.jar JrCompiler file.jrxml}
 * <p>
 * Produces {@code file.jasper} next to the source file.
 */
public class JrCompiler {
    public static void main(String[] args) {
        if (args.length != 1) {
            System.err.println("Usage: java JrCompiler <file.jrxml>");
            System.exit(1);
        }
        try {
            Class<?> managerClass = Class.forName(
                "net.sf.jasperreports.engine.JasperCompileManager");
            Method compileMethod = managerClass.getMethod(
                "compileReportToFile", String.class);
            compileMethod.invoke(null, args[0]);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            cause.printStackTrace();
            System.exit(2);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(3);
        }
    }
}
