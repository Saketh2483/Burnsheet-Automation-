import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;
import java.io.IOException;

public class CheckSheetNames {
    public static void main(String[] args) {
        try {
            FileInputStream fis = new FileInputStream("public/Combined-H&M.xlsx");
            Workbook workbook = new XSSFWorkbook(fis);
            
            System.out.println("📊 Sheet Names in Combined-H&M.xlsx:");
            System.out.println("=====================================");
            
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                String sheetName = workbook.getSheetName(i);
                Sheet sheet = workbook.getSheetAt(i);
                int rowCount = sheet.getLastRowNum();
                
                System.out.println((i + 1) + ". Sheet Name: '" + sheetName + "' (Rows: " + rowCount + ")");
            }
            
            workbook.close();
            fis.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
