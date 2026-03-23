#!/usr/bin/env python
import openpyxl
from openpyxl.utils import get_column_letter
import os
from pathlib import Path

def combine_excel_sheets(input_file, output_file):
    """
    Combines multiple Excel sheets into a master data file with specified logic
    """
    
    # Load the input workbook
    wb_input = openpyxl.load_workbook(input_file)
    
    # Get all sheet names, skip the first one (legend) and hidden sheets
    sheet_names = []
    for sheet_name in wb_input.sheetnames:
        ws = wb_input[sheet_name]
        # Skip hidden sheets (sheet_state will be 'hidden')
        if ws.sheet_state != 'hidden':
            sheet_names.append(sheet_name)
    
    # Skip the first sheet (legend) if there are more sheets
    if len(sheet_names) > 1:
        sheet_names = sheet_names[1:]
    
    print(f"Processing sheets: {sheet_names}")
    
    # Create new output workbook
    wb_output = openpyxl.Workbook()
    ws_output = wb_output.active
    ws_output.title = "Combined Data"
    header_written = False
    
    # Define headers
    headers = [
        "EMPId", "Name", "Location", "Country", "ACT/PCT", "Skill Set",
        "Verizon Level Mapping", "Classification", "Key", "Cognizant Designation",
        "ESA ID", "ESA Description", "Service Line", "Hourly Rate(Rs)",
        "Hourly Rate($)", "Projected Rate($)", "Actual Rate", "Variance",
        "Jan-26", "Feb-26", "Mar-26", "Verizon TQ ID", "Verizon TQ Description", "POC"
    ]
    
    # Write headers only once
    if not header_written:
        for col_idx, header in enumerate(headers, 1):
            ws_output.cell(row=1, column=col_idx, value=header)
        header_written = True
    
    # Process each sheet
    current_row = 2
    
    for sheet_name in sheet_names:
        ws_input = wb_input[sheet_name]
        
        # Variable x stores the sheet name
        x = sheet_name
        print(f"Sheet name = {x}")
        
        # Determine country based on sheet name
        if x and x[0].isdigit():
            country = "India"
        elif x and x[0].isalpha():
            country = "USA"
        else:
            continue
        
        # Read VerizonTqId from row 4, columns C:E (combine them)
        verizon_tq_id = ""
        for col in ['C', 'D', 'E']:
            cell_value = ws_input[f'{col}4'].value
            if cell_value:
                verizon_tq_id += str(cell_value)
        
        # Read VerizonTqDescription from row 5, columns C:E (combine them)
        verizon_tq_description = ""
        for col in ['C', 'D', 'E']:
            cell_value = ws_input[f'{col}5'].value
            if cell_value:
                verizon_tq_description += str(cell_value)
        
        # Read header row from row 8
        header_row_mapping = {}
        for col in range(1, ws_input.max_column + 1):
            header_value = ws_input.cell(row=8, column=col).value
            if header_value:
                header_row_mapping[col] = str(header_value).strip()
        
        # Process data rows (starting from row 9)
        for row in range(9, ws_input.max_row + 1):
            # Check if Name column has value (skip if empty)
            name_value = None
            name_col_idx = None
            for col, header in header_row_mapping.items():
                if 'name' in header.lower():
                    name_value = ws_input.cell(row=row, column=col).value
                    name_col_idx = col
                    break
            
            if not name_value:
                continue
            
            # Build row data from input, reading only up to and including "Hourly Rate($)"
            row_data = {}
            last_col_to_read = None
            
            for col, header in header_row_mapping.items():
                if header:
                    # Find the last column to read (Hourly Rate($))
                    if "Hourly Rate($)" in header:
                        last_col_to_read = col
            
            for col, header in header_row_mapping.items():
                if header:
                    # Stop after Hourly Rate($) column
                    if last_col_to_read and col > last_col_to_read:
                        break
                    
                    cell_value = ws_input.cell(row=row, column=col).value
                    row_data[header] = cell_value
            
            # Process and map data to output columns
            output_row = [None] * len(headers)
            
            # Map basic columns from input data
            for header_idx, header in enumerate(headers):
                if header == "EMPId":
                    # Look for EmpID or EMPId or similar in row_data
                    emp_value = None
                    if "EmpID" in row_data:
                        emp_value = row_data["EmpID"]
                    elif "EMPId" in row_data:
                        emp_value = row_data["EMPId"]
                    else:
                        # Search for any empid-like key
                        for key, value in row_data.items():
                            if key and isinstance(key, str) and 'empid' in key.lower():
                                emp_value = value
                                break
                    if emp_value is not None:
                        output_row[header_idx] = emp_value
                elif header in row_data:
                    output_row[header_idx] = row_data[header]
                elif header == "Country":
                    output_row[header_idx] = country
                elif header == "Verizon TQ ID":
                    output_row[header_idx] = verizon_tq_id
                elif header == "Verizon TQ Description":
                    output_row[header_idx] = verizon_tq_description
                elif header == "POC":
                    output_row[header_idx] = x
            
            # Handle Classification based on country
            classification = None
            verizon_level = row_data.get("Verizon Level Mapping", "")
            location = row_data.get("Location", "")
            
            if country == "India":
                classification = row_data.get("Classification", "")
                output_row[headers.index("Classification")] = classification
                # Key = Classification + Location + Verizon Level Mapping (no delimiters)
                key_parts = [str(p) for p in [classification, location, verizon_level] if p]
                key = "".join(key_parts)
                output_row[headers.index("Key")] = key
            else:  # USA
                # Classification = Verizon Level Mapping with characters before '-' removed and "Skills" removed
                if verizon_level:
                    verizon_level_str = str(verizon_level)
                    if '-' in verizon_level_str:
                        classification = verizon_level_str.split('-', 1)[1]
                    else:
                        classification = verizon_level_str
                    classification = classification.replace("Skills", "").strip()
                
                output_row[headers.index("Classification")] = classification
                
                # Key = Location + Verizon Level Mapping (no delimiters)
                key_parts = [str(p) for p in [location, verizon_level] if p]
                key = "".join(key_parts)
                output_row[headers.index("Key")] = key
            
            # Write row to output
            for col_idx, value in enumerate(output_row, 1):
                ws_output.cell(row=current_row, column=col_idx, value=value)
            
            current_row += 1
    
    # Save output workbook
    wb_output.save(output_file)
    print(f"\n✓ Combined data saved to {output_file}")

if __name__ == "__main__":
    input_file = "public/Home & Marketing, SOR - Burn 2026.xlsx"
    output_file = "public/Combined-Input.xlsx"
    
    if os.path.exists(input_file):
        combine_excel_sheets(input_file, output_file)
    else:
        print(f"Error: {input_file} not found")
