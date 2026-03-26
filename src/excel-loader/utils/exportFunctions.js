import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const SKY_BLUE = { patternType: 'solid', fgColor: { rgb: '87CEEB' } };
const BORDER = {
  top:    { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left:   { style: 'thin', color: { rgb: '000000' } },
  right:  { style: 'thin', color: { rgb: '000000' } },
};

const DATA_HEADERS = [
  'EmpID', 'Name', 'Location', 'ACT/PCT', 'Skill Set',
  'Verizon Level Mapping', 'Classification', 'Key',
  'Cognizant Designation', 'Service Line', 'Timesheet',
  'Hourly Rate(Rs)', 'Hourly Rate($)', 'Projected Rate($)',
  'Actual Rate', 'Variance', 'Jan-26', 'Feb-26', 'Mar-26'
];

const ci = (keywords, headers) => headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
const get = (row, idx) => (idx !== -1 && row[idx] != null ? row[idx] : '');

export const exportToExcel = async (sheetData, headers, getFilteredData, selectedCountry, selectedTower, selectedMonth) => {
  const filteredData = getFilteredData();

  const idxEsaId       = ci(['esa id'], headers);
  const idxEsaDesc     = ci(['esa description'], headers);
  const idxTqId        = ci(['verizon tq id'], headers);
  const idxTqDesc      = ci(['verizon tq description'], headers);
  const idxPoc         = ci(['poc'], headers);
  const idxEmpId       = ci(['empid', 'employee id'], headers);
  const idxName        = ci(['name'], headers);
  const idxLocation    = ci(['location'], headers);
  const idxActPct      = ci(['act/pct', 'act code', 'pct code'], headers);
  const idxSkillSet    = ci(['skill set'], headers);
  const idxVzLevel     = ci(['verizon level'], headers);
  const idxClass       = ci(['classification'], headers);
  const idxKey         = ci(['key'], headers);
  const idxCogDesig    = ci(['cognizant designation'], headers);
  const idxServiceLine = ci(['service line'], headers);
  const idxTimesheet   = ci(['timesheet'], headers);
  const idxHrRs        = ci(['hourly rate(rs)', 'hourly rate (rs)'], headers);
  const idxHrUsd       = ci(['hourly rate($)', 'hourly rate ($)'], headers);
  const idxProjected   = ci(['projected rate'], headers);
  const idxActualRate  = ci(['actual rate', 'actual'], headers);
  const idxVariance    = ci(['variance'], headers);
  const idxJan         = ci(['jan-26', 'jan'], headers);
  const idxFeb         = ci(['feb-26', 'feb'], headers);
  const idxMar         = ci(['mar-26', 'mar'], headers);

  const pocMap = new Map();
  filteredData.forEach(row => {
    const poc = get(row, idxPoc) || 'Unknown';
    if (!pocMap.has(poc)) pocMap.set(poc, []);
    pocMap.get(poc).push(row);
  });

  const wb = XLSXStyle.utils.book_new();

  try {
    const csvText = await fetch('/legend.csv').then(r => r.text());
    const legendRows = csvText.trim().split('\n').map(line => {
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
    const legendHeaders = legendRows[0] || [];
    legendWs['!cols'] = legendHeaders.map((_, colIdx) => {
      const maxLen = legendRows.reduce((max, row) =>
        Math.max(max, row[colIdx] ? String(row[colIdx]).length : 0), 0);
      return { wch: Math.min(maxLen + 2, 60) };
    });
    legendWs['!rows'] = legendRows.map((row) => {
      const maxLen = row.reduce((max, cell) => Math.max(max, cell ? String(cell).length : 0), 0);
      return { hpt: Math.min(Math.ceil(maxLen / 40) * 15, 60) };
    });
    legendHeaders.forEach((_, c) => {
      const addr = XLSXStyle.utils.encode_cell({ r: 0, c });
      if (legendWs[addr]) legendWs[addr].s = {
        fill: { patternType: 'solid', fgColor: { rgb: '000000' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        border: BORDER
      };
    });
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

    for (let r = 0; r < 5; r++) {
      const labelAddr = XLSXStyle.utils.encode_cell({ r, c: 0 });
      if (!ws[labelAddr]) ws[labelAddr] = { t: 's', v: '' };
      ws[labelAddr].s = { fill: SKY_BLUE, font: { bold: true }, border: BORDER };
      const valueAddr = XLSXStyle.utils.encode_cell({ r, c: 1 });
      if (!ws[valueAddr]) ws[valueAddr] = { t: 's', v: '' };
      ws[valueAddr].s = { border: BORDER };
    }

    for (let r = 7; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const cellAddr = XLSXStyle.utils.encode_cell({ r, c });
        if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: '' };
        ws[cellAddr].s = r === 7
          ? { fill: SKY_BLUE, font: { bold: true }, border: BORDER, alignment: { horizontal: 'center', wrapText: true } }
          : { border: BORDER, alignment: { wrapText: true } };
      }
    }

    const metaLabelMaxLen = ['ESA ID', 'ESA Description', 'Verizon TQ ID', 'Verizon TQ Description', 'POC']
      .reduce((max, s) => Math.max(max, s.length), 0);
    const metaValueMaxLen = [esaId, esaDesc, tqId, tqDesc, poc]
      .reduce((max, s) => Math.max(max, s ? String(s).length : 0), 0);

    const dataColWidths = DATA_HEADERS.map((header, colIdx) => {
      const maxLen = dataRows.reduce((max, row) => Math.max(max, row[colIdx] ? String(row[colIdx]).length : 0), header.length);
      return { wch: Math.min(maxLen + 2, 50) };
    });
    dataColWidths[0] = { wch: Math.max(dataColWidths[0].wch, metaLabelMaxLen + 2) };
    dataColWidths[1] = { wch: Math.max(dataColWidths[1].wch, Math.min(metaValueMaxLen + 2, 50)) };
    ws['!cols'] = dataColWidths;

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

export const exportToPDF = async (
  dashboardData, loadAndProcessExcelData, loadIndividualBurnData, loadResourceFlagsData,
  chartBarRef, chartPieRef, chartHomeRef, chartMissingRef,
  headers, sheetData, selectedTower, selectedMonth, dollarValue,
  setDashboardData, setPdfLoading
) => {
  setPdfLoading(true);
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    const usableWidth = pageWidth - margin * 2;

    const addPageHeader = (title, subtitle) => {
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, pageWidth / 2, 26, { align: 'center' });
      if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, pageWidth - margin, 26, { align: 'right' });
      }
      doc.setTextColor(0, 0, 0);
    };

    if (!dashboardData.overall) {
      setDashboardData(prev => ({ ...prev, loading: true }));
      try {
        const [overall, individual, resourceFlags] = await Promise.all([
          loadAndProcessExcelData(),
          loadIndividualBurnData(),
          loadResourceFlagsData()
        ]);
        setDashboardData({ overall, individual, resourceFlags, loading: false, error: null });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error('Failed to load dashboard data for PDF:', err);
      }
    } else {
      await new Promise(r => setTimeout(r, 800));
    }

    // Capture all 4 charts as canvases
    const captureCanvas = async (ref) => {
      if (!ref.current) return null;
      await new Promise(r => setTimeout(r, 800));
      return await html2canvas(ref.current, {
        scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
        width: ref.current.scrollWidth, height: ref.current.scrollHeight,
        scrollX: -99999, scrollY: -99999,
        windowWidth: ref.current.scrollWidth, windowHeight: ref.current.scrollHeight, x: 0, y: 0,
      });
    };

    const [canvasBar, canvasPie, canvasHome, canvasMissing] = await Promise.all([
      captureCanvas(chartBarRef),
      captureCanvas(chartPieRef),
      captureCanvas(chartHomeRef),
      captureCanvas(chartMissingRef),
    ]);

    // Single dashboard page with 2x2 grid
    addPageHeader('Rate Analysis Dashboard', new Date().toLocaleDateString());

    const headerH = 40;
    const gap = 10;
    const cellW = (usableWidth - gap) / 2;
    const cellH = (pageHeight - headerH - margin - gap) / 2;

    const positions = [
      { x: margin,           y: headerH + gap,           label: 'Monthly Burn Comparison' },
      { x: margin + cellW + gap, y: headerH + gap,        label: 'Classification Distribution' },
      { x: margin,           y: headerH + gap + cellH + gap, label: 'H & M Tower Performance' },
      { x: margin + cellW + gap, y: headerH + gap + cellH + gap, label: 'Missing Classifications' },
    ];

    const canvases = [canvasBar, canvasPie, canvasHome, canvasMissing];

    canvases.forEach((canvas, i) => {
      if (!canvas) return;
      const { x, y, label } = positions[i];

      // Draw cell background border
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, cellW, cellH);

      // Chart label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label, x + cellW / 2, y + 10, { align: 'center' });

      // Fit image inside cell with padding
      const imgPad = 14;
      const imgW = cellW - imgPad;
      const imgH = (canvas.height / canvas.width) * imgW;
      const finalH = Math.min(imgH, cellH - imgPad);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', x + imgPad / 2, y + imgPad, imgW, finalH);
    });

    // Data tables
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
      doc.addPage();
      addPageHeader('Verizon Home & Marketing Burnsheet', label);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Records: ${rows.length}   |   Tower: ${selectedTower}   |   Month: ${selectedMonth}   |   $ Value: ${dollarValue}`, margin, 52);
      doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 60,
        styles: {
          fontSize: 6,
          cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
          overflow: 'ellipsize',
          halign: 'left',
          valign: 'middle',
          lineColor: [220, 220, 220],
          lineWidth: 0.3
        },
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: Object.fromEntries(scaledWidths.map((w, idx) => [idx, { cellWidth: w }])),
        margin: { left: margin, right: margin },
        tableWidth: usableWidth,
      });
    };

    addDataTable('India', indiaRows);
    addDataTable('USA', usaRows);
    doc.save(`burnsheet-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    setPdfLoading(false);
  }
};

export const saveToExcel = async (headers, sheetData) => {
  try {
    const exportData = [headers, ...sheetData];
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Combined Data');
    XLSX.writeFile(wb, 'Combined-Input-Updated.xlsx');
    alert('✅ Data saved successfully!\nFile: Combined-Input-Updated.xlsx');
  } catch (error) {
    console.error('Error saving file:', error);
    alert('❌ Error saving file: ' + error.message);
  }
};
