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

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => {
              if (shouldHideColumn(header)) {
                return null;
              }
              return <th key={`header-${index}`} data-column={header}>{header}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from(pocGroups.entries()).map(([pocValue, rows]) => (
            <React.Fragment key={`poc-group-${pocValue}`}>
              {/* POC Header Row */}
              <tr className="poc-header-row" style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={headers.filter(h => !shouldHideColumn(h)).length} style={{ padding: '10px', textAlign: 'left' }}>
                  POC: {pocValue}
                </td>
              </tr>
              
              {/* Data Rows for this POC group */}
              {rows.map(({ row, originalIndex }) => {
                const paddedRow = [...row];
                while (paddedRow.length < headers.length) paddedRow.push('');
                
                return (
                  <tr key={`row-${originalIndex}`}>
                    {paddedRow.map((_, cellIndex) => {
                      if (shouldHideColumn(headers[cellIndex])) {
                        return null;
                      }
                      return (
                        <TableCell
                          key={`cell-${originalIndex}-${cellIndex}`}
                          row={paddedRow}
                          cellIndex={cellIndex}
                          rowIndex={originalIndex}
                          headerName={headers[cellIndex] || ''}
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
