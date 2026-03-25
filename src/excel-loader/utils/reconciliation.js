export const handleReconciliation = (
  sheetData,
  setSheetData,
  headers,
  changedRowIndices,
  setHasChanges,
  setChangedRowIndices
) => {
  // Find the timesheet/hours column index
  const timesheetColIndex = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return (lower.includes('timesheet') || lower.includes('hours')) && !lower.includes('hourly');
  });
  
  // Find the hourly rate column index (with $ symbol)
  const hourlyRateColIndex = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return lower.includes('hourly rate') && lower.includes('$');
  });
  
  // Find the actual rate column index
  const actualRateColIndex = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return lower.includes('actual rate') || (lower.includes('rate') && lower.includes('$') && !lower.includes('hourly'));
  });
  
  // Find the projected rate column index
  const projectedRateColIndex = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return lower.includes('projected rate');
  });
  
  // Find the variance column index
  const varianceColIndex = headers.findIndex(h => {
    const lower = h.toLowerCase();
    return lower.includes('variance');
  });
  
  // Validation: check if all required columns exist
  if (timesheetColIndex === -1) {
    alert('⚠️ Could not find "Timesheet" or "Hours" column');
    return;
  }
  
  if (hourlyRateColIndex === -1) {
    alert('⚠️ Could not find "Hourly Rate ($)" column');
    return;
  }
  
  if (actualRateColIndex === -1) {
    alert('⚠️ Could not find "Actual Rate" column');
    return;
  }

  // Update actual rate and variance for ONLY the changed rows
  let rowsWithActualRateUpdated = 0;
  let rowsWithVarianceUpdated = 0;
  
  const updatedData = sheetData.map((row, rowIdx) => {
    const newRow = [...row];
    
    // Only reconcile rows that were actually changed by the user
    if (!changedRowIndices.has(rowIdx)) {
      return newRow;
    }
    
    const timesheetHours = parseFloat(newRow[timesheetColIndex]?.toString().replace(/[^0-9.-]/g, ''));
    const hourlyRate = parseFloat(newRow[hourlyRateColIndex]?.toString().replace(/[^0-9.-]/g, ''));
    
    // Only update actual rate and variance if BOTH timesheet hours and hourly rate are valid
    if (!isNaN(timesheetHours) && !isNaN(hourlyRate) && timesheetHours > 0 && hourlyRate > 0) {
      const actualRate = timesheetHours * hourlyRate;
      newRow[actualRateColIndex] = actualRate.toFixed(2);
      rowsWithActualRateUpdated++;
      
      // Calculate and update variance ONLY if projected rate column exists AND has a valid value
      if (varianceColIndex >= 0 && projectedRateColIndex >= 0) {
        const projectedRateStr = newRow[projectedRateColIndex]?.toString().trim() || '';
        // Only calculate variance if projected rate column has a non-empty value
        if (projectedRateStr) {
          const projectedRate = parseFloat(projectedRateStr.replace(/[^0-9.-]/g, ''));
          if (!isNaN(projectedRate)) {
            const variance = projectedRate - actualRate;
            newRow[varianceColIndex] = variance.toFixed(2);
            rowsWithVarianceUpdated++;
          }
        }
      }
    }
    
    return newRow;
  });

  setSheetData(updatedData);
  
  console.log('Reconciliation Details:', {
    timesheetColumn: headers[timesheetColIndex],
    hourlyRateColumn: headers[hourlyRateColIndex],
    actualRateColumn: headers[actualRateColIndex],
    projectedRateColumn: headers[projectedRateColIndex],
    varianceColumn: headers[varianceColIndex],
    rowsWithActualRateUpdated,
    rowsWithVarianceUpdated,
    changedRowCount: changedRowIndices.size
  });
  setHasChanges(false);
  setChangedRowIndices(new Set());
};
