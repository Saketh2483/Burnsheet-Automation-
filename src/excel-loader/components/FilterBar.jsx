import React from 'react';

export const FilterBar = ({
  dropdownOptions,
  selectedTower,
  setSelectedTower,
  selectedMonth,
  setSelectedMonth,
  selectedCountry,
  dollarValue,
  setDollarValue,
  setChatMessages,
  showDashboard,
  hasChanges,
  onReconcile,
  onSave,
  onExport,
  onExportPDF,
  onDashboard,
  pdfLoading
}) => {
  return (
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
              onClick={onReconcile}
              disabled={!hasChanges}
              title={hasChanges ? "Reconcile and validate the data" : "Make changes to enable reconciliation"}
            >
              🔄 Reconcile
            </button>
            <button className="export-btn save-btn" onClick={onSave} title="Save all changes to Excel file">💾 Save</button>
            <button className="export-btn excel-btn" onClick={onExport} title="Export filtered data as Excel">📊 Export</button>
            <button className="export-btn pdf-btn" onClick={onExportPDF} disabled={pdfLoading} title="Export as PDF Summary">📄 PDF</button>
            <button className="export-btn dashboard-btn" onClick={onDashboard} title="View Dashboard">📈 Dashboard</button>
          </>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
