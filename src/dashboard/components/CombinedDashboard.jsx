import { useState, useEffect } from 'react'
import MonthlyBurnComparison from './MonthlyBurnComparison'
import ResourceFlags from './ResourceFlags'
import MissingClassificationsAlert from './MissingClassificationsAlert'
import Chatbot from './Chatbot'
import './CombinedDashboard.css'

function CombinedDashboard({ overallData, individualData, resourceFlagsData, onNavigateBack, onExportExcel, onExportPDF }) {
  const [activeTab, setActiveTab] = useState('combined')
  const [missingClassificationsData, setMissingClassificationsData] = useState(null)

  useEffect(() => {
    const loadMissingClassifications = async () => {
      try {
        const response = await fetch('/Combined-Input.xlsx')
        if (!response.ok) {
          throw new Error(`Failed to load Excel file: ${response.statusText}`)
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()

        const XLSXModule = await import('xlsx')
        const XLSX = XLSXModule.default || XLSXModule

        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (!jsonData || jsonData.length === 0) {
          setMissingClassificationsData({ missingRows: [], totalRows: 0, missingCount: 0, classificationKey: null })
          return
        }

        const columnKeys = Object.keys(jsonData[0])
        let classificationKey = null

        for (const key of columnKeys) {
          if (key.toLowerCase().trim().includes('classification')) {
            classificationKey = key
            break
          }
        }

        if (!classificationKey && columnKeys.length > 7) {
          classificationKey = columnKeys[7]
        }

        if (!classificationKey) {
          for (const key of columnKeys) {
            if (key.toLowerCase().trim() === 'key') {
              classificationKey = key
              break
            }
          }
        }

        if (!classificationKey) {
          setMissingClassificationsData({
            missingRows: [], totalRows: jsonData.length, missingCount: 0, classificationKey: null,
            message: `Classification column not found. Available columns: ${columnKeys.join(', ')}`
          })
          return
        }

        const missingRows = []
        jsonData.forEach((row, rowIndex) => {
          const classification = row[classificationKey]
          if (classification === null || classification === undefined ||
              String(classification).trim() === '' ||
              String(classification).toLowerCase() === 'undefined' ||
              String(classification).toLowerCase() === 'null') {
            missingRows.push({ rowIndex, originalIndex: rowIndex + 2, ...row })
          }
        })

        setMissingClassificationsData({
          missingRows, totalRows: jsonData.length, missingCount: missingRows.length,
          classificationKey, jsonData, workbook, sheetName, XLSX
        })
      } catch (error) {
        setMissingClassificationsData({
          missingRows: [], totalRows: 0, missingCount: 0, classificationKey: null,
          message: `Error: ${error.message}`
        })
      }
    }

    loadMissingClassifications()
  }, [])

  return (
    <div className="combined-dashboard">
      <div className="dashboard-tabs">
        <div className="tabs-left">
          <button
            className={`tab-btn ${activeTab === 'combined' ? 'active' : ''}`}
            onClick={() => setActiveTab('combined')}
          >
            📊 Dashboard
          </button>
          <button className="tab-btn" onClick={onNavigateBack} title="View Resource Burn information">
            🔥 Resource Burn
          </button>
        </div>

        <div className="tabs-right">
          <button className="tab-btn back-btn excel-btn" onClick={onExportExcel} title="Export dashboard data as Excel">
            📊 Export
          </button>
          <button className="tab-btn back-btn pdf-btn" onClick={onExportPDF} title="Export dashboard data as PDF">
            📄 PDF
          </button>
        </div>
      </div>

      {activeTab === 'combined' && (
        <div className="combined-container">
          <div className="dashboard-panel left-panel">
            <MonthlyBurnComparison overallData={overallData} individualData={individualData} onNavigateToMonthly={() => setActiveTab('monthly')} />
          </div>
          <div className="dashboard-panel middle-panel">
            {missingClassificationsData && (
              <MissingClassificationsAlert data={missingClassificationsData} />
            )}
          </div>
          <div className="dashboard-panel right-panel">
            <ResourceFlags data={resourceFlagsData} onNavigateToResourceFlags={() => setActiveTab('resources')} />
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="full-dashboard">
          <MonthlyBurnComparison overallData={overallData} individualData={individualData} />
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="full-dashboard">
          {missingClassificationsData && (
            <MissingClassificationsAlert data={missingClassificationsData} />
          )}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="full-dashboard">
          <ResourceFlags data={resourceFlagsData} />
        </div>
      )}

      <Chatbot />
    </div>
  )
}

export default CombinedDashboard
