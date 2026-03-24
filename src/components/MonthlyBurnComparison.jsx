import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import BarGraph from './BarGraph'
import IndividualBurn from './IndividualBurn'
import './MonthlyBurnComparison.css'

function MonthlyBurnComparison({ overallData, individualData, onNavigateToMonthly }) {
  const [currentView, setCurrentView] = useState('overall')
  const [selectedParameter, setSelectedParameter] = useState('')
  const [selectedValue, setSelectedValue] = useState('')
  const [availableColumns, setAvailableColumns] = useState([])
  const [availableValues, setAvailableValues] = useState([])
  const [filteredData, setFilteredData] = useState(null)
  const [excelData, setExcelData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load Excel data when custom view is selected
  const loadExcelData = useCallback(async () => {
    const targetColumns = ['Tower', 'Location', 'ACT/PCT', 'Verizon Level Mapping', 'Classification', 'Cognizant Designation', 'ESA Id', 'Service Line']
    
    try {
      setLoading(true)
      const response = await fetch('/Combined-H&M 1 1.xlsx')
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const XLSXModule = await import('xlsx')
      const XLSX = XLSXModule.default || XLSXModule

      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      setExcelData(jsonData)
      
      // Get available columns
      const columnKeys = Object.keys(jsonData[0])
      const columns = []
      targetColumns.forEach((targetCol) => {
        const foundColumn = columnKeys.find(
          col => col.toLowerCase().trim() === targetCol.toLowerCase().trim()
        )
        if (foundColumn) {
          columns.push({ display: targetCol, actual: foundColumn })
        }
      })
      setAvailableColumns(columns)
      
      setLoading(false)
    } catch (err) {
      console.error('Error loading Excel data:', err)
      setError('Failed to load data from Excel')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentView === 'custom' && !excelData) {
      loadExcelData()
    }
  }, [currentView, excelData, loadExcelData])

  const handleParameterChange = (e) => {
    const parameter = e.target.value
    setSelectedParameter(parameter)
    setSelectedValue('')
    setAvailableValues([])
    setFilteredData(null)

    if (parameter && excelData) {
      const values = generateValuesForParameter(parameter, excelData)
      setAvailableValues(values)
    }
  }

  const handleValueChange = (e) => {
    const value = e.target.value
    setSelectedValue(value)

    if (value && selectedParameter && excelData) {
      const filtered = filterDataByParameterAndValue(selectedParameter, value, excelData)
      setFilteredData(filtered)
    }
  }

  const generateValuesForParameter = (parameter, data) => {
    const columnKeys = Object.keys(data[0])
    const actualColumnName = columnKeys.find(
      col => col.toLowerCase().trim() === parameter.toLowerCase().trim()
    )

    if (!actualColumnName) return []

    const values = new Set()
    data.forEach(row => {
      const value = row[actualColumnName]
      if (value && String(value).trim() !== '') {
        values.add(String(value).trim())
      }
    })

    return Array.from(values).sort()
  }

  const filterDataByParameterAndValue = (parameter, value, data) => {
    const columnKeys = Object.keys(data[0])
    const actualColumnName = columnKeys.find(
      col => col.toLowerCase().trim() === parameter.toLowerCase().trim()
    )

    if (!actualColumnName) return null

    const filteredRows = data.filter(row => String(row[actualColumnName]).trim() === value)

    if (filteredRows.length === 0) return null

    let monthlyRateKey = null
    let actualRateKey = null

    columnKeys.forEach(key => {
      const lowerKey = key.toLowerCase().trim()
      
      if (lowerKey.includes('monthly') && lowerKey.includes('rate')) {
        monthlyRateKey = key
      }
      
      if (lowerKey.includes('actual') && lowerKey.includes('rate')) {
        actualRateKey = key
      }
    })

    let monthlyRateTotal = 0
    let monthlyRateCount = 0
    let actualRateTotal = 0
    let actualRateCount = 0

    filteredRows.forEach(row => {
      if (monthlyRateKey && row[monthlyRateKey] !== undefined && row[monthlyRateKey] !== null && row[monthlyRateKey] !== '') {
        let valueStr = String(row[monthlyRateKey]).replace(/[$,\s]/g, '').trim()
        const monthlyRate = parseFloat(valueStr)
        
        if (!isNaN(monthlyRate) && isFinite(monthlyRate)) {
          monthlyRateTotal += monthlyRate
          monthlyRateCount++
        }
      }

      if (actualRateKey && row[actualRateKey] !== undefined && row[actualRateKey] !== null && row[actualRateKey] !== '') {
        let valueStr = String(row[actualRateKey]).replace(/[$,\s]/g, '').trim()
        const actualRate = parseFloat(valueStr)
        
        if (!isNaN(actualRate) && isFinite(actualRate)) {
          actualRateTotal += actualRate
          actualRateCount++
        }
      }
    })

    return {
      monthlyRateAverage: monthlyRateCount > 0 ? monthlyRateTotal / monthlyRateCount : 0,
      monthlyRateTotal: monthlyRateTotal,
      monthlyRateCount: monthlyRateCount,
      actualRateAverage: actualRateCount > 0 ? actualRateTotal / actualRateCount : 0,
      actualRateTotal: actualRateTotal,
      actualRateCount: actualRateCount,
      recordsMatched: filteredRows.length
    }
  }

  return (
    <div className="monthly-burn-comparison-container">
      <div className="view-selector">
        <label htmlFor="view-dropdown" className="selector-label">Select View:</label>
        <select 
          id="view-dropdown"
          className="view-dropdown"
          value={currentView}
          onChange={(e) => setCurrentView(e.target.value)}
        >
          <option value="overall">📊 Total Monthly Burn vs Baseline Overall</option>
          <option value="individual">👤 Individual Monthly Burn vs Actual Burn</option>
          <option value="custom">⚙️ Custom View - Filtered Analysis</option>
        </select>
      </div>

      {currentView === 'overall' && overallData && <BarGraph data={overallData} onNavigateToMonthly={onNavigateToMonthly} />}
      {currentView === 'individual' && individualData && <IndividualBurn data={individualData} />}
      
      {currentView === 'custom' && (
        <div className="custom-view-container">
          {loading && (
            <div className="loading-message">Loading Excel data...</div>
          )}
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {!loading && !error && (
            <>
              <div className="custom-filters-wrapper">
                <div className="filter-group">
                  <label htmlFor="parameter-dropdown" className="filter-label">Filter by Parameters:</label>
                  <select
                    id="parameter-dropdown"
                    className="filter-dropdown"
                    value={selectedParameter}
                    onChange={handleParameterChange}
                  >
                    <option value="">Select Parameter</option>
                    {availableColumns.map((col) => (
                      <option key={col.actual} value={col.display}>
                        {col.display}
                      </option>
                    ))}
                  </select>
                  {availableColumns.length === 0 && (
                    <small className="filter-hint">No matching columns found in Excel</small>
                  )}
                </div>

                <div className="filter-group">
                  <label htmlFor="value-dropdown" className="filter-label">Values:</label>
                  <select
                    id="value-dropdown"
                    className="filter-dropdown"
                    value={selectedValue}
                    onChange={handleValueChange}
                    disabled={availableValues.length === 0}
                  >
                    <option value="">Select Value</option>
                    {availableValues.map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  {selectedParameter && availableValues.length > 0 && (
                    <small className="filter-hint">{availableValues.length} values available</small>
                  )}
                </div>
              </div>

              {filteredData && (
                <div className="filtered-results">
                  <div className="results-summary">
                    <div className="result-box">
                      <p className="result-label">Monthly Rate</p>
                      <p className="result-value">${filteredData.monthlyRateAverage.toFixed(2)}</p>
                      <p className="result-label">Average</p>
                      <p className="result-detail">Total: ${filteredData.monthlyRateTotal.toFixed(2)}</p>
                      <p className="result-detail">Count: {filteredData.monthlyRateCount}</p>
                    </div>
                    <div className="result-box">
                      <p className="result-label">Actual Rate</p>
                      <p className="result-value">${filteredData.actualRateAverage.toFixed(2)}</p>
                      <p className="result-label">Average</p>
                      <p className="result-detail">Total: ${filteredData.actualRateTotal.toFixed(2)}</p>
                      <p className="result-detail">Count: {filteredData.actualRateCount}</p>
                    </div>
                  </div>

                  <div className="graph-section">
                    <h2>Comparison Graph - {selectedParameter}: {selectedValue}</h2>
                    <div className="recharts-wrapper">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={[
                            { name: 'Monthly Rate', value: parseFloat(filteredData.monthlyRateAverage.toFixed(2)) },
                            { name: 'Actual Rate', value: parseFloat(filteredData.actualRateAverage.toFixed(2)) }
                          ]}
                          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#2c3e50', fontSize: 14, fontWeight: 500 }}
                            angle={-15}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fill: '#2c3e50', fontSize: 14 }}
                            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', fill: '#2c3e50' }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #ecf0f1', borderRadius: '4px' }}
                            formatter={(value) => `$${value.toFixed(2)}`}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px', display: 'none' }} iconType="square" />
                          <Bar dataKey="value" name="Average Rate" fill="#667eea" radius={[8, 8, 0, 0]}>
                            <Cell fill="#667eea" />
                            <Cell fill="#f5576c" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {!filteredData && selectedParameter && (
                <div className="no-selection">
                  <p>Select a value to see filtered results and comparison graph</p>
                </div>
              )}

              {!selectedParameter && (
                <div className="no-selection">
                  <p>Select a parameter to get started</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MonthlyBurnComparison
