import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import HomeMarketingChart from './HomeMarketingChart'
import './ResourceFlags.css'

function ResourceFlags({ data, onNavigateToResourceFlags }) {
  const [countryData, setCountryData] = useState({})

  useEffect(() => {
    const loadCountryData = async () => {
      try {
        const response = await fetch('/Combined-Input.xlsx')
        if (!response.ok) {
          throw new Error('Failed to load Excel file')
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()

        const XLSXModule = await import('xlsx')
        const XLSX = XLSXModule.default || XLSXModule

        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Find column keys
        const columnKeys = Object.keys(jsonData[0])
        let classificationKey = null
        let countryKey = null
        let empIdKey = null

        columnKeys.forEach(key => {
          const lowerKey = key.toLowerCase().trim()
          if (lowerKey.includes('classification')) {
            classificationKey = key
          }
          if (lowerKey.includes('country')) {
            countryKey = key
          }
          if (lowerKey.includes('empid') || lowerKey.includes('emp id') || lowerKey.includes('employee id')) {
            empIdKey = key
          }
        })

        // Process data to separate by classification and country
        const countryByClassification = {}

        jsonData.forEach((row) => {
          const classification = String(row[classificationKey] || '').trim()
          const country = String(row[countryKey] || '').trim()
          const empId = String(row[empIdKey] || '').trim()

          if (classification && country && empId && classification !== 'undefined') {
            if (!countryByClassification[classification]) {
              countryByClassification[classification] = {
                India: 0,
                USA: 0,
                total: 0
              }
            }

            if (country.toLowerCase().includes('india')) {
              countryByClassification[classification].India++
              countryByClassification[classification].total++
            } else if (country.toLowerCase().includes('usa')) {
              countryByClassification[classification].USA++
              countryByClassification[classification].total++
            }
          }
        })

        setCountryData(countryByClassification)
      } catch (err) {
        console.error('Error loading country data:', err)
      }
    }

    loadCountryData()
  }, [])

  // Transform data for Recharts PieChart
  const pieData = data.pieChartData.labels.map((label, index) => ({
    name: label,
    value: data.pieChartData.values[index],
  }))

  // Calculate total for percentage calculation
  const total = pieData.reduce((sum, item) => sum + item.value, 0)

  // Custom label renderer to show percentages inside pie chart
  const renderCustomLabel = (entry) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = entry
    const RADIAN = Math.PI / 180
    
    // Position label in the middle of the donut segment
    const radius = (innerRadius + outerRadius) / 2
    const angle = midAngle * RADIAN
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    
    const percentage = ((value / total) * 100).toFixed(1)
    const segmentColor = data.pieChartData.colors[entry.index % data.pieChartData.colors.length]

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontWeight="bold"
        fontSize="14"
        stroke={segmentColor}
        strokeWidth="2.5"
        paintOrder="stroke"
      >
        {percentage}%
      </text>
    )
  }

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { name, value } = payload[0]
      const percentage = ((value / total) * 100).toFixed(1)
      const countryInfo = countryData[name] || { India: 0, USA: 0, total: 0 }
      
      return (
        <div className="custom-tooltip">
          <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>{name}</p>
          <p style={{ margin: '2px 0', fontSize: '12px' }}>Total: {value} users ({percentage}%)</p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '4px', paddingTop: '4px' }}>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#93c5fd' }}> India Users: {countryInfo.India}</p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#fca5a5' }}> USA Users: {countryInfo.USA}</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="resource-flags-container">
      {!data || !data.pieChartData ? (
        <div className="pie-chart-section">
          <p>No classification data available</p>
        </div>
      ) : (
        <div className="pie-chart-section">
          <h2>Classification Distribution</h2>
          <div className="pie-chart-wrapper" onClick={onNavigateToResourceFlags}>
            <div className="pie-chart-card">
              <div className="pie-chart-container">
                <ResponsiveContainer width={300} height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={data.pieChartData.colors[index % data.pieChartData.colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="custom-legend">
                {pieData.map((entry, index) => (
                  <div key={`legend-${index}`} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: data.pieChartData.colors[index % data.pieChartData.colors.length] }}
                    ></div>
                    <span className="legend-label">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Area Graph Card */}
      <HomeMarketingChart />
    </div>
  )
}

export default ResourceFlags
