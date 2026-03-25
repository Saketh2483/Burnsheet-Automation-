export const handleCellChange = (
  rowIndex,
  cellIndex,
  newValue,
  headers,
  sheetData,
  setSheetData,
  skillMatrix,
  setHasChanges,
  setChangedRowIndices
) => {
  const updatedData = [...sheetData];
  const isSkillSetColumn = headers[cellIndex]?.toLowerCase().includes('skill set');
  const headerLower = headers[cellIndex]?.toLowerCase() || '';
  const isTimesheetColumn = (headerLower.includes('timesheet') || (headerLower.includes('hours') && !headerLower.includes('hourly')));
  
  if (isSkillSetColumn) {
    // Check if this is a removal operation (marked with ___REMOVE___)
    const isRemovalOperation = newValue && newValue.startsWith('___REMOVE___');
    const actualValue = isRemovalOperation ? newValue.replace('___REMOVE___', '') : newValue;
    
    if (isRemovalOperation) {
      // Direct replacement - this is a removal/filtering operation
      updatedData[rowIndex][cellIndex] = actualValue;
    } else if (actualValue) {
      // This is adding a new skill
      const currentValue = updatedData[rowIndex][cellIndex] || '';
      const skillValues = currentValue.split(',').map(s => s.trim()).filter(Boolean);
      
      if (!skillValues.includes(actualValue)) {
        skillValues.push(actualValue);
        updatedData[rowIndex][cellIndex] = skillValues.join(', ');
      }
    } else {
      // Empty value - clear the cell
      updatedData[rowIndex][cellIndex] = '';
    }
  } else {
    updatedData[rowIndex][cellIndex] = newValue;
  }
  
  // Auto-categorize if skill set changed
  const skillSetColumnIndex = headers.findIndex(h => h.toLowerCase().includes('skill set'));
  const classificationColumnIndex = headers.findIndex(h => h.toLowerCase().includes('classification'));
  
  if (cellIndex === skillSetColumnIndex && classificationColumnIndex >= 0) {
    const firstSkill = updatedData[rowIndex][cellIndex].split(',')[0]?.trim();
    const classification = skillMatrix[firstSkill?.toLowerCase()];
    if (classification && !updatedData[rowIndex][classificationColumnIndex]) {
      updatedData[rowIndex][classificationColumnIndex] = classification;
    }
  }

  // Auto-update Actual Rate and Variance when Timesheet/Hours column changes
  if (isTimesheetColumn) {
    // Find Hourly Rate, Actual Rate, Projected Rate, and Variance columns
    const hourlyRateColIndex = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return (lower.includes('hourly rate') && lower.includes('$')) || (lower.includes('monthly rate') && lower.includes('$'));
    });
    
    const actualRateColIndex = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('actual rate') || (lower.includes('actual') && lower.includes('$') && !lower.includes('hourly'));
    });
    
    const projectedRateColIndex = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('projected rate');
    });
    
    const varianceColIndex = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('variance');
    });
    
    // Calculate and update Actual Rate if both columns exist
    if (hourlyRateColIndex >= 0 && actualRateColIndex >= 0) {
      const timesheetHours = parseFloat(newValue?.toString().replace(/[^0-9.-]/g, ''));
      const hourlyRate = parseFloat(updatedData[rowIndex][hourlyRateColIndex]?.toString().replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(timesheetHours) && !isNaN(hourlyRate) && timesheetHours > 0 && hourlyRate > 0) {
        const actualRate = timesheetHours * hourlyRate;
        updatedData[rowIndex][actualRateColIndex] = actualRate.toFixed(2);
        
        // Update Variance if Projected Rate column exists
        if (varianceColIndex >= 0 && projectedRateColIndex >= 0) {
          const projectedRate = parseFloat(updatedData[rowIndex][projectedRateColIndex]?.toString().replace(/[^0-9.-]/g, ''));
          if (!isNaN(projectedRate)) {
            const variance = projectedRate - actualRate;
            updatedData[rowIndex][varianceColIndex] = variance.toFixed(2);
          }
        }
      }
    }
  }
  
  setSheetData(updatedData);
  
  // Only activate Reconcile button if non-timesheet columns are changed
  if (!isTimesheetColumn) {
    setHasChanges(true);
    // Track which rows have been changed
    setChangedRowIndices(prev => new Set([...prev, rowIndex]));
  }
};
