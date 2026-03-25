import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import CombinedDashboard from '../dashboard/components/CombinedDashboard';
import BarGraph from '../dashboard/components/BarGraph';
import ResourceFlags from '../dashboard/components/ResourceFlags';
import HomeMarketingChart from '../dashboard/components/HomeMarketingChart';
import MissingClassificationsAlert from '../dashboard/components/MissingClassificationsAlert';
import { loadAndProcessExcelData } from '../dashboard/utils/excelLoader';
import { loadIndividualBurnData } from '../dashboard/utils/individualBurnLoader';
import { loadResourceFlagsData } from '../dashboard/utils/resourceFlagsLoader';
import './App.css';

const PRIORITY_COLUMNS = [
  'ESA ID', 'ESA Description', 'Verizon TQ ID', 'Verizon TQ Description',
  'POC', 'EmpID', 'Employee ID', 'Name', 'Location', 'ACT Code', 'ACT/PCT',
  'PCT Code', 'Skill Set', 'Verizon Level Mapping', 'Classification', 'Key',
  'Cognizant Designation', 'Key Cognizant Designation', 'Service Line'
];

function App({ onLogout }) {
  const [sheetData, setSheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedTower, setSelectedTower] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skillMatrix, setSkillMatrix] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({
    tower: [],
    month: [],
    location: [],
    actCode: [],
    skillSet: [],
    serviceLine: []
  });
  const [expandedSkillCell, setExpandedSkillCell] = useState(null);
  const [tqDataMessage, setTqDataMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [changedRowIndices, setChangedRowIndices] = useState(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const initialChatMessages = [
    { id: 1, text: 'Last updated dollar value is 86. Needs to update please enter the value.', sender: 'bot' }
  ];
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatInput, setChatInput] = useState('');
  const [dollarValue, setDollarValue] = useState(initialChatMessages[0]?.text.match(/\d+(?:\.\d+)?/)?.[0] || '');

  const [selectedCountry, setSelectedCountry] = useState('India');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const chartBarRef = useRef(null);
  const chartPieRef = useRef(null);
  const chartHomeRef = useRef(null);
  const chartMissingRef = useRef(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({ overall: null, individual: null, resourceFlags: null, loading: false, error: null });

  const handleOpenDashboard = useCallback(async () => {
    setShowDashboard(true);
    if (dashboardData.overall) return;
    setDashboardData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [overall, individual, resourceFlags] = await Promise.all([
        loadAndProcessExcelData(),
        loadIndividualBurnData(),
        loadResourceFlagsData()
      ]);
      setDashboardData({ overall, individual, resourceFlags, loading: false, error: null });
    } catch (err) {
      setDashboardData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [dashboardData.overall]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSkillMatrix = useCallback(async () => {
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
        setSkillMatrix(skillMap);
      }
    } catch (error) {
      console.log('Skill matrix not found, skipping auto-categorization');
    }
  }, []);

  const reorderColumns = useCallback((headers, rows) => {
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
  }, []);

  const extractColumnData = useCallback((headers, rows) => {
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
  }, []);

  const processSheet = useCallback((wb) => {
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

    const { headers: reorderedHeaders, rows: reorderedRows } = reorderColumns(allHeaders, allRows);
    setHeaders(reorderedHeaders);
    setSheetData(reorderedRows);

    const options = extractColumnData(reorderedHeaders, reorderedRows);
    setDropdownOptions(options);
    setSelectedTower('All');
    setSelectedMonth('All');

    console.log('✅ Data loaded successfully - Headers:', reorderedHeaders.length, 'Rows:', reorderedRows.length);
  }, [reorderColumns, extractColumnData]);

  const loadExcelFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await loadSkillMatrix();
      
      const response = await fetch('/Combined-Input.xlsx');
      if (!response.ok) throw new Error('Failed to load file');
      
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      processSheet(wb);
    } catch (error) {
      setError('Error loading file: ' + error.message);
      console.error('File loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [loadSkillMatrix, processSheet]);

  useEffect(() => {
    loadExcelFile();
    // Load dashboard data on initial mount
    handleOpenDashboard();
  }, [loadExcelFile, handleOpenDashboard]);

  const isValidEMPID = (value) => /^\d+$/.test(value);

  const handleCellChange = (rowIndex, cellIndex, newValue) => {
    const updatedData = [...sheetData];
    const isSkillSetColumn = headers[cellIndex]?.toLowerCase().includes('skill set');
    const headerLower = headers[cellIndex]?.toLowerCase() || '';
    const isTimesheetColumn = (headerLower.includes('timesheet') || (headerLower.includes('hours') && !headerLower.includes('hourly')));
    
    if (isSkillSetColumn) {
      const currentValue = updatedData[rowIndex][cellIndex] || '';
      const skillValues = currentValue.split(',').map(s => s.trim()).filter(Boolean);
      
      if (newValue && !skillValues.includes(newValue)) {
        skillValues.push(newValue);
        updatedData[rowIndex][cellIndex] = skillValues.join(', ');
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

  const getFilteredData = () => {
    let filtered = sheetData;
    
    // Filter by Country
    const countryIndex = headers.findIndex(h => h.toLowerCase() === 'country');
    if (countryIndex !== -1 && selectedCountry) {
      filtered = filtered.filter(row => {
        const rowCountry = String(row[countryIndex] || '').toLowerCase().trim();
        return rowCountry === selectedCountry.toLowerCase();
      });
    }
    
    if (selectedTower !== 'All') {
      const towerIndex = headers.findIndex(h => h.toLowerCase().includes('tower'));
      if (towerIndex !== -1) {
        filtered = filtered.filter(row => row[towerIndex] === selectedTower);
      }
    }
    
    if (selectedMonth !== 'All') {
      const monthIndex = headers.findIndex(h => h.toLowerCase().includes('month'));
      if (monthIndex !== -1) {
        filtered = filtered.filter(row => row[monthIndex] === selectedMonth);
      }
    }
    
    return filtered;
  };

  const exportToExcel = async () => {

    const filteredData = getFilteredData();



    const ci = (keywords) => headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));



    const idxEsaId       = ci(['esa id']);

    const idxEsaDesc     = ci(['esa description']);

    const idxTqId        = ci(['verizon tq id']);

    const idxTqDesc      = ci(['verizon tq description']);

    const idxPoc         = ci(['poc']);

    const idxEmpId       = ci(['empid', 'employee id']);

    const idxName        = ci(['name']);

    const idxLocation    = ci(['location']);

    const idxActPct      = ci(['act/pct', 'act code', 'pct code']);

    const idxSkillSet    = ci(['skill set']);

    const idxVzLevel     = ci(['verizon level']);

    const idxClass       = ci(['classification']);

    const idxKey         = ci(['key']);

    const idxCogDesig    = ci(['cognizant designation']);

    const idxServiceLine = ci(['service line']);

    const idxTimesheet   = ci(['timesheet']);

    const idxHrRs        = ci(['hourly rate(rs)', 'hourly rate (rs)']);

    const idxHrUsd       = ci(['hourly rate($)', 'hourly rate ($)']);

    const idxProjected   = ci(['projected rate']);

    const idxActualRate  = ci(['actual rate', 'actual']);

    const idxVariance    = ci(['variance']);

    const idxJan         = ci(['jan-26', 'jan']);

    const idxFeb         = ci(['feb-26', 'feb']);

    const idxMar         = ci(['mar-26', 'mar']);



    const get = (row, idx) => (idx !== -1 && row[idx] != null ? row[idx] : '');



    const DATA_HEADERS = [

      'EmpID', 'Name', 'Location', 'ACT/PCT', 'Skill Set',

      'Verizon Level Mapping', 'Classification', 'Key',

      'Cognizant Designation', 'Service Line', 'Timesheet',

      'Hourly Rate(Rs)', 'Hourly Rate($)', 'Projected Rate($)',

      'Actual Rate', 'Variance', 'Jan-26', 'Feb-26', 'Mar-26'

    ];



    const SKY_BLUE = { patternType: 'solid', fgColor: { rgb: '87CEEB' } };



    const BORDER = {

      top:    { style: 'thin', color: { rgb: '000000' } },

      bottom: { style: 'thin', color: { rgb: '000000' } },

      left:   { style: 'thin', color: { rgb: '000000' } },

      right:  { style: 'thin', color: { rgb: '000000' } },

    };



    // Group rows by POC

    const pocMap = new Map();

    filteredData.forEach(row => {

      const poc = get(row, idxPoc) || 'Unknown';

      if (!pocMap.has(poc)) pocMap.set(poc, []);

      pocMap.get(poc).push(row);

    });



    const wb = XLSXStyle.utils.book_new();



    // --- Legend sheet (first tab) ---

    try {

      const csvText = await fetch('/legend.csv').then(r => r.text());

      const legendRows = csvText.trim().split('\n').map(line => {

        // Handle quoted fields with commas

        const cols = [];

        let cur = '', inQuote = false;

        for (let i = 0; i < line.length; i++) {

          const ch = line[i];

          if (ch === '"') { inQuote = !inQuote; }

          else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }

          else { cur += ch; }

        }

        cols.push(cur.trim());

        return cols;

      });



      const legendWs = XLSXStyle.utils.aoa_to_sheet(legendRows);



      // Autofit legend columns

      const legendHeaders = legendRows[0] || [];

      legendWs['!cols'] = legendHeaders.map((_, colIdx) => {

        const maxLen = legendRows.reduce((max, row) =>

          Math.max(max, row[colIdx] ? String(row[colIdx]).length : 0), 0);

        return { wch: Math.min(maxLen + 2, 60) };

      });



      // Autofit legend row heights

      legendWs['!rows'] = legendRows.map((row) => {

        const maxLen = row.reduce((max, cell) => Math.max(max, cell ? String(cell).length : 0), 0);

        return { hpt: Math.min(Math.ceil(maxLen / 40) * 15, 60) };

      });



      // Black fill + white bold font + border on header row

      legendHeaders.forEach((_, c) => {

        const addr = XLSXStyle.utils.encode_cell({ r: 0, c });

        if (legendWs[addr]) legendWs[addr].s = {

          fill: { patternType: 'solid', fgColor: { rgb: '000000' } },

          font: { bold: true, color: { rgb: 'FFFFFF' } },

          border: BORDER

        };

      });



      // Apply borders to all data rows in legend sheet

      for (let r = 1; r < legendRows.length; r++) {

        for (let c = 0; c < legendHeaders.length; c++) {

          const addr = XLSXStyle.utils.encode_cell({ r, c });

          if (!legendWs[addr]) legendWs[addr] = { t: 's', v: '' };

          legendWs[addr].s = { border: BORDER };

        }

      }



      XLSXStyle.utils.book_append_sheet(wb, legendWs, 'Legend');

    } catch (e) {

      console.warn('Legend CSV could not be loaded:', e.message);

    }

    // --- End Legend sheet ---



    pocMap.forEach((rows, poc) => {

      const esaId   = get(rows[0], idxEsaId);

      const esaDesc = get(rows[0], idxEsaDesc);

      const tqId    = get(rows[0], idxTqId);

      const tqDesc  = get(rows[0], idxTqDesc);



      const dataRows = rows.map(row => [

        get(row, idxEmpId),       get(row, idxName),        get(row, idxLocation),

        get(row, idxActPct),      get(row, idxSkillSet),    get(row, idxVzLevel),

        get(row, idxClass),       get(row, idxKey),         get(row, idxCogDesig),

        get(row, idxServiceLine), get(row, idxTimesheet),   get(row, idxHrRs),

        get(row, idxHrUsd),       get(row, idxProjected),   get(row, idxActualRate),

        get(row, idxVariance),    get(row, idxJan),         get(row, idxFeb),

        get(row, idxMar),

      ]);



      const sheetRows = [

        ['ESA ID',                 esaId],

        ['ESA Description',        esaDesc],

        ['Verizon TQ ID',          tqId],

        ['Verizon TQ Description', tqDesc],

        ['POC',                    poc],

        [], [],

        DATA_HEADERS,

        ...dataRows

      ];



      const ws = XLSXStyle.utils.aoa_to_sheet(sheetRows);

      const totalRows = sheetRows.length;

      const totalCols = DATA_HEADERS.length;



      // Meta rows 0-4: col A = sky blue + bold + border, col B = no fill + border only

      for (let r = 0; r < 5; r++) {

        const labelAddr = XLSXStyle.utils.encode_cell({ r, c: 0 });

        if (!ws[labelAddr]) ws[labelAddr] = { t: 's', v: '' };

        ws[labelAddr].s = { fill: SKY_BLUE, font: { bold: true }, border: BORDER };



        const valueAddr = XLSXStyle.utils.encode_cell({ r, c: 1 });

        if (!ws[valueAddr]) ws[valueAddr] = { t: 's', v: '' };

        ws[valueAddr].s = { border: BORDER };

      }



      // Borders + sky blue on data header row (row 7), borders only on data rows (row 8+)

      for (let r = 7; r < totalRows; r++) {

        for (let c = 0; c < totalCols; c++) {

          const cellAddr = XLSXStyle.utils.encode_cell({ r, c });

          if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: '' };

          ws[cellAddr].s = r === 7

            ? { fill: SKY_BLUE, font: { bold: true }, border: BORDER, alignment: { horizontal: 'center', wrapText: true } }

            : { border: BORDER, alignment: { wrapText: true } };

        }

      }



      // Autofit column widths — col 0 & 1 from meta rows, rest from data headers/rows

      const metaLabelMaxLen = ['ESA ID', 'ESA Description', 'Verizon TQ ID', 'Verizon TQ Description', 'POC']

        .reduce((max, s) => Math.max(max, s.length), 0);

      const metaValueMaxLen = [esaId, esaDesc, tqId, tqDesc, poc]

        .reduce((max, s) => Math.max(max, s ? String(s).length : 0), 0);



      ws['!cols'] = [

        { wch: metaLabelMaxLen + 2 },

        { wch: Math.min(metaValueMaxLen + 2, 50) },

        ...DATA_HEADERS.slice(2).map((header, i) => {

          const colIdx = i + 2;

          const maxLen = dataRows.reduce((max, row) => Math.max(max, row[colIdx] ? String(row[colIdx]).length : 0), header.length);

          return { wch: Math.min(maxLen + 2, 50) };

        })

      ];



      // Also set data column widths starting from col 0 based on DATA_HEADERS

      const dataColWidths = DATA_HEADERS.map((header, colIdx) => {

        const maxLen = dataRows.reduce((max, row) => Math.max(max, row[colIdx] ? String(row[colIdx]).length : 0), header.length);

        return { wch: Math.min(maxLen + 2, 50) };

      });

      // Merge: col 0 = max of meta label vs data col 0, col 1 = max of meta value vs data col 1

      dataColWidths[0] = { wch: Math.max(dataColWidths[0].wch, metaLabelMaxLen + 2) };

      dataColWidths[1] = { wch: Math.max(dataColWidths[1].wch, Math.min(metaValueMaxLen + 2, 50)) };

      ws['!cols'] = dataColWidths;



      // Autofit row heights

      ws['!rows'] = sheetRows.map((_, rIdx) => {

        if (rIdx < 7) return { hpt: 18 };

        const maxLines = DATA_HEADERS.reduce((max, _, cIdx) => {

          const val = sheetRows[rIdx][cIdx] ? String(sheetRows[rIdx][cIdx]) : '';

          return Math.max(max, Math.ceil(val.length / 30) || 1);

        }, 1);

        return { hpt: Math.min(maxLines * 15, 60) };

      });



      const safeName = poc.replace(/[\\/:*?[\]]/g, '').substring(0, 31);

      XLSXStyle.utils.book_append_sheet(wb, ws, safeName || 'Sheet');

    });



    XLSXStyle.writeFile(wb, 'burnsheet-export.xlsx');

  };

  const exportToPDF = async () => {
    setPdfLoading(true);
    try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    const usableWidth = pageWidth - margin * 2;

    const addPageHeader = (title, subtitle) => {
      doc.setFillColor(220, 0, 0); doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(title, margin, 26);
      if (subtitle) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(subtitle, pageWidth - margin, 26, { align: 'right' }); }
      doc.setTextColor(0, 0, 0);
    };

    if (!dashboardData.overall) {
      setDashboardData(prev => ({ ...prev, loading: true }));
      try {
        const [overall, individual, resourceFlags] = await Promise.all([loadAndProcessExcelData(), loadIndividualBurnData(), loadResourceFlagsData()]);
        setDashboardData({ overall, individual, resourceFlags, loading: false, error: null });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) { console.error('Failed to load dashboard data for PDF:', err); }
    } else { await new Promise(r => setTimeout(r, 800)); }

    let firstChart = true;
    const captureChart = async (ref, title, subtitle) => {
      if (!ref.current) return;
      await new Promise(r => setTimeout(r, 800));
      const canvas = await html2canvas(ref.current, {
        scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
        width: ref.current.scrollWidth, height: ref.current.scrollHeight,
        scrollX: -99999, scrollY: -99999,
        windowWidth: ref.current.scrollWidth, windowHeight: ref.current.scrollHeight, x: 0, y: 0,
      });
      if (!firstChart) doc.addPage();
      firstChart = false;
      addPageHeader(title, subtitle);
      const imgW = usableWidth;
      const imgH = (canvas.height / canvas.width) * imgW;
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, 50, imgW, Math.min(imgH, pageHeight - 50 - margin));
    };

    await captureChart(chartBarRef, 'Monthly Burn Comparison', 'Baseline Rate vs Monthly Burn Rate');
    await captureChart(chartPieRef, 'Classification Distribution', 'Resource Flags');
    await captureChart(chartHomeRef, 'H & M Tower Performance', 'Monthly Average Rate by Country');
    await captureChart(chartMissingRef, 'Missing Classifications', 'Employees pending classification');

    const countryIndex = headers.findIndex(h => h.toLowerCase() === 'country');
    const indiaRows = sheetData.filter(row => row[countryIndex]?.toLowerCase() === 'india');
    const usaRows = sheetData.filter(row => row[countryIndex]?.toLowerCase() === 'usa');
    const colWidths = headers.map((header, colIdx) => {
      const maxLen = sheetData.reduce((max, row) => Math.max(max, String(row[colIdx] || '').length), header.length);
      return Math.min(Math.max(maxLen * 5.5, 40), 160);
    });
    const scale = usableWidth / colWidths.reduce((a, b) => a + b, 0);
    const scaledWidths = colWidths.map(w => w * scale);

    const addDataTable = (label, rows) => {
      doc.addPage(); addPageHeader('Verizon Home & Marketing Burnsheet', label);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`Records: ${rows.length}   |   Tower: ${selectedTower}   |   Month: ${selectedMonth}   |   $ Value: ${dollarValue}`, margin, 52);
      doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        head: [headers], body: rows, startY: 60,
        styles: { fontSize: 6, cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }, overflow: 'ellipsize', halign: 'left', valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.3 },
        headStyles: { fillColor: [220, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: Object.fromEntries(scaledWidths.map((w, idx) => [idx, { cellWidth: w }])),
        margin: { left: margin, right: margin }, tableWidth: usableWidth,
      });
    };

    addDataTable('India', indiaRows);
    addDataTable('USA', usaRows);
    doc.save(`burnsheet-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const saveToExcel = async () => {
    try {
      // Create workbook with all data (including filtered data)
      const exportData = [headers, ...sheetData];
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Combined Data');
      
      // Write to file - for now, we'll trigger a download
      XLSX.writeFile(wb, 'Combined-Input-Updated.xlsx');
      
      // Show success message
      alert('✅ Data saved successfully!\nFile: Combined-Input-Updated.xlsx');
      console.log('Data saved to Combined-Input-Updated.xlsx');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('❌ Error saving file: ' + error.message);
    }
  };

    const handleReconciliation = () => {
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
    setChangedRowIndices(new Set()); // Clear the changed rows after reconciliation
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: chatInput,
        sender: 'user'
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');

      // Simulate bot response
      setTimeout(() => {
        const botResponse = {
          id: 0, // Will be set by the updater function
          text: 'Thanks for your message! How can I assist you with the burnsheet?',
          sender: 'bot'
        };
        setChatMessages(prev => {
          botResponse.id = Math.max(...prev.map(m => m.id), 0) + 1;
          return [...prev, botResponse];
        });
      }, 500);
    }
  };

  const renderCell = (row, cellIndex, rowIndex, headerName) => {
    const cell = row[cellIndex] || '';
    const isEmpty = !cell.trim();
    const headerLower = headerName.toLowerCase().trim();
    
    const isEMPIDColumn = headerLower.includes('empid');
    const isInvalidEMPID = isEMPIDColumn && cell && !isValidEMPID(cell);
    const alignmentClass = 'left-align';

    // Location dropdown
    if (headerLower.includes('location')) {
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName}>
          <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
            <option value="">{isEmpty ? '-- Select --' : cell}</option>
            {dropdownOptions.location.map((loc, idx) => <option key={`${loc}-${idx}`} value={loc}>{loc}</option>)}
          </select>
        </td>
      );
    }
    
    // ACT/PCT Code dropdown
    if (headerLower.includes('act code') || headerLower.includes('pct code') || headerLower.includes('act/pct')) {
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName} title={cell ? `ACT Code: ${cell}` : 'Select ACT/PCT Code'}>
          <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
            <option value="">{isEmpty ? '-- Select --' : cell}</option>
            {dropdownOptions.actCode.map((code, idx) => <option key={`${code}-${idx}`} value={code}>{code}</option>)}
          </select>
        </td>
      );
    }
    
    // Skill Set with tags
    if (headerLower.includes('skill set')) {
      const cellKey = `${rowIndex}-${cellIndex}`;
      const isExpanded = expandedSkillCell === cellKey;
      
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell skill-set-cell ${alignmentClass}`} data-column={headerName}>
          <div className="skill-set-display">
            <div className="skill-set-values">
              {cell ? (
                <>
                  {cell.split(',').map((skill, idx) => <span key={`skill-${idx}-${skill.trim()}`} className="skill-tag">{skill.trim()}</span>)}
                  <span className="skill-toggle-plus" onClick={() => setExpandedSkillCell(isExpanded ? null : cellKey)} title="Click to add more skills">
                    {isExpanded ? '−' : '+'}
                  </span>
                </>
              ) : (
                <>
                  <span className="placeholder">No skills selected</span>
                  <span className="skill-toggle-plus" onClick={() => setExpandedSkillCell(isExpanded ? null : cellKey)} title="Click to add skills">
                    {isExpanded ? '−' : '+'}
                  </span>
                </>
              )}
            </div>
            {isExpanded && (
              <select autoFocus onChange={(e) => { if (e.target.value) { handleCellChange(rowIndex, cellIndex, e.target.value); setExpandedSkillCell(null); }}} 
                      className="cell-dropdown skill-dropdown" defaultValue="" onBlur={() => setExpandedSkillCell(null)}>
                <option value="">-- Select Skill --</option>
                {dropdownOptions.skillSet.map((skill, idx) => <option key={`${skill}-${idx}`} value={skill}>{skill}</option>)}
              </select>
            )}
          </div>
        </td>
      );
    }
    
    // Service Line dropdown
    if (headerLower.includes('service line')) {
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${alignmentClass}`} data-column={headerName}>
          <select value={cell} onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)} className="cell-dropdown">
            <option value="">{isEmpty ? '-- Select --' : cell}</option>
            {dropdownOptions.serviceLine.map((line, idx) => <option key={`${line}-${idx}`} value={line}>{line}</option>)}
          </select>
        </td>
      );
    }

    // Timesheet/Hours - make editable with input field
    if (headerLower.includes('timesheet') || (headerLower.includes('hours') && !headerLower.includes('hourly'))) {
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${alignmentClass}`} data-column={headerName}>
          <input
            type="number"
            step="0.01"
            value={cell}
            onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
            className="timesheet-input"
            placeholder="Enter hours"
            title="Enter timesheet hours"
          />
        </td>
      );
    }
    if ((headerLower.includes('hourly rate') && headerLower.includes('$')) || (headerLower.includes('monthly rate') && headerLower.includes('$')) ) {
      return (
        <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${alignmentClass}`} data-column={headerName}>
          {isEmpty ? '' : `$ ${cell}`}
        </td>
      );
    }

    // Regular cell
    return (
      <td key={`cell-${rowIndex}-${cellIndex}`} className={`data-cell ${isEmpty ? 'missing-field' : ''} ${isInvalidEMPID ? 'invalid-empid' : ''} ${alignmentClass}`} data-column={headerName}>
        {cell}
      </td>
    );
  };

  return (
    <div className="excel-viewer">
      <div className="file-selection-section">
        <div className="header-top">
          <div className="header-left"></div>
          <h1>{showDashboard ? 'Verizon Home & Marketing Dashboard' : 'Verizon Home & Marketing Burnsheet'}</h1>
          <div className="header-right">
            <div className="profile-menu" ref={profileRef}>
              <span className="welcome-text">Welcome, Admin 👋</span>
              <button className="profile-btn" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <span className="profile-icon">👤</span>
                <span className="profile-arrow">{isProfileOpen ? '▲' : '▼'}</span>
              </button>
              {isProfileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-item" onClick={() => { alert('My Profile'); setIsProfileOpen(false); }}>👤 My Profile</div>
                  <div className="profile-dropdown-item logout-item" onClick={() => { setIsProfileOpen(false); onLogout(); }}>🚪 Logout</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {loading && <div className="loading-message">⏳ Loading Burnsheet Data...</div>}
        {error && <div className="error-message">❌ {error}</div>}
        {tqDataMessage && <div className="info-message">ℹ️ {tqDataMessage}</div>}
      </div>

      {headers.length > 0 && (
        <>
          {!showDashboard && (
            <>
              <div className="country-tabs">
                {['India', 'USA'].map(country => (
                  <div
                    key={country}
                    className={`country-tab ${selectedCountry === country ? 'active' : ''}`}
                    onClick={() => setSelectedCountry(country)}
                  >
                    {country}
                  </div>
                ))}
              </div>
              <div className="filter-export-bar">
                <div className="filter-section">
                  {dropdownOptions.tower.length > 0 && (
                    <div className="filter-group">
                      <label htmlFor="tower-select">Filter by Tower:</label>
                      <select id="tower-select" value={selectedTower} onChange={(e) => setSelectedTower(e.target.value)} className="filter-dropdown">
                        {dropdownOptions.tower.map((tower, idx) => <option key={`tower-${idx}`} value={tower}>{tower}</option>)}
                      </select>
                    </div>
                  )}

                  {dropdownOptions.month.length > 0 && (
                    <div className="filter-group">
                      <label htmlFor="month-select">Filter by Month:</label>
                      <select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="filter-dropdown">
                        {dropdownOptions.month.map((month, idx) => <option key={`month-${idx}`} value={month}>{month}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Dollar Value Editable Text Box - only show for India */}
                {selectedCountry === 'India' && (
                  <div className="dollar-value-box">
                    <label htmlFor="dollar-value-input">$ Value:</label>
                    <input
                      id="dollar-value-input"
                      type="number"
                      step="0.01"
                      value={dollarValue}
                      onChange={e => {
                        const newValue = e.target.value;
                        setDollarValue(newValue);
                        setChatMessages(prev => {
                          const updated = [...prev];
                          if (updated[0]) {
                            updated[0].text = `Last updated dollar value is ${newValue}. Needs to update please enter the value.`;
                          }
                          return updated;
                        });
                      }}
                    />
                  </div>
                )}

                <div className="export-section">
                  {!showDashboard && (
                    <>
                      <button 
                        className={`export-btn reconcile-btn ${!hasChanges ? 'disabled' : 'active'}`}
                        onClick={handleReconciliation}
                        disabled={!hasChanges}
                        title={hasChanges ? "Reconcile and validate the data" : "Make changes to enable reconciliation"}
                      >
                        🔄 Reconcile
                      </button>
                      <button className="export-btn save-btn" onClick={saveToExcel} title="Save all changes to Excel file">💾 Save</button>
                      <button className="export-btn excel-btn" onClick={exportToExcel} title="Export filtered data as Excel">📊 Export</button>
                      <button className="export-btn pdf-btn" onClick={exportToPDF} title="Export as PDF Summary">📄 PDF</button>
                      <button className="export-btn dashboard-btn" onClick={handleOpenDashboard} title="View Dashboard">📈 Dashboard</button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {showDashboard ? (
            // Dashboard View
            <div style={{ background: '#f0f2f5', minHeight: '70vh', overflowY: 'auto' }}>
              {dashboardData.loading && <div style={{ textAlign: 'center', padding: 60, fontSize: 20 }}>⏳ Loading Dashboard...</div>}
              {dashboardData.error && <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>❌ {dashboardData.error}</div>}
              {dashboardData.overall && dashboardData.individual && dashboardData.resourceFlags && (
                <CombinedDashboard
                  overallData={dashboardData.overall}
                  individualData={dashboardData.individual}
                  resourceFlagsData={dashboardData.resourceFlags}
                  onNavigateBack={() => setShowDashboard(false)}
                />
              )}
            </div>
          ) : (
            // Table View
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
                          return renderCell(paddedRow, cellIndex, rowIndex, headers[cellIndex] || '');
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {pdfLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, border: '6px solid rgba(255,255,255,0.3)', borderTop: '6px solid #fff', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>Generating PDF...</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Please wait while charts are being captured</p>
        </div>
      )}

      {/* Chat Icon Button */}
      <button 
        className="chat-icon-btn"
        onClick={() => setIsChatOpen(!isChatOpen)}
        title={isChatOpen ? "Close chat" : "Open chat support"}
      >
        {isChatOpen ? (
          <span className="chat-icon-close">✕</span>
        ) : (
          <img src="/logo.png" alt="Chat" className="chat-icon-image" />
        )}
      </button>

      {/* Chat Modal Window */}
      {isChatOpen && (
        <div className="chat-modal">
          <div className="chat-modal-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">{msg.text}</div>
              </div>
            ))}
          </div>
          
          <div className="chat-modal-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message here..."
              className="chat-modal-input"
              autoFocus
            />
            <button onClick={handleSendMessage} className="chat-modal-send-btn" title="Send message">
              ➤
            </button>
          </div>
        </div>
      )}

      {dashboardData.overall && dashboardData.individual && dashboardData.resourceFlags && (
        <>
          <div ref={chartBarRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
            <BarGraph data={dashboardData.overall} />
          </div>
          <div ref={chartPieRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
            <ResourceFlags data={dashboardData.resourceFlags} />
          </div>
          <div ref={chartHomeRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
            <HomeMarketingChart />
          </div>
          <div ref={chartMissingRef} style={{ position: 'fixed', left: '-99999px', top: '-99999px', width: '1200px', background: '#fff', visibility: 'visible', pointerEvents: 'none', padding: '20px' }}>
            <MissingClassificationsAlert data={dashboardData.missingClassifications} />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
