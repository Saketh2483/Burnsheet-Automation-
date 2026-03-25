import * as XLSX from 'xlsx';

const PRIORITY_COLUMNS = [
  'ESA ID', 'ESA Description', 'Verizon TQ ID', 'Verizon TQ Description',
  'POC', 'EmpID', 'Employee ID', 'Name', 'Location', 'ACT Code', 'ACT/PCT',
  'PCT Code', 'Skill Set', 'Verizon Level Mapping', 'Classification', 'Key',
  'Cognizant Designation', 'Key Cognizant Designation', 'Service Line'
];

export const reorderColumns = (headers, rows) => {
  const priorityIndices = [];
  const remainingIndices = [];
  
  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase().trim();
    const matchedIndex = PRIORITY_COLUMNS.findIndex(col => {
      const colLower = col.toLowerCase();
      return colLower === headerLower || 
             headerLower.includes(colLower.replace(/\s+/g, '')) ||
             colLower.includes(headerLower.replace(/\s+/g, ''));
    });
    
    if (matchedIndex !== -1) {
      priorityIndices.push({ originalIndex: index, priority: matchedIndex });
    } else {
      remainingIndices.push(index);
    }
  });
  
  priorityIndices.sort((a, b) => a.priority - b.priority);
  const newOrder = [...priorityIndices.map(p => p.originalIndex), ...remainingIndices];
  
  const reorderedHeaders = newOrder.map(i => headers[i]);
  const reorderedRows = rows.map(row => 
    newOrder.map(oldIndex => row[oldIndex] ?? '')
  );
  
  return { headers: reorderedHeaders, rows: reorderedRows };
};

export const extractColumnData = (headers, rows, setTqDataMessage) => {
  const findColumnIndex = (keywords) => 
    headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k)));

  const indices = {
    tower: findColumnIndex(['tower']),
    month: findColumnIndex(['month']),
    location: findColumnIndex(['location']),
    actCode: findColumnIndex(['act code', 'pct code', 'act/pct']),
    skillSet: findColumnIndex(['skill set']),
    serviceLine: findColumnIndex(['service line']),
    tqId: findColumnIndex(['verizon tq id']),
    tqDesc: findColumnIndex(['verizon tq description'])
  };

  const options = {
    tower: new Set(['All']),
    month: new Set(['All']),
    location: new Set(),
    actCode: new Set(),
    skillSet: new Set(),
    serviceLine: new Set()
  };

  rows.forEach(row => {
    if (indices.tower >= 0 && row[indices.tower]) options.tower.add(row[indices.tower]);
    if (indices.month >= 0 && row[indices.month]) options.month.add(row[indices.month]);
    if (indices.location >= 0 && row[indices.location]) options.location.add(row[indices.location]);
    if (indices.actCode >= 0 && row[indices.actCode]) options.actCode.add(row[indices.actCode]);
    if (indices.skillSet >= 0 && row[indices.skillSet]) options.skillSet.add(row[indices.skillSet]);
    if (indices.serviceLine >= 0 && row[indices.serviceLine]) options.serviceLine.add(row[indices.serviceLine]);
  });

  // Check TQ data
  if (indices.tqId !== -1 || indices.tqDesc !== -1) {
    const hasTqData = rows.some(row => 
      (indices.tqId !== -1 && row[indices.tqId]?.toString().trim()) ||
      (indices.tqDesc !== -1 && row[indices.tqDesc]?.toString().trim())
    );
    setTqDataMessage(hasTqData ? null : 'No data found in "Verizon TQ ID" or "Verizon TQ Description" columns.');
  }

  return {
    tower: Array.from(options.tower).sort(),
    month: Array.from(options.month),
    location: Array.from(options.location).sort(),
    actCode: Array.from(options.actCode).sort(),
    skillSet: Array.from(options.skillSet).sort(),
    serviceLine: Array.from(options.serviceLine).sort()
  };
};

export const processSheet = (wb, reorderColumnsFn, extractColumnDataFn, setHeaders, setSheetData, setDropdownOptions) => {
  if (!wb) return;

  let allHeaders = [];
  let allRows = [];

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_row_object_array(ws, { header: 1, defval: '' });
    
    if (!data?.length) return;

    const sheetHeaders = data[0];
    if (!sheetHeaders?.length) return;

    // Find first non-empty column as start
    let startCol = sheetHeaders.findIndex(h => h?.toString().trim());
    if (startCol === -1) return;

    // Find last non-empty column as end
    let endCol = sheetHeaders.length - 1;
    for (let i = sheetHeaders.length - 1; i >= 0; i--) {
      if (sheetHeaders[i]?.toString().trim()) {
        endCol = i;
        break;
      }
    }

    if (allHeaders.length === 0) {
      allHeaders = sheetHeaders.slice(startCol, endCol + 1).map(h => h?.toString().trim() || '');
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row?.length) continue;

      const rowData = row.slice(startCol, endCol + 1);
      
      // Check for summary rows
      const firstNonEmpty = rowData.find(cell => cell?.toString().trim())?.toString().toLowerCase().trim() || '';
      if (firstNonEmpty.includes('total') || firstNonEmpty.includes('loe value') || 
          firstNonEmpty.includes('upt value') || firstNonEmpty.includes('grand total')) break;

      if (!rowData.some(cell => cell?.toString().trim())) continue;

      allRows.push(rowData.map(cell => cell?.toString().trim() || ''));
    }
  });

  if (!allHeaders.length || !allRows.length) {
    console.warn('No valid data found in workbook');
    return;
  }

  const { headers: reorderedHeaders, rows: reorderedRows } = reorderColumnsFn(allHeaders, allRows);
  setHeaders(reorderedHeaders);
  setSheetData(reorderedRows);

  const options = extractColumnDataFn(reorderedHeaders, reorderedRows);
  setDropdownOptions(options);

  console.log('✅ Data loaded successfully - Headers:', reorderedHeaders.length, 'Rows:', reorderedRows.length);
};

export const loadSkillMatrix = async () => {
  try {
    const response = await fetch('/skill-matrix.xlsx');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      
      const skillMap = {};
      data.forEach(row => {
        if (row['Skill Set'] && row['Classification']) {
          skillMap[row['Skill Set'].toString().toLowerCase()] = row['Classification'];
        }
      });
      return skillMap;
    }
  } catch (error) {
    console.log('Skill matrix not found, skipping auto-categorization');
  }
  return {};
};

export const loadExcelFile = async (loadSkillMatrixFn, processSheetFn, setLoading, setError) => {
  try {
    setLoading(true);
    setError(null);
    
    await loadSkillMatrixFn();
    
    const response = await fetch('/Combined-Input.xlsx');
    if (!response.ok) throw new Error('Failed to load file');
    
    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    
    processSheetFn(wb);
  } catch (error) {
    setError('Error loading file: ' + error.message);
    console.error('File loading error:', error);
  } finally {
    setLoading(false);
  }
};
