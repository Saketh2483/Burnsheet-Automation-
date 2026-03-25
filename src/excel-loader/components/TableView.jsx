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
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header, index) => {
              // Hide "Hourly Rate(Rs)" column when USA is selected
              if (selectedCountry === 'USA' && header.toLowerCase().includes('hourly rate') && header.toLowerCase().includes('rs')) {
                return null;
              }
              return <th key={`header-${index}`} data-column={header}>{header}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {getFilteredData().map((row, rowIndex) => {
            const paddedRow = [...row];
            while (paddedRow.length < headers.length) paddedRow.push('');
            
            return (
              <tr key={`row-${rowIndex}`}>
                {paddedRow.map((_, cellIndex) => {
                  // Hide "Hourly Rate(Rs)" column when USA is selected
                  if (selectedCountry === 'USA' && headers[cellIndex].toLowerCase().includes('hourly rate') && headers[cellIndex].toLowerCase().includes('rs')) {
                    return null;
                  }
                  return (
                    <TableCell
                      key={`cell-${rowIndex}-${cellIndex}`}
                      row={paddedRow}
                      cellIndex={cellIndex}
                      rowIndex={rowIndex}
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
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
