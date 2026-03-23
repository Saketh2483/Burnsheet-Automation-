import { useState } from 'react'
import './MissingClassificationsAlert.css'

function MissingClassificationsAlert({ data }) {
  const [editingRows, setEditingRows] = useState({})
  const [displayedRows, setDisplayedRows] = useState(data?.missingRows || [])

  if (!data || data.missingCount === 0) {
    return null
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
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
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



      {displayedRows.length > 0 && (
        <>
          <div className={`alert-table-wrapper ${displayedRows.length > 19 ? 'scrollable' : ''}`}>
            <table className="alert-table">
              <thead>
                <tr>
                  <th>EmpID</th>
                  <th>Employee Name</th>
                  <th>Classification</th>
                  {/* <th>Action</th> */}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, idx) => {
                  const empIdKey = findColumnKey(row, ['empid', 'emp id', 'employee id'])
                  const empNameKey = findColumnKey(row, ['emp name', 'employee name', 'name'])
                  const rowIndex = row.rowIndex

                  return (
                    <tr key={idx} className="missing-row">
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
        </>
      )}
    </div>
  )
}

export default MissingClassificationsAlert
