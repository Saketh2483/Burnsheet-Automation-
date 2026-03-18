import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.*;
import java.util.*;

public class DataRefinery {
    private static FormulaEvaluator evaluator;
    
    // Hours rules map based on SOW Stream and Talent Type
    private static Map<String, Integer> hoursRulesMap = new HashMap<>();
    private static Map<String, Double> rateCardMap = new HashMap<>();
    
    static {
        // Initialize hours rules (from Rules.md)
        hoursRulesMap.put("ONSHORE_ONSHORE", 168);        // Onshore SOW + Onshore Talent
        hoursRulesMap.put("ONSHORE_OFFSHORE", 189);       // Onshore SOW + Offshore Talent
        hoursRulesMap.put("INDIA_INDIA", 176);            // India SOW + India Talent
        hoursRulesMap.put("BTM_BTM", 168);                 // BTM + BTM Talent
    }
    
    public static void main(String[] args) {
        String inputFilePath = "public/Home & Marketing, SOR - Burn 2026.xlsx";
        String outputFilePath = "public/Combined-Input.xlsx";
        
        try {
            // Load rate card data from Rates and Roles.xlsx BEFORE processing sheets
            loadRateCardData();
            FileInputStream fis = new FileInputStream(inputFilePath);
            Workbook inputWorkbook = new XSSFWorkbook(fis);
            
            // Create a new workbook for output
            Workbook outputWorkbook = new XSSFWorkbook();
            Sheet masterSheet = outputWorkbook.createSheet("Combined Data");
            
            // Headers will be read from the first sheet's row 8
            // Column order: EMPId, Name, Location, ACT/PCT, Skill Set, Version Level Mapping, 
            // Classification, Key, Cognizant Designation, ESA ID, ESA Description, Service Line, 
            // Hourly Rate(Rs), Hourly Rate($), Projected Rate($), Actual, Variance,
            // Verizon TQ ID, Verizon TQ Description, POC
            String[] headers = null;
            
            // Data starts from row 1 (after header)
            int masterRowIndex = 1;
            int totalRowsAdded = 0;
            boolean isFirstDataSheet = true;
            
            // Set to track unique rows (using concatenated values as key)
            Set<String> uniqueRows = new HashSet<>();
            
            // Process each sheet - SKIP THE FIRST SHEET (Legend) AND HIDDEN SHEETS
            int sheetCount = inputWorkbook.getNumberOfSheets();
            System.out.println("Total sheets found: " + sheetCount);
            System.out.println("Skipping first sheet (Legend), processing sheets from index 1 onwards");
            System.out.println("Also ignoring all hidden sheets\n");
            
            for (int sheetIdx = 1; sheetIdx < sheetCount; sheetIdx++) {
                Sheet currentSheet = inputWorkbook.getSheetAt(sheetIdx);
                String sheetName = currentSheet.getSheetName();
                
                // Skip Legend sheet explicitly
                if (sheetName.equalsIgnoreCase("Legend")) {
                    System.out.println("⏭️ Sheet skipped (Legend): " + sheetName + "\n");
                    continue;
                }
                
                // Skip hidden sheets - use Workbook's isSheetHidden method
                if (inputWorkbook.isSheetHidden(sheetIdx)) {
                    System.out.println("⏭️ Sheet skipped (hidden): " + sheetName + "\n");
                    continue;
                }
                
                // Create evaluator for this sheet to read formula values
                evaluator = inputWorkbook.getCreationHelper().createFormulaEvaluator();
                
                // Read header from row 8 (index 7) of the first visible sheet only
                if (isFirstDataSheet && headers == null) {
                    Row headerSourceRow = currentSheet.getRow(7); // Row 8 (0-indexed: 7)
                    if (headerSourceRow != null) {
                        // Create headers array with 20 columns
                        headers = new String[20];
                        
                        // Read headers from source in order (columns 0-13)
                        headers[0] = getCellValueAsString(headerSourceRow.getCell(0));   // EMPId
                        headers[1] = getCellValueAsString(headerSourceRow.getCell(1));   // Name
                        headers[2] = getCellValueAsString(headerSourceRow.getCell(2));   // Location
                        headers[3] = getCellValueAsString(headerSourceRow.getCell(3));   // ACT/PCT
                        headers[4] = getCellValueAsString(headerSourceRow.getCell(4));   // Skill Set
                        headers[5] = getCellValueAsString(headerSourceRow.getCell(5));   // Version Level Mapping
                        headers[6] = getCellValueAsString(headerSourceRow.getCell(6));   // Classification
                        headers[7] = getCellValueAsString(headerSourceRow.getCell(7));   // Key
                        headers[8] = getCellValueAsString(headerSourceRow.getCell(8));   // Cognizant Designation
                        headers[9] = getCellValueAsString(headerSourceRow.getCell(9));   // ESA ID
                        headers[10] = getCellValueAsString(headerSourceRow.getCell(10)); // ESA Description
                        headers[11] = getCellValueAsString(headerSourceRow.getCell(11)); // Service Line
                        headers[12] = getCellValueAsString(headerSourceRow.getCell(12)); // Hourly Rate(Rs)
                        headers[13] = getCellValueAsString(headerSourceRow.getCell(13)); // Hourly Rate($)
                        
                        // Calculated columns
                        headers[14] = "Projected Rate($)";      // Monthly rate calculated
                        headers[15] = "Actual";                  // Actual monthly rate
                        headers[16] = "Variance";                // Variance calculation
                        
                        // Metadata columns
                        headers[17] = "Verizon TQ ID";
                        headers[18] = "Verizon TQ Description";
                        headers[19] = "POC";
                        
                        // Create header row in output sheet
                        Row outputHeaderRow = masterSheet.createRow(0);
                        for (int i = 0; i < headers.length; i++) {
                            outputHeaderRow.createCell(i).setCellValue(headers[i]);
                        }
                        System.out.println("📋 Header row read from first sheet row 8\n");
                    }
                }
                
                // Add one line spacing between sheets (except for the first data sheet)
                if (!isFirstDataSheet) {
                    masterRowIndex++; // Skip one row for spacing
                }
                isFirstDataSheet = false;
                
                // ...existing code...
                // ...existing code...
                
                // Print sheet name as per requirement
                System.out.println("📋 Sheet name = " + sheetName);
                
                // Extract Verizon TQ ID from row 4 (index 3), columns C, D, E combined
                String verizonTqId = "";
                Row row4 = currentSheet.getRow(3); // Row 4 (0-indexed: 3)
                if (row4 != null) {
                    String columnC = getCellValueAsString(row4.getCell(2));     // Column C
                    String columnD = getCellValueAsString(row4.getCell(3));     // Column D
                    String columnE = getCellValueAsString(row4.getCell(4));     // Column E
                    verizonTqId = (columnC + " " + columnD + " " + columnE).trim();
                }
                
                // Extract Verizon TQ Description from row 5 (index 4), columns C, D, E combined
                String verizonTqDescription = "";
                Row row5 = currentSheet.getRow(4); // Row 5 (0-indexed: 4)
                if (row5 != null) {
                    String columnC = getCellValueAsString(row5.getCell(2));     // Column C
                    String columnD = getCellValueAsString(row5.getCell(3));     // Column D
                    String columnE = getCellValueAsString(row5.getCell(4));     // Column E
                    verizonTqDescription = (columnC + " " + columnD + " " + columnE).trim();
                }
                
                System.out.println("  Verizon TQ ID = " + verizonTqId);
                System.out.println("  Verizon TQ Description = " + verizonTqDescription);
                
                // Process all data rows starting from row 9 onwards (index 8) - Skip rows 6, 7 and 8 (indices 5, 6 and 7)
                int lastRowNum = currentSheet.getLastRowNum();
                int rowsFromThisSheet = 0;
                
                for (int rowIdx = 8; rowIdx <= lastRowNum; rowIdx++) {
                    Row currentRow = currentSheet.getRow(rowIdx);
                    
                    if (currentRow == null) {
                        continue;
                    }
                    
                    // Check if row has any data
                    if (isRowEmpty(currentRow)) {
                        continue;
                    }
                    
                    // Skip rows where column H (index 7) contains "Total", "LOE value", or "UPT value"
                    Cell columnHCell = currentRow.getCell(7);
                    if (columnHCell != null) {
                        String columnHValue = getCellValueAsString(columnHCell).trim().toLowerCase();
                        if (columnHValue.contains("total") || columnHValue.contains("loe value") || columnHValue.contains("upt value")) {
                            continue;
                        }
                    }
                    
                    // Extract all column values first to create a unique row key
                    String employeeId = getCellValueAsString(currentRow.getCell(0), evaluator);
                    String name = getCellValueAsString(currentRow.getCell(1), evaluator);
                    
                    // Skip rows that do not have Name (column B - index 1)
                    if (name == null || name.trim().isEmpty()) {
                        continue;
                    }
                    String location = getCellValueAsString(currentRow.getCell(2), evaluator);
                    String activity = getCellValueAsString(currentRow.getCell(3), evaluator);
                    String skillSet = getCellValueAsString(currentRow.getCell(4), evaluator);
                    String versionLevelMapping = getCellValueAsString(currentRow.getCell(5), evaluator);
                    String classification = getCellValueAsString(currentRow.getCell(6), evaluator);
                    String keyValue = getCellValueAsString(currentRow.getCell(7), evaluator);
                    String engagementDesignation = getCellValueAsString(currentRow.getCell(8), evaluator);
                    String esaId = getCellValueAsString(currentRow.getCell(9), evaluator);
                    String esaDescription = getCellValueAsString(currentRow.getCell(10), evaluator);
                    String serviceLine = getCellValueAsString(currentRow.getCell(11), evaluator);
                    String hourlyRateRs = getCellValueAsString(currentRow.getCell(12), evaluator);
                    String hourlyRateDollar = getCellValueAsString(currentRow.getCell(13), evaluator);
                    String monthlyRateDollar = getCellValueAsString(currentRow.getCell(14), evaluator);
                    
                    // Create a unique key for this row to detect duplicates
                    String rowKey = employeeId + "|" + name + "|" + location + "|" + activity + "|" + 
                                    skillSet + "|" + versionLevelMapping + "|" + classification + "|" + keyValue + "|" + 
                                    engagementDesignation + "|" + esaId + "|" + esaDescription + "|" + 
                                    serviceLine + "|" + hourlyRateRs + "|" + hourlyRateDollar + "|" + monthlyRateDollar +
                                    "|" + verizonTqId + "|" + verizonTqDescription + "|" + sheetName;
                    
                    // Skip if this row is a duplicate
                    if (uniqueRows.contains(rowKey)) {
                        System.out.println("    ⏭️ Duplicate row skipped");
                        continue;
                    }
                    
                    // Add this row to the unique set
                    uniqueRows.add(rowKey);
                    
                    // Create a new row in master sheet
                    Row masterRow = masterSheet.createRow(masterRowIndex++);
                    
                    // Column 0: EMPId
                    masterRow.createCell(0).setCellValue(employeeId);
                    
                    // Column 1: Name
                    masterRow.createCell(1).setCellValue(name);
                    
                    // Column 2: Location
                    masterRow.createCell(2).setCellValue(location);
                    
                    // Column 3: ACT/PCT
                    masterRow.createCell(3).setCellValue(activity);
                    
                    // Column 4: Skill Set
                    masterRow.createCell(4).setCellValue(skillSet);
                    
                    // Column 5: Version Level Mapping
                    masterRow.createCell(5).setCellValue(versionLevelMapping);
                    
                    // Column 6: Classification
                    masterRow.createCell(6).setCellValue(classification);
                    
                    // Column 7: Key
                    masterRow.createCell(7).setCellValue(keyValue);
                    
                    // Column 8: Cognizant Designation
                    masterRow.createCell(8).setCellValue(engagementDesignation);
                    
                    // Column 9: ESA ID
                    masterRow.createCell(9).setCellValue(esaId);
                    
                    // Column 10: ESA Description
                    masterRow.createCell(10).setCellValue(esaDescription);
                    
                    // Column 11: Service Line
                    masterRow.createCell(11).setCellValue(serviceLine);
                    
                    // Column 12: Hourly Rate(Rs)
                    masterRow.createCell(12).setCellValue(hourlyRateRs);
                    
                    // Column 13: Hourly Rate($)
                    masterRow.createCell(13).setCellValue(hourlyRateDollar);
                    
                    // Column 14: Projected Rate($) - Calculated based on location and hourly rate
                    // For ODC: Uses rate from Rate Card, otherwise uses Hourly Rate($)
                    String calculatedMonthlyRate = calculateMonthlyRate(location, hourlyRateDollar, engagementDesignation);
                    String projectedRate = !calculatedMonthlyRate.isEmpty() ? calculatedMonthlyRate : monthlyRateDollar;
                    masterRow.createCell(14).setCellValue(projectedRate);
                    
                    // Column 15: Actual - Same as projected rate
                    masterRow.createCell(15).setCellValue(projectedRate);
                    
                    // Column 16: Variance - Actual minus Projected (should be 0 since Actual = Projected)
                    try {
                        double projectedVal = Double.parseDouble(projectedRate.replaceAll("[^0-9.]", ""));
                        double actualVal = Double.parseDouble(projectedRate.replaceAll("[^0-9.]", ""));
                        double variance = actualVal - projectedVal;
                        masterRow.createCell(16).setCellValue(variance == 0 ? "0" : String.format("%.2f", variance));
                    } catch (Exception e) {
                        masterRow.createCell(16).setCellValue("0");
                    }
                    
                    // Column 17: Verizon TQ ID
                    masterRow.createCell(17).setCellValue(verizonTqId);
                    
                    // Column 18: Verizon TQ Description
                    masterRow.createCell(18).setCellValue(verizonTqDescription);
                    
                    // Column 19: POC (Sheet Name)
                    masterRow.createCell(19).setCellValue(sheetName);
                    
                    rowsFromThisSheet++;
                }
                
                System.out.println("  ✅ Rows added from this sheet: " + rowsFromThisSheet + "\n");
                totalRowsAdded += rowsFromThisSheet;
            }
            
            // Adjust column widths for better readability
            if (headers != null) {
                for (int i = 0; i < headers.length; i++) {
                    masterSheet.setColumnWidth(i, 5000);
                }
            } else {
                // Fallback if headers weren't read
                for (int i = 0; i < 20; i++) {
                    masterSheet.setColumnWidth(i, 5000);
                }
            }
            
            // Close input workbook
            inputWorkbook.close();
            fis.close();
            
            // Write output workbook
            FileOutputStream fos = new FileOutputStream(outputFilePath);
            outputWorkbook.write(fos);
            outputWorkbook.close();
            fos.close();
            
            System.out.println("=".repeat(60));
            System.out.println("✅ Combined master sheet created successfully!");
            System.out.println("📁 Output file: " + outputFilePath);
            System.out.println("📊 Total data rows added: " + totalRowsAdded);
            System.out.println("=".repeat(60));
            
        } catch (FileNotFoundException e) {
            System.err.println("❌ File not found: " + e.getMessage());
            e.printStackTrace();
        } catch (IOException e) {
            System.err.println("❌ IO Error: " + e.getMessage());
            e.printStackTrace();
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Helper method to check if a row is empty (no data in any cell)
     */
    private static boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        
        for (int i = row.getFirstCellNum(); i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && !cell.toString().trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Helper method to get cell value as String
     * Handles different cell types (String, Numeric, etc.)
     * If evaluator is provided, formula cells are evaluated to get calculated values
     */
    private static String getCellValueAsString(Cell cell, FormulaEvaluator evaluator) {
        if (cell == null) {
            return "";
        }
        
        // Evaluate formula cells to get cached/calculated values
        CellType cellType = cell.getCellType();
        if (cellType == CellType.FORMULA && evaluator != null) {
            try {
                cell = evaluator.evaluateInCell(cell);
                cellType = cell.getCellType();
            } catch (Exception e) {
                // If formula evaluation fails, try to get the cached value
                try {
                    if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        return cell.getStringCellValue().trim();
                    } else if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        double numValue = cell.getNumericCellValue();
                        if (numValue == Math.floor(numValue)) {
                            return String.valueOf((long) numValue);
                        } else {
                            return String.valueOf(numValue);
                        }
                    }
                } catch (Exception e2) {
                    // If cached value also fails, return empty
                }
                return "";
            }
        }
        
        switch (cellType) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double numValue = cell.getNumericCellValue();
                    // Check if it's an integer
                    if (numValue == Math.floor(numValue)) {
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
     * Backward-compatible overload without evaluator parameter
     */
    private static String getCellValueAsString(Cell cell) {
        return getCellValueAsString(cell, null);
    }
    
    /**
     * Calculate monthly rate based on location and hourly rate
     * Formula: Monthly Burn = Hourly Rate × Monthly Hours (based on location)
     * 
     * For ODC: Uses rate from "New Rate Card India - T&M" sheet in Rates and Roles.xlsx
     * For others: Uses Hourly Rate($) from input sheet
     */
    private static String calculateMonthlyRate(String location, String hourlyRate, String engagementDesignation) {
        try {
            if (location == null || location.trim().isEmpty()) {
                return "";
            }
            
            double rate = 0;
            int hours = 168; // Default
            
            // Determine hours and rate source based on location
            if (location.toUpperCase().contains("ODC")) {
                // ODC = India SOW + India Talent = 176 hours/month
                hours = hoursRulesMap.getOrDefault("INDIA_INDIA", 176);
                
                // Try to get rate from rate card (New Rate Card India - T&M sheet)
                if (engagementDesignation != null && !engagementDesignation.trim().isEmpty()) {
                    Double rateFromCard = rateCardMap.get(engagementDesignation.toLowerCase().trim());
                    if (rateFromCard != null && rateFromCard > 0) {
                        rate = rateFromCard;
                    } else {
                        // Fallback to hourly rate if designation not found in rate card
                        rate = parseRate(hourlyRate);
                    }
                } else {
                    // No designation, use hourly rate
                    rate = parseRate(hourlyRate);
                }
            } else {
                // Non-ODC locations (Onshore, etc.)
                hours = hoursRulesMap.getOrDefault("ONSHORE_ONSHORE", 168);
                rate = parseRate(hourlyRate);
            }
            
            if (rate <= 0) {
                return "";
            }
            
            // Calculate monthly rate: Hourly Rate × Monthly Hours
            double monthlyRate = rate * hours;
            
            // Format the result
            if (monthlyRate == Math.floor(monthlyRate)) {
                return String.valueOf((long) monthlyRate);
            } else {
                return String.format("%.2f", monthlyRate);
            }
            
        } catch (Exception e) {
            return "";
        }
    }
    
    /**
     * Helper method to parse rate from string (removes currency symbols, etc.)
     */
    private static double parseRate(String rateStr) {
        if (rateStr == null || rateStr.trim().isEmpty()) {
            return 0;
        }
        try {
            String cleaned = rateStr.replaceAll("[^0-9.]", "");
            if (!cleaned.isEmpty()) {
                return Double.parseDouble(cleaned);
            }
        } catch (Exception e) {
            // Return 0 if parsing fails
        }
        return 0;
    }
    
    /**
     * Load rate card data from Rates and Roles.xlsx file
     * Reads from "New Rate Card India - T&M" sheet and extracts "Round off (Final Rates)" column
     */
    private static void loadRateCardData() {
        String ratesFile = "public/Rates and Roles .xlsx";  // Note: space before .xlsx
        try {
            File file = new File(ratesFile);
            if (!file.exists()) {
                System.out.println("⚠️  Rates and Roles.xlsx file not found. Will use Hourly Rate($) from input sheet.");
                return;
            }
            
            FileInputStream fis = new FileInputStream(file);
            Workbook ratesWorkbook = new XSSFWorkbook(fis);
            
            // Look for "New Rate Card India - T&M" sheet
            Sheet rateSheet = ratesWorkbook.getSheet("New Rate Card India - T&M");
            if (rateSheet == null) {
                System.out.println("⚠️  'New Rate Card India - T&M' sheet not found in Rates and Roles.xlsx. Will use Hourly Rate($) from input sheet.");
                fis.close();
                ratesWorkbook.close();
                return;
            }
            
            System.out.println("✅ Rate card loaded from 'New Rate Card India - T&M' sheet in Rates and Roles.xlsx");
            
            // Find "Round off (Final Rates)" column
            int roundOffColIndex = -1;
            Row headerRow = rateSheet.getRow(0);
            if (headerRow != null) {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    Cell cell = headerRow.getCell(i);
                    if (cell != null) {
                        String headerValue = getCellValueAsString(cell).toLowerCase();
                        if (headerValue.contains("round off") || headerValue.contains("final rate")) {
                            roundOffColIndex = i;
                            break;
                        }
                    }
                }
            }
            
            // If found, read all designation/role rates
            if (roundOffColIndex >= 0) {
                for (int rowIdx = 1; rowIdx <= rateSheet.getLastRowNum(); rowIdx++) {
                    Row row = rateSheet.getRow(rowIdx);
                    if (row != null) {
                        // Designation/Role is typically in first column
                        Cell designationCell = row.getCell(0);
                        Cell rateCell = row.getCell(roundOffColIndex);
                        
                        if (designationCell != null && rateCell != null) {
                            String designation = getCellValueAsString(designationCell).trim().toLowerCase();
                            if (!designation.isEmpty()) {
                                try {
                                    double rate = 0;
                                    if (rateCell.getCellType() == CellType.NUMERIC) {
                                        rate = rateCell.getNumericCellValue();
                                    } else {
                                        String rateStr = getCellValueAsString(rateCell).replaceAll("[^0-9.]", "");
                                        if (!rateStr.isEmpty()) {
                                            rate = Double.parseDouble(rateStr);
                                        }
                                    }
                                    if (rate > 0) {
                                        rateCardMap.put(designation, rate);
                                    }
                                } catch (Exception e) {
                                    // Skip invalid rate entries
                                }
                            }
                        }
                    }
                }
                System.out.println("✅ Loaded " + rateCardMap.size() + " rate card entries");
            } else {
                System.out.println("⚠️  'Round off (Final Rates)' column not found. Will use Hourly Rate($) from input sheet.");
            }
            
            fis.close();
            ratesWorkbook.close();
            
        } catch (Exception e) {
            System.out.println("⚠️  Error loading rate card: " + e.getMessage());
        }
    }
}
