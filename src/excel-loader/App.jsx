import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CombinedDashboard from '../dashboard/components/CombinedDashboard';
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
    { id: 1, text: 'Last updated dollar value is 83.49. Needs to update please enter the value.', sender: 'bot' }
  ];
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatInput, setChatInput] = useState('');
  const [dollarValue, setDollarValue] = useState(initialChatMessages[0]?.text.match(/\d+\.\d+/)?.[0] || '');

  const [selectedCountry, setSelectedCountry] = useState('India');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState({ overall: null, individual: null, resourceFlags: null, loading: false, error: null });

  const handleOpenDashboard = async () => {
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
  };

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
  }, [loadExcelFile]);

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

  const exportToExcel = () => {
    const exportData = [headers, ...getFilteredData()];
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Burnsheet Export');
    XLSX.writeFile(wb, 'burnsheet-export.xlsx');
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 30;
    const usableWidth = pageWidth - margin * 2;
    const countryIndex = headers.findIndex(h => h.toLowerCase() === 'country');

    const indiaRows = sheetData.filter(row => row[countryIndex]?.toLowerCase() === 'india');
    const usaRows = sheetData.filter(row => row[countryIndex]?.toLowerCase() === 'usa');
    const sections = [
      { label: 'India', rows: indiaRows },
      { label: 'USA', rows: usaRows }
    ];

    const colWidths = headers.map((header, colIdx) => {
      const maxLen = sheetData.reduce((max, row) => Math.max(max, String(row[colIdx] || '').length), header.length);
      return Math.min(Math.max(maxLen * 5.5, 40), 160);
    });
    const scale = usableWidth / colWidths.reduce((a, b) => a + b, 0);
    const scaledWidths = colWidths.map(w => w * scale);

    sections.forEach(({ label, rows }, i) => {
      if (i > 0) doc.addPage();
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Verizon Home & Marketing Burnsheet', margin, 30);
      doc.setFontSize(12);
      doc.text(label, pageWidth - margin, 30, { align: 'right' });
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`Tower: ${selectedTower}   |   Month: ${selectedMonth}   |   Records: ${rows.length}   |   $ Value: ${dollarValue}`, margin, 46);
      autoTable(doc, {
        head: [headers], body: rows, startY: 56,
        styles: { fontSize: 6.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, overflow: 'ellipsize', halign: 'left', valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.3 },
        headStyles: { fillColor: [220, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: Object.fromEntries(scaledWidths.map((w, idx) => [idx, { cellWidth: w }])),
        margin: { left: margin, right: margin }, tableWidth: usableWidth,
      });
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`burnsheet-${timestamp}.pdf`);
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
          <h1>Verizon Home & Marketing Burnsheet</h1>
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

            {/* Dollar Value Editable Text Box - moved between Filter by Month and Reconcile button */}
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

            <div className="export-section">
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
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {headers.map((header, index) => <th key={`header-${index}`} data-column={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {getFilteredData().map((row, rowIndex) => {
                  const paddedRow = [...row];
                  while (paddedRow.length < headers.length) paddedRow.push('');
                  
                  return (
                    <tr key={`row-${rowIndex}`}>
                      {paddedRow.map((_, cellIndex) => renderCell(paddedRow, cellIndex, rowIndex, headers[cellIndex] || ''))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dashboard Overlay */}
      {showDashboard && (
        <div style={{ position: 'fixed', inset: 0, background: '#f0f2f5', zIndex: 2000, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <h2 style={{ color: 'white', margin: 0 }}>📈 Rate Analysis Dashboard</h2>
            <button onClick={() => setShowDashboard(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 20, borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>✕ Back</button>
          </div>
          {dashboardData.loading && <div style={{ textAlign: 'center', padding: 60, fontSize: 20 }}>⏳ Loading Dashboard...</div>}
          {dashboardData.error && <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>❌ {dashboardData.error}</div>}
          {dashboardData.overall && dashboardData.individual && dashboardData.resourceFlags && (
            <CombinedDashboard
              overallData={dashboardData.overall}
              individualData={dashboardData.individual}
              resourceFlagsData={dashboardData.resourceFlags}
            />
          )}
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
    </div>
  );
}

export default App;
