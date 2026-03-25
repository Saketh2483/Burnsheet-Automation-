import React from 'react';
import { TableCell } from './TableCell';

export const TableView = ({
  headers,
  sheetData,
  getFilteredData,
  selectedCountry,
  expandedSkillCell,
  setExpandedSkillCell,
  handleCellChange,
  dropdownOptions
}) => {
  // Find POC column index
  const pocColumnIndex = headers.findIndex(h => h.toLowerCase().includes('poc'));
  
  // Find Name column index to insert burn indicator after it
  const nameColumnIndex = headers.findIndex(h => h.toLowerCase().includes('name'));
  
  // Helper function to check if a column should be hidden
  const shouldHideColumn = (header) => {
    // Hide POC column
    if (header.toLowerCase().includes('poc')) {
      return true;
    }
    // Hide "Hourly Rate(Rs)" column when USA is selected
    if (selectedCountry === 'USA' && header.toLowerCase().includes('hourly rate') && header.toLowerCase().includes('rs')) {
      return true;
    }
    return false;
  };
  
  // Enhanced headers array with burn indicator inserted after Name
  const getEnhancedHeaders = () => {
    if (nameColumnIndex === -1) return headers;
    const enhanced = [...headers];
    // Insert burn indicator column right after Name column
    enhanced.splice(nameColumnIndex + 1, 0, 'Burn Indicator');
    return enhanced;
  };
  
  // Group rows by POC value
  const groupedRows = () => {
    const filteredData = getFilteredData();
    const groups = new Map();
    
    // Map filtered data back to original indices in sheetData
    const originalIndices = new Map();
    filteredData.forEach(row => {
      const originalIndex = sheetData.findIndex(origRow => origRow === row);
      if (originalIndex !== -1) {
        originalIndices.set(row, originalIndex);
      }
    });
    
    filteredData.forEach((row) => {
      const pocValue = pocColumnIndex !== -1 ? (row[pocColumnIndex] || 'Unknown') : 'Unknown';
      if (!groups.has(pocValue)) {
        groups.set(pocValue, []);
      }
      const originalIndex = originalIndices.get(row) !== undefined ? originalIndices.get(row) : -1;
      groups.get(pocValue).push({ row, originalIndex });
    });
    
    return groups;
  };

  const pocGroups = groupedRows();
  const enhancedHeaders = getEnhancedHeaders();

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {enhancedHeaders.map((header, index) => {
              if (shouldHideColumn(header)) {
                return null;
              }
              return <th key={`header-${index}`} data-column={header} className={header === 'Burn Indicator' ? 'burn-indicator-header' : ''}>{header}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from(pocGroups.entries()).map(([pocValue, rows]) => (
            <React.Fragment key={`poc-group-${pocValue}`}>
              {/* POC Header Row */}
              <tr className="poc-header-row" style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={enhancedHeaders.filter(h => !shouldHideColumn(h)).length} style={{ padding: '10px', textAlign: 'left' }}>
                  POC: {pocValue}
                </td>
              </tr>
              
              {/* Data Rows for this POC group */}
              {rows.map(({ row, originalIndex }) => {
                const paddedRow = [...row];
                while (paddedRow.length < headers.length) paddedRow.push('');
                
                return (
                  <tr key={`row-${originalIndex}`}>
                    {enhancedHeaders.map((header, headerIndex) => {
                      if (shouldHideColumn(header)) {
                        return null;
                      }
                      
                      // Handle burn indicator column
                      if (header === 'Burn Indicator') {
                        return (
                          <TableCell
                            key={`cell-${originalIndex}-burn-indicator`}
                            row={paddedRow}
                            cellIndex={-1}
                            rowIndex={originalIndex}
                            headerName={header}
                            headers={headers}
                            dropdownOptions={dropdownOptions}
                            expandedSkillCell={expandedSkillCell}
                            setExpandedSkillCell={setExpandedSkillCell}
                            handleCellChange={handleCellChange}
                          />
                        );
                      }
                      
                      // Adjust cellIndex if we're past the name column (account for inserted burn indicator)
                      let actualCellIndex = headerIndex;
                      if (nameColumnIndex !== -1 && headerIndex > nameColumnIndex + 1) {
                        actualCellIndex = headerIndex - 1;
                      }
                      
                      return (
                        <TableCell
                          key={`cell-${originalIndex}-${actualCellIndex}`}
                          row={paddedRow}
                          cellIndex={actualCellIndex}
                          rowIndex={originalIndex}
                          headerName={headers[actualCellIndex] || ''}
                          headers={headers}
                          dropdownOptions={dropdownOptions}
                          expandedSkillCell={expandedSkillCell}
                          setExpandedSkillCell={setExpandedSkillCell}
                          handleCellChange={handleCellChange}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
