import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;
import java.io.IOException;

public class PrintSheetNames {
    
    public static void main(String[] args) {
        String excelFilePath = "public/Combined-H&M.xlsx";
        
        try {
            printAllSheetNames(excelFilePath);
        } catch (IOException e) {
            System.err.println("❌ Error reading Excel file: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Prints all sheet names from the Excel workbook
     */
    public static void printAllSheetNames(String filePath) throws IOException {
        FileInputStream fis = new FileInputStream(filePath);
        Workbook workbook = new XSSFWorkbook(fis);
        
        System.out.println("╔════════════════════════════════════════╗");
        System.out.println("║  📊 All Sheet Names in Workbook       ║");
        System.out.println("╚════════════════════════════════════════╝");
        System.out.println();
        
        int totalSheets = workbook.getNumberOfSheets();
        System.out.println("Total Sheets Found: " + totalSheets);
        System.out.println("────────────────────────────────────────");
        System.out.println();
        
        for (int i = 0; i < totalSheets; i++) {
            Sheet sheet = workbook.getSheetAt(i);
            String sheetName = sheet.getSheetName();
            int rowCount = sheet.getLastRowNum();
            
            System.out.println("Sheet #" + (i + 1) + ":");
            System.out.println("  ├─ Name: '" + sheetName + "'");
            System.out.println("  ├─ Rows: " + rowCount);
            System.out.println("  └─ Columns: " + sheet.getRow(0).getLastCellNum());
            System.out.println();
        }
        
        workbook.close();
        fis.close();
        
        System.out.println("════════════════════════════════════════");
        System.out.println("✅ Sheet names printed successfully!");
    }
}
