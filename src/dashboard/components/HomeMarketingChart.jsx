import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './HomeMarketingChart.css'

function HomeMarketingChart() {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/Combined-Main.xlsx')
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

        if (!jsonData || jsonData.length === 0) {
          throw new Error('No data found in Excel file')
        }

        // Find columns for Jan-26, Feb-26, Mar-26
        const columnKeys = Object.keys(jsonData[0])
        const monthColumns = {
          'Jan': null,
          'Feb': null,
          'Mar': null
        }

        // Search for month columns (case-insensitive)
        columnKeys.forEach(key => {
          const lowerKey = key.toLowerCase().trim()
          if (lowerKey.includes('jan') && lowerKey.includes('26')) {
            monthColumns['Jan'] = key
          } else if (lowerKey.includes('feb') && lowerKey.includes('26')) {
            monthColumns['Feb'] = key
          } else if (lowerKey.includes('mar') && lowerKey.includes('26')) {
            monthColumns['Mar'] = key
          }
        })

        console.log('Found month columns:', monthColumns)

        // Calculate totals for each month and country
        const monthlyData = {
          'Jan': { 'India': [], 'USA': [] },
          'Feb': { 'India': [], 'USA': [] },
          'Mar': { 'India': [], 'USA': [] }
        }

        // Find Country column
        let countryColumnKey = null
        columnKeys.forEach(key => {
          const lowerKey = key.toLowerCase().trim()
          if (lowerKey.includes('country')) {
            countryColumnKey = key
          }
        })

        console.log('Found country column:', countryColumnKey)

        jsonData.forEach((row) => {
          const country = countryColumnKey ? (row[countryColumnKey] || '').toString().trim() : ''
          
          Object.entries(monthColumns).forEach(([month, columnKey]) => {
            if (columnKey) {
              const value = parseFloat(row[columnKey]) || 0
              if (value > 0) {
                if (country.toLowerCase().includes('india')) {
                  monthlyData[month]['India'].push(value)
                } else if (country.toLowerCase().includes('usa')) {
                  monthlyData[month]['USA'].push(value)
                }
              }
            }
          })
        })

        // Calculate the average for each month and country
        const data = Object.entries(monthlyData).map(([month, countries]) => {
          const indiaAvg = countries['India'].length > 0 
            ? Math.round(countries['India'].reduce((a, b) => a + b, 0) / countries['India'].length)
            : 0
          const usaAvg = countries['USA'].length > 0 
            ? Math.round(countries['USA'].reduce((a, b) => a + b, 0) / countries['USA'].length)
            : 0
          const totalAvg = Math.round((indiaAvg + usaAvg) / 2)
          return {
            month: month + '-26',
            India: indiaAvg,
            USA: usaAvg,
            Total: totalAvg
          }
        })

        setChartData(data)
        setLoading(false)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { India, USA, month } = payload[0].payload
      return (
        <div className="chart-tooltip">
          <p className="tooltip-month">{month}</p>
          <div style={{ marginTop: '4px' }}>
            <p style={{ margin: '0', color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}>
              India: ${India.toLocaleString()}
            </p>
          </div>
          <div style={{ marginTop: '4px' }}>
            <p style={{ margin: '0', color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
              USA: ${USA.toLocaleString()}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="home-marketing-chart">
      <h2 className="chart-title">H & M Tower Performance</h2>
      
      <div className="chart-wrapper">
        {loading && <p>Loading chart data...</p>}
        {error && <p className="error">Error: {error}</p>}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 60, bottom: 15 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="100%" stopColor="#123244ff" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#123244ff" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#d1d5db"
                vertical={true}
                horizontal={true}
              />
              
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                label={{ value: 'Months', position: 'bottom', offset: 10 }}
              />
              
              <YAxis
                domain={[0, 20000]}
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                ticks={[0,5000, 10000, 15000, 20000]}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                label={{ value: 'Avg Rate ($)', angle: -90, position: 'insideLeft', fontSize: '10px' }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="Total"
                stroke="#D67C74"
                strokeWidth={2.5}
                fill="url(#colorTotal)"
                dot={{
                  fill: '#D67C74',
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: '#D67C74',
                }}
                name="Total Average"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default HomeMarketingChart
