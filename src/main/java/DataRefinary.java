import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.*;

public class DataRefinary {
    
    public static void main(String[] args) {
        String inputFilePath = "public/Home & Marketing, SOR - Burn 2026.xlsx";
        String outputFilePath = "public/H&M-Master-Consolidated.xlsx";
        
        try {
            refineExcelFile(inputFilePath, outputFilePath);
            System.out.println("✅ Excel file refined successfully!");
            System.out.println("📁 Output file: " + outputFilePath);
        } catch (IOException e) {
            System.err.println("❌ Error processing Excel file: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Refines the Excel file by:
     * 1. Reading all sheets
     * 2. Adding POC column with sheet name for each sheet
     * 3. Consolidating all sheets into a master sheet
     */
    public static void refineExcelFile(String inputFilePath, String outputFilePath) throws IOException {
        FileInputStream fis = new FileInputStream(inputFilePath);
        Workbook workbook = new XSSFWorkbook(fis);
        
        List<SheetData> allSheetsData = new ArrayList<>();
        List<String> masterHeaders = new ArrayList<>();
        
        // Step 1: Read all sheets and collect data
        System.out.println("📖 Reading sheets...");
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            Sheet sheet = workbook.getSheetAt(i);
            if (sheet == null) continue;
            String sheetName = sheet.getSheetName();
            
            System.out.println("   └─ Found sheet: '" + sheetName + "'");
            
            SheetData sheetData = readSheet(sheet, sheetName);
            if (sheetData.getRows().isEmpty()) {
                System.out.println("      ⏭️  Skipping empty sheet: " + sheetName);
                continue;
            }
            
            allSheetsData.add(sheetData);
            System.out.println("      ✓ Sheet processed: '" + sheetName + "' (" + sheetData.getRows().size() + " rows)");
            
            // Collect all unique headers
            for (String header : sheetData.getHeaders()) {
                if (!masterHeaders.contains(header)) {
                    masterHeaders.add(header);
                }
            }
        }
        
        // Add POC column to headers if not already present
        if (!masterHeaders.contains("POC")) {
            masterHeaders.add(0, "POC");
        }
        
        fis.close();
        workbook.close();
        
        // Step 2: Create new workbook with master sheet
        System.out.println("\n📝 Creating master sheet...");
        Workbook outputWorkbook = new XSSFWorkbook();
        Sheet masterSheet = outputWorkbook.createSheet("Master");
        
        // Write headers
        Row headerRow = masterSheet.createRow(0);
        CellStyle headerStyle = createHeaderStyle(outputWorkbook);
        
        for (int i = 0; i < masterHeaders.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(masterHeaders.get(i));
            cell.setCellStyle(headerStyle);
        }
        
        // Get POC column index
        int pocColumnIndex = masterHeaders.indexOf("POC");
        
        // Write data from all sheets
        int currentRow = 1;
        for (SheetData sheetData : allSheetsData) {
            String sheetName = sheetData.getSheetName();
            Map<String, Integer> headerIndexMap = new HashMap<>();
            
            // Create header index map for this sheet
            for (int i = 0; i < sheetData.getHeaders().size(); i++) {
                headerIndexMap.put(sheetData.getHeaders().get(i), i);
            }
            
            // Write rows
            for (List<String> rowData : sheetData.getRows()) {
                Row row = masterSheet.createRow(currentRow);
                
                // Fill POC column with sheet name
                Cell pocCell = row.createCell(pocColumnIndex);
                pocCell.setCellValue(sheetName);
                
                // Fill other columns
                for (int colIndex = 0; colIndex < masterHeaders.size(); colIndex++) {
                    if (colIndex == pocColumnIndex) continue; // Skip POC, already filled
                    
                    String headerName = masterHeaders.get(colIndex);
                    Integer sourceColIndex = headerIndexMap.get(headerName);
                    
                    Cell cell = row.createCell(colIndex);
                    if (sourceColIndex != null && sourceColIndex < rowData.size()) {
                        cell.setCellValue(rowData.get(sourceColIndex));
                    }
                }
                
                currentRow++;
            }
        }
        
        // Auto-size columns for better readability
        System.out.println("🎨 Formatting columns...");
        for (int i = 0; i < masterHeaders.size(); i++) {
            masterSheet.autoSizeColumn(i);
        }
        
        // Step 3: Save the output file
        FileOutputStream fos = new FileOutputStream(outputFilePath);
        outputWorkbook.write(fos);
        fos.close();
        outputWorkbook.close();
        
        System.out.println("✅ Master sheet created with " + (currentRow - 1) + " data rows");
    }
    
    /**
     * Reads a sheet and extracts headers and data rows
     */
    private static SheetData readSheet(Sheet sheet, String sheetName) {
        SheetData sheetData = new SheetData(sheetName);
        
        if (sheet.getPhysicalNumberOfRows() == 0) {
            return sheetData;
        }
        
        // Read headers from first row
        Row headerRow = sheet.getRow(0);
        if (headerRow != null) {
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                String headerValue = getCellValueAsString(cell);
                if (!headerValue.trim().isEmpty()) {
                    sheetData.addHeader(headerValue.trim());
                }
            }
        }
        
        // Read data rows (skip header and summary rows)
        for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
            Row row = sheet.getRow(rowNum);
            if (row == null) continue;
            
            List<String> rowData = new ArrayList<>();
            boolean hasData = false;
            
            for (int colNum = 0; colNum < row.getLastCellNum(); colNum++) {
                Cell cell = row.getCell(colNum);
                String cellValue = getCellValueAsString(cell);
                rowData.add(cellValue.trim());
                if (!cellValue.trim().isEmpty()) {
                    hasData = true;
                }
            }
            
            // Skip empty rows and summary rows
            if (!hasData) continue;
            
            String firstCellValue = rowData.isEmpty() ? "" : rowData.get(0).toLowerCase();
            if (firstCellValue.contains("total") || 
                firstCellValue.contains("loe value") || 
                firstCellValue.contains("upt value") || 
                firstCellValue.contains("grand total")) {
                break;
            }
            
            sheetData.addRow(rowData);
        }
        
        return sheetData;
    }
    
    /**
     * Extracts the value from a cell as a string
     */
    private static String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double numValue = cell.getNumericCellValue();
                    if (numValue == Math.floor(numValue) && !Double.isInfinite(numValue)) {
                        return String.valueOf((long) numValue);
                    } else {
                        return String.valueOf(numValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            case BLANK:
                return "";
            default:
                return "";
        }
    }
    
    /**
     * Creates a header cell style
     */
    private static CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        return style;
    }
    
    /**
     * Helper class to store sheet data
     */
    static class SheetData {
        private String sheetName;
        private List<String> headers = new ArrayList<>();
        private List<List<String>> rows = new ArrayList<>();
        
        public SheetData(String sheetName) {
            this.sheetName = sheetName;
        }
        
        public void addHeader(String header) {
            headers.add(header);
        }
        
        public void addRow(List<String> row) {
            rows.add(row);
        }
        
        public String getSheetName() {
            return sheetName;
        }
        
        public List<String> getHeaders() {
            return headers;
        }
        
        public List<List<String>> getRows() {
            return rows;
        }
    }
}
