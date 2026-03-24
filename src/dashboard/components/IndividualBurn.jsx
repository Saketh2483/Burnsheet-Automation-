import { useState } from 'react'
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
import './IndividualBurn.css'

function IndividualBurn({ data }) {
  const [searchInput, setSearchInput] = useState(data.employees[0]?.empId || '')
  const [showDropdown, setShowDropdown] = useState(false)

  // Filter employees based on search input
  const filteredEmployees = data.employees.filter(emp =>
    emp.empId.toString().toLowerCase().includes(searchInput.toLowerCase())
  )

  const currentEmployee = data.employees.find(emp => emp.empId === searchInput)

  if (!currentEmployee && searchInput !== '') {
    return (
      <div className="individual-burn-container">
        <div className="employee-searcher">
          <label htmlFor="emp-search">Search Employee by ID:</label>
          <div className="search-container">
            <input 
              id="emp-search"
              type="text"
              value={searchInput} 
              onChange={(e) => {
                setSearchInput(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Enter Employee ID..."
              className="employee-search-input"
            />
            {filteredEmployees.length > 0 && searchInput && showDropdown && (
              <div className="search-results">
                {filteredEmployees.slice(0, 5).map(emp => (
                  <div 
                    key={emp.empId}
                    className="search-result-item"
                    onClick={() => {
                      setSearchInput(emp.empId)
                      setShowDropdown(false)
                    }}
                  >
                    {emp.empId}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="error">Employee "{searchInput}" not found</div>
      </div>
    )
  }

  const displayEmployee = currentEmployee || data.employees[0]

  // Prepare data for Recharts
  const chartData = [
    {
      name: 'Monthly Rate',
      value: parseFloat(displayEmployee.monthlyRateAverage.toFixed(2)),
    },
    {
      name: 'Actual Rate',
      value: parseFloat(displayEmployee.actualRateAverage.toFixed(2)),
    },
  ]

  const colors = ['#667eea', '#f5576c']

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{payload[0].payload.name}</p>
          <p className="value">${payload[0].value.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="individual-burn-container">
      <div className="employee-searcher">
        <label htmlFor="emp-search">Search Employee by ID:</label>
        <div className="search-container">
          <input 
            id="emp-search"
            type="text"
            value={searchInput} 
            onChange={(e) => {
              setSearchInput(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Enter Employee ID..."
            className="employee-search-input"
          />
          {filteredEmployees.length > 0 && searchInput && showDropdown && (
            <div className="search-results">
              {filteredEmployees.slice(0, 5).map(emp => (
                <div 
                  key={emp.empId}
                  className="search-result-item"
                  onClick={() => {
                    setSearchInput(emp.empId)
                    setShowDropdown(false)
                  }}
                >
                  {emp.empId}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="stats-panel">
        <div className="stat-box">
          <h3>Monthly Rate</h3>
          <p className="stat-value">${displayEmployee.monthlyRateAverage.toFixed(2)}</p>
          <p className="stat-label">Average</p>
          <p className="stat-detail">Total: ${displayEmployee.monthlyRateTotal.toFixed(2)}</p>
          <p className="stat-detail">Count: {displayEmployee.monthlyRateCount}</p>
        </div>

        <div className="stat-box">
          <h3>Actual Rate</h3>
          <p className="stat-value">${displayEmployee.actualRateAverage.toFixed(2)}</p>
          <p className="stat-label">Average</p>
          <p className="stat-detail">Total: ${displayEmployee.actualRateTotal.toFixed(2)}</p>
          <p className="stat-detail">Count: {displayEmployee.actualRateCount}</p>
        </div>
      </div>

      <div className="graph-section">
        <h2>Employee {searchInput || displayEmployee.empId} - Comparison Graph</h2>
        <div className="recharts-wrapper">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="square"
              />
              <Bar dataKey="value" name="Average Rate" fill="#667eea" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color monthly-bar"></div>
          <span>Monthly Rate Average</span>
        </div>
        <div className="legend-item">
          <div className="legend-color actual-bar"></div>
          <span>Actual Rate Average</span>
        </div>
      </div>
    </div>
  )
}

export default IndividualBurn
