import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;
import java.io.IOException;

public class PrintAllSheetDetails {
    
    public static void main(String[] args) {
        String excelFilePath = "public/Home & Marketing, SOR - Burn 2026.xlsx";
        
        try {
            printDetailedSheetInfo(excelFilePath);
        } catch (IOException e) {
            System.err.println("❌ Error reading Excel file: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Prints detailed information about all sheets including hidden sheets
     */
    public static void printDetailedSheetInfo(String filePath) throws IOException {
        FileInputStream fis = new FileInputStream(filePath);
        Workbook workbook = new XSSFWorkbook(fis);
        
        System.out.println("╔═══════════════════════════════════════════════════════╗");
        System.out.println("║  📊 DETAILED WORKBOOK SHEET INFORMATION              ║");
        System.out.println("╚═══════════════════════════════════════════════════════╝");
        System.out.println();
        
        int totalSheets = workbook.getNumberOfSheets();
        System.out.println("📋 Total Sheets in Workbook: " + totalSheets);
        System.out.println("─────────────────────────────────────────────────────────");
        System.out.println();
        
        if (totalSheets == 0) {
            System.out.println("⚠️  No sheets found in this workbook!");
            workbook.close();
            fis.close();
            return;
        }
        
        for (int i = 0; i < totalSheets; i++) {
            Sheet sheet = workbook.getSheetAt(i);
            String sheetName = sheet.getSheetName();
            int rowCount = sheet.getLastRowNum() + 1;  // Add 1 because getLastRowNum is 0-based
            int colCount = sheet.getRow(0) != null ? sheet.getRow(0).getLastCellNum() : 0;
            boolean isHidden = workbook.isSheetHidden(i);
            boolean isVeryHidden = workbook.isSheetVeryHidden(i);
            
            System.out.println("┌─────────────────────────────────────────────────────┐");
            System.out.println("│ Sheet #" + (i + 1) + (isHidden || isVeryHidden ? " (HIDDEN)" : "") + "");
            System.out.println("├─────────────────────────────────────────────────────┤");
            System.out.println("│ 📝 Sheet Name    : " + String.format("%-35s", "'" + sheetName + "'") + "│");
            System.out.println("│ 📊 Total Rows    : " + String.format("%-35d", rowCount) + "│");
            System.out.println("│ 📋 Total Columns : " + String.format("%-35d", colCount) + "│");
            System.out.println("│ 👁️  Visible       : " + String.format("%-35s", (isHidden ? "No (Hidden)" : "Yes")) + "│");
            System.out.println("└─────────────────────────────────────────────────────┘");
            System.out.println();
        }
        
        workbook.close();
        fis.close();
        
        System.out.println("═════════════════════════════════════════════════════════");
        System.out.println("✅ Sheet information printed successfully!");
    }
}
