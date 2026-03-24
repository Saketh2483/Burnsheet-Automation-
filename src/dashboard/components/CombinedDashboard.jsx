import { useState, useEffect } from 'react'
import MonthlyBurnComparison from './MonthlyBurnComparison'
import ResourceFlags from './ResourceFlags'
import MissingClassificationsAlert from './MissingClassificationsAlert'
import Chatbot from './Chatbot'
import './CombinedDashboard.css'

function CombinedDashboard({ overallData, individualData, resourceFlagsData }) {
  const [activeTab, setActiveTab] = useState('combined')
  const [missingClassificationsData, setMissingClassificationsData] = useState(null)

  // Log incoming data
  console.log('🔄 CombinedDashboard received props:', {
    overallDataKeys: overallData ? Object.keys(overallData) : 'undefined',
    overallDataHasRows: overallData?.rows ? true : false,
    overallDataRowsLength: overallData?.rows?.length || 0
  });

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
          console.error('No data found in Excel file')
          setMissingClassificationsData({
            missingRows: [],
            totalRows: 0,
            missingCount: 0,
            classificationKey: null
          })
          return
        }

        // Get all column keys
        const columnKeys = Object.keys(jsonData[0])
        console.log('📋 All columns in Excel:', columnKeys)
        console.log('📊 Column count:', columnKeys.length)
        
        // If more than 7 columns, column H is likely at index 7
        let classificationKey = null
        
        // Strategy 1: Look for explicit "Classification" column name
        for (const key of columnKeys) {
          const lowerKey = key.toLowerCase().trim()
          if (lowerKey.includes('classification')) {
            classificationKey = key
            console.log('✅ Found Classification column by name:', classificationKey)
            break
          }
        }

        // Strategy 2: If column H exists (usually index 7), check if it might be Classification
        if (!classificationKey && columnKeys.length > 7) {
          classificationKey = columnKeys[7]
          console.log('✅ Using column H (index 7) as Classification:', classificationKey)
        }

        // Strategy 3: Check for "Key" column as potential classification
        if (!classificationKey) {
          for (const key of columnKeys) {
            const lowerKey = key.toLowerCase().trim()
            if (lowerKey === 'key') {
              classificationKey = key
              console.log('✅ Using "Key" column as Classification:', classificationKey)
              break
            }
          }
        }

        if (!classificationKey) {
          console.error('❌ Classification column not found. Available columns:', columnKeys.join(', '))
          setMissingClassificationsData({
            missingRows: [],
            totalRows: jsonData.length,
            missingCount: 0,
            classificationKey: null,
            message: `Classification column not found. Available columns: ${columnKeys.join(', ')}`
          })
          return
        }

        console.log('✅ Using column for Classification:', classificationKey)

        // Find missing classifications
        const missingRows = []
        jsonData.forEach((row, rowIndex) => {
          const classification = row[classificationKey]
          // Check if classification is empty, null, undefined, or whitespace
          if (classification === null || 
              classification === undefined ||
              String(classification).trim() === '' || 
              String(classification).toLowerCase() === 'undefined' || 
              String(classification).toLowerCase() === 'null') {
            missingRows.push({
              rowIndex,
              originalIndex: rowIndex + 2, // +2 because row 1 is header, rowIndex starts at 0
              ...row
            })
          }
        })

        console.log(`✅ Found ${missingRows.length} rows with missing classifications out of ${jsonData.length} total rows`)

        setMissingClassificationsData({
          missingRows,
          totalRows: jsonData.length,
          missingCount: missingRows.length,
          classificationKey,
          jsonData,
          workbook,
          sheetName,
          XLSX
        })
      } catch (error) {
        console.error('❌ Error loading missing classifications:', error.message)
        setMissingClassificationsData({
          missingRows: [],
          totalRows: 0,
          missingCount: 0,
          classificationKey: null,
          message: `Error: ${error.message}`
        })
      }
    }

    loadMissingClassifications()
  }, [])

  return (
    <div className="combined-dashboard">
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'combined' ? 'active' : ''}`}
          onClick={() => setActiveTab('combined')}
        >
          📊 Combined View
        </button>
        <button 
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          📈 Monthly Burn
        </button>
        <button 
          className={`tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
          onClick={() => setActiveTab('missing')}
        >
          ⚠️ Missing Classifications
        </button>
        <button 
          className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          🚩 Resource Flags
        </button>
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

      {/* Floating Chatbot - Always visible */}
      <Chatbot />
    </div>
  )
}

export default CombinedDashboard
