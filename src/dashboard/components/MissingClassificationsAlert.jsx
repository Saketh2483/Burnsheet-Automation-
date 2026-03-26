import { useState, useMemo } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './MissingClassificationsAlert.css'
 
function MissingClassificationsAlert({ data }) {
  const [editingRows, setEditingRows] = useState({})
  const [activeCountry, setActiveCountry] = useState('India')
 
  const missingRows = useMemo(() => {
    return data?.missingRows || []
  }, [data?.missingRows])
 
  const { indiaRows, usaRows } = useMemo(() => {
    const india = []
    const usa = []
    missingRows.forEach(row => {
      const countryStr = String(row.Country || row.country || '').toLowerCase().trim()
      if (countryStr.includes('india')) india.push(row)
      else if (countryStr.includes('usa')) usa.push(row)
    })
    return { indiaRows: india, usaRows: usa }
  }, [missingRows])
 
  const radarData = useMemo(() => {
    const rows = data?.jsonData || []
    if (!rows.length) return []
    const keys = Object.keys(rows[0])
    const pocKey = keys.find(k => k.toLowerCase().trim() === 'poc')
    const actualKey = keys.find(k => k.toLowerCase().includes('actual') && k.toLowerCase().includes('rate'))
    const projectedKey = keys.find(k => k.toLowerCase().includes('projected') || (k.toLowerCase().includes('monthly') && k.toLowerCase().includes('rate')))
    if (!pocKey || !actualKey) return []
    const pocMap = {}
    rows.forEach(row => {
      const poc = String(row[pocKey] || '').trim()
      if (!poc) return
      const actual = parseFloat(String(row[actualKey] || '').replace(/[$,]/g, '')) || 0
      const projected = projectedKey ? parseFloat(String(row[projectedKey] || '').replace(/[$,]/g, '')) || 0 : 0
      if (!pocMap[poc]) pocMap[poc] = { Actual: 0, Projected: 0 }
      pocMap[poc].Actual += actual
      pocMap[poc].Projected += projected
    })
    return Object.entries(pocMap)
      .map(([poc, vals]) => ({
        poc: poc.length > 14 ? poc.slice(0, 14) + '…' : poc,
        Actual: Math.round(vals.Actual),
        Projected: Math.round(vals.Projected),
      }))
      .sort((a, b) => b.Actual - a.Actual)
      .slice(0, 8)
  }, [data])
 
  // Helper functions — defined before early returns
  const getEmpIdValue = (row, columnKey) => {
    const value = row[columnKey]
    if (!value || value === '' || value === 'undefined' || value === 'null') return '—'
    return String(value)
  }
 
  const getDisplayValue = (row, columnKey) => {
    const value = row[columnKey]
    if (!value || value === '' || value === 'undefined' || value === 'null') return '—'
    return String(value).substring(0, 30)
  }
 
  const findColumnKey = (row, searchTerms) => {
    const keys = Object.keys(row)
    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim()
      for (const term of searchTerms) {
        if (lowerKey.includes(term.toLowerCase())) return key
      }
    }
    return null
  }
 
  const getNormalizedClassification = (input) => {
    if (!input || input.trim() === '') return ''
    return input.trim().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
 
  const handleEditChange = (rowIndex, newValue) => {
    setEditingRows(prev => ({ ...prev, [rowIndex]: newValue }))
  }
 
  const renderRadar = () => (
    <div className="mc-radar-card">
      <p className="mc-radar-title">POC Burn Rate</p>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="poc" tick={{ fontSize: 9, fill: '#555' }} />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: '#aaa' }} width={20} />
            <Radar name="Actual" dataKey="Actual" stroke="#f5576c" fill="#f5576c" fillOpacity={0.35} />
            <Radar name="Projected" dataKey="Projected" stroke="#667eea" fill="#667eea" fillOpacity={0.35} />
            <Tooltip formatter={(val) => `$${val.toLocaleString()}`} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
 
  const renderTable = (rows, countryKey) => (
    rows.length > 0 ? (
      <div className="alert-table-wrapper">
        <table className="alert-table">
          <thead>
            <tr>
              <th>EmpID</th>
              <th>Employee Name</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const empIdKey = findColumnKey(row, ['empid', 'emp id', 'employee id'])
              const empNameKey = findColumnKey(row, ['emp name', 'employee name', 'name'])
              const rowIndex = row.rowIndex
              return (
                <tr key={`${countryKey}-${idx}`} className="missing-row">
                  <td className="emp-id-cell">{empIdKey ? getEmpIdValue(row, empIdKey) : '—'}</td>
                  <td className="emp-name-cell">{empNameKey ? getDisplayValue(row, empNameKey) : '—'}</td>
                  <td className="classification-cell">
                    <div className="classification-input-wrapper">
                      <input
                        type="text"
                        placeholder="Enter classification"
                        value={editingRows[rowIndex] || ''}
                        onChange={(e) => handleEditChange(rowIndex, e.target.value)}
                        className="classification-input"
                      />
                      {editingRows[rowIndex] && (
                        <div className="normalized-preview">
                          {getNormalizedClassification(editingRows[rowIndex])}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="no-data-message">
        <p>✅ No missing classifications for {activeCountry}</p>
        <p style={{ fontSize: '12px', color: '#999' }}>All rows have been classified.</p>
      </div>
    )
  )
 
  if (data?.message) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>⚠️ Classification Setup</h3>
          <span className="alert-badge">{data?.missingCount || 0}</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#d97706' }}>
          <p style={{ fontWeight: '500', marginBottom: '10px' }}>⚠️ {data.message}</p>
          {data.message.includes('Classification') ? (
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Classification column has been created and will be populated when you submit classifications below.
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: '#999' }}>Please verify your Excel file structure.</p>
          )}
        </div>
        {radarData.length > 0 && renderRadar()}
      </div>
    )
  }
 
  if (!data) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>⚠️ Missing Classifications</h3>
          <span className="alert-badge">0</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          <p>Loading classification data...</p>
        </div>
      </div>
    )
  }
 
  if (!data.missingRows || data.missingRows.length === 0) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>✅ All Rows Classified!</h3>
          <span className="alert-badge" style={{ background: '#28a745' }}>0</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>Great! All rows now have classifications.</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>Total rows: {data.totalRows || 0}</p>
        </div>
        {radarData.length > 0 && renderRadar()}
      </div>
    )
  }
 
  if (missingRows.length === 0) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>✅ All Rows Classified!</h3>
          <span className="alert-badge" style={{ background: '#28a745' }}>0</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>Great! All rows now have classifications.</p>
        </div>
        {radarData.length > 0 && renderRadar()}
      </div>
    )
  }
 
  const activeRows = activeCountry === 'India' ? indiaRows : usaRows
 
  return (
    <div className="missing-classifications-alert">
      <div className="alert-header">
        <h3>⚠️ Missing Classifications</h3>
        <span className="alert-badge">{missingRows.length}</span>
      </div>
 
      <div className="mc-country-tabs">
        <button
          className={`mc-tab-btn mc-india-btn ${activeCountry === 'India' ? 'active' : ''}`}
          onClick={() => setActiveCountry('India')}
        >
          India
          <span className="mc-tab-count">{indiaRows.length}</span>
        </button>
        <button
          className={`mc-tab-btn mc-usa-btn ${activeCountry === 'USA' ? 'active' : ''}`}
          onClick={() => setActiveCountry('USA')}
        >
          USA
          <span className="mc-tab-count">{usaRows.length}</span>
        </button>
      </div>
 
      {renderTable(activeRows, activeCountry)}
 
      {radarData.length > 0 && renderRadar()}
    </div>
  )
}
 
export default MissingClassificationsAlert