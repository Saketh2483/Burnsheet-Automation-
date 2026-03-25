import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadAndProcessExcelData } from './dashboard/utils/excelLoader';
import { loadIndividualBurnData } from './dashboard/utils/individualBurnLoader';
import { loadResourceFlagsData } from './dashboard/utils/resourceFlagsLoader';
import { processSheet, loadSkillMatrix, reorderColumns, extractColumnData } from './excel-loader/utils/dataProcessing';
import { exportToExcel, exportToPDF, saveToExcel } from './excel-loader/utils/exportFunctions';
import { handleReconciliation } from './excel-loader/utils/reconciliation';
import { handleCellChange as handleCellChangeUtil } from './excel-loader/utils/cellChangeHandler';
import Header from './excel-loader/components/Header';
import CountryTabs from './excel-loader/components/CountryTabs';
import FilterBar from './excel-loader/components/FilterBar';
import TableView from './excel-loader/components/TableView';
import DashboardView from './excel-loader/components/DashboardView';
import ChatWidget from './excel-loader/components/ChatWidget';
import PDFLoading from './excel-loader/components/PDFLoading';
import ChartRefs from './excel-loader/components/ChartRefs';
import './App.css';

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
  const chartBarRef = useRef(null);
  const chartPieRef = useRef(null);
  const chartHomeRef = useRef(null);
  const chartMissingRef = useRef(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    overall: null,
    individual: null,
    resourceFlags: null,
    loading: false,
    error: null
  });

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

  const processSheetCallback = useCallback((wb) => {
    processSheet(
      wb,
      reorderColumns,
      (headers, rows) => extractColumnData(headers, rows, setTqDataMessage),
      setHeaders,
      setSheetData,
      setDropdownOptions
    );
    setSelectedTower('All');
    setSelectedMonth('All');
  }, []);

  const loadExcelFileCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const skillMatrixData = await loadSkillMatrix();
      setSkillMatrix(skillMatrixData);
      
      const response = await fetch('/Combined-Input.xlsx');
      if (!response.ok) throw new Error('Failed to load file');
      
      const arrayBuffer = await response.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      processSheetCallback(wb);
    } catch (error) {
      setError('Error loading file: ' + error.message);
      console.error('File loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [processSheetCallback]);

  useEffect(() => {
    loadExcelFileCallback();
    handleOpenDashboard();
  }, [loadExcelFileCallback, handleOpenDashboard]);

  const handleCellChange = (rowIndex, cellIndex, newValue) => {
    handleCellChangeUtil(
      rowIndex,
      cellIndex,
      newValue,
      headers,
      sheetData,
      setSheetData,
      skillMatrix,
      setHasChanges,
      setChangedRowIndices
    );
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

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        text: chatInput,
        sender: 'user'
      };
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');

      setTimeout(() => {
        const botResponse = {
          id: 0,
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

  const handleExportExcel = async () => {
    await exportToExcel(sheetData, headers, getFilteredData, selectedCountry, selectedTower, selectedMonth);
  };

  const handleExportPDF = async () => {
    await exportToPDF(
      dashboardData,
      loadAndProcessExcelData,
      loadIndividualBurnData,
      loadResourceFlagsData,
      chartBarRef,
      chartPieRef,
      chartHomeRef,
      chartMissingRef,
      headers,
      sheetData,
      selectedTower,
      selectedMonth,
      dollarValue,
      setDashboardData,
      setPdfLoading
    );
  };

  const handleSaveExcel = async () => {
    await saveToExcel(headers, sheetData);
  };

  const handleReconcile = () => {
    handleReconciliation(
      sheetData,
      setSheetData,
      headers,
      changedRowIndices,
      setHasChanges,
      setChangedRowIndices
    );
  };

  return (
    <div className="excel-viewer">
      <div className="file-selection-section">
        <Header
          showDashboard={showDashboard}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
          onLogout={onLogout}
        />
        
        {loading && <div className="loading-message">⏳ Loading Burnsheet Data...</div>}
        {error && <div className="error-message">❌ {error}</div>}
        {tqDataMessage && <div className="info-message">ℹ️ {tqDataMessage}</div>}
      </div>

      {headers.length > 0 && (
        <>
          {!showDashboard && (
            <>
              <CountryTabs
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
              />
              <FilterBar
                dropdownOptions={dropdownOptions}
                selectedTower={selectedTower}
                setSelectedTower={setSelectedTower}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedCountry={selectedCountry}
                dollarValue={dollarValue}
                setDollarValue={setDollarValue}
                setChatMessages={setChatMessages}
                showDashboard={showDashboard}
                hasChanges={hasChanges}
                onReconcile={handleReconcile}
                onSave={handleSaveExcel}
                onExport={handleExportExcel}
                onExportPDF={handleExportPDF}
                onDashboard={handleOpenDashboard}
                pdfLoading={pdfLoading}
              />
            </>
          )}

          {showDashboard ? (
            <DashboardView
              dashboardData={dashboardData}
              onNavigateBack={() => setShowDashboard(false)}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />
          ) : (
            <TableView
              headers={headers}
              sheetData={sheetData}
              getFilteredData={getFilteredData}
              selectedCountry={selectedCountry}
              expandedSkillCell={expandedSkillCell}
              setExpandedSkillCell={setExpandedSkillCell}
              handleCellChange={handleCellChange}
              dropdownOptions={dropdownOptions}
            />
          )}
        </>
      )}

      <PDFLoading pdfLoading={pdfLoading} />

      <ChatWidget
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendMessage={handleSendMessage}
      />

      <ChartRefs
        dashboardData={dashboardData}
        chartBarRef={chartBarRef}
        chartPieRef={chartPieRef}
        chartHomeRef={chartHomeRef}
        chartMissingRef={chartMissingRef}
      />
    </div>
  );
}

export default App;
