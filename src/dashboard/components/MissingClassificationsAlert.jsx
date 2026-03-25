import { useState, useMemo } from 'react'
import './MissingClassificationsAlert.css'

function MissingClassificationsAlert({ data }) {
  const [editingRows, setEditingRows] = useState({})
  
  // Memoize displayedRows to prevent it from changing on every render
  const displayedRows = useMemo(() => data?.missingRows || [], [data?.missingRows])

  // Separate missing rows by country
  const { indiaRows, usaRows } = useMemo(() => {
    const india = []
    const usa = []

    displayedRows.forEach(row => {
      const country = row.Country || row.country || ''
      const countryStr = String(country).toLowerCase().trim()
      
      if (countryStr.includes('india')) {
        india.push(row)
      } else if (countryStr.includes('usa')) {
        usa.push(row)
      }
    })

    return { indiaRows: india, usaRows: usa }
  }, [displayedRows])

  // Handle error message if provided
  if (data?.message) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>⚠️ Classification Setup</h3>
          <span className="alert-badge">{data?.missingCount || 0}</span>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#d97706' }}>
          <p style={{ fontWeight: '500', marginBottom: '10px' }}>⚠️ {data.message}</p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Please verify your Excel file structure and ensure it has proper column headers.
          </p>
        </div>
      </div>
    )
  }

  // Don't render if no data provided
  if (!data) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>⚠️ Missing Classifications</h3>
          <span className="alert-badge">0</span>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
          <p>Loading classification data...</p>
        </div>
      </div>
    )
  }

  // Show success message if all rows have been classified
  if (!data.missingRows || data.missingRows.length === 0) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>✅ All Rows Classified!</h3>
          <span className="alert-badge" style={{background: '#28a745'}}>0</span>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
          <p>Great! All rows now have classifications.</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>Total rows: {data.totalRows || 0}</p>
        </div>
      </div>
    )
  }

  const getEmpIdValue = (row, columnKey) => {
    const value = row[columnKey]
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      return '—'
    }
    return String(value)
  }

  const getDisplayValue = (row, columnKey) => {
    const value = row[columnKey]
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      return '—'
    }
    return String(value).substring(0, 30)
  }

  const findColumnKey = (row, searchTerms) => {
    const keys = Object.keys(row)
    for (const key of keys) {
      const lowerKey = key.toLowerCase().trim()
      for (const term of searchTerms) {
        if (lowerKey.includes(term.toLowerCase())) {
          return key
        }
      }
    }
    return null
  }

  const getNormalizedClassification = (input) => {
    if (!input || input.trim() === '') return ''
    return input
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const handleEditChange = (rowIndex, newValue) => {
    setEditingRows(prev => ({
      ...prev,
      [rowIndex]: newValue,
    }))
  }

  // Don't render if all rows have been saved
  if (displayedRows.length === 0) {
    return (
      <div className="missing-classifications-alert">
        <div className="alert-header">
          <h3>✅ All Rows Classified!</h3>
          <span className="alert-badge" style={{background: '#28a745'}}>0</span>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
          <p>Great! All rows now have classifications.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="missing-classifications-alert">
      <div className="alert-header">
        <h3>⚠️ Missing Classifications</h3>
        <span className="alert-badge">{displayedRows.length}</span>
      </div>

      {/* India Missing Classifications Table */}
      <div className="country-section india-section">
        <div className="country-header">
          <h3>India Classifications</h3>
          <span className="country-badge india-badge">{indiaRows.length}</span>
        </div>

        {indiaRows.length > 0 ? (
          <div className={`alert-table-wrapper ${indiaRows.length > 19 ? 'scrollable' : ''}`}>
            <table className="alert-table">
              <thead>
                <tr>
                  <th>EmpID</th>
                  <th>Employee Name</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {indiaRows.map((row, idx) => {
                  const empIdKey = findColumnKey(row, ['empid', 'emp id', 'employee id'])
                  const empNameKey = findColumnKey(row, ['emp name', 'employee name', 'name'])
                  const rowIndex = row.rowIndex

                  return (
                    <tr key={`india-${idx}`} className="missing-row">
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
            <p>✅ No missing classifications found for India</p>
            <p style={{ fontSize: '12px', color: '#999' }}>All India rows have been classified.</p>
          </div>
        )}
      </div>

      {/* USA Missing Classifications Table */}
      <div className="country-section usa-section">
        <div className="country-header">
          <h3>USA Classifications</h3>
          <span className="country-badge usa-badge">{usaRows.length}</span>
        </div>

        {usaRows.length > 0 ? (
          <div className={`alert-table-wrapper ${usaRows.length > 19 ? 'scrollable' : ''}`}>
            <table className="alert-table">
              <thead>
                <tr>
                  <th>EmpID</th>
                  <th>Employee Name</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {usaRows.map((row, idx) => {
                  const empIdKey = findColumnKey(row, ['empid', 'emp id', 'employee id'])
                  const empNameKey = findColumnKey(row, ['emp name', 'employee name', 'name'])
                  const rowIndex = row.rowIndex

                  return (
                    <tr key={`usa-${idx}`} className="missing-row">
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
            <p>✅ No missing classifications found for USA</p>
            <p style={{ fontSize: '12px', color: '#999' }}>All USA rows have been classified.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MissingClassificationsAlert
