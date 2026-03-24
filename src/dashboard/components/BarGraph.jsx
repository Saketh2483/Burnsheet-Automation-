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
import './BarGraph.css'

function BarGraph({ data, onNavigateToMonthly }) {
  // Prepare data for Recharts
  const chartData = [
    {
      name: 'Monthly Rate',
      value: parseFloat(data.monthlyRateAverage.toFixed(2)),
      average: parseFloat(data.monthlyRateAverage.toFixed(2)),
    },
    {
      name: 'Actual Rate',
      value: parseFloat(data.actualRateAverage.toFixed(2)),
      average: parseFloat(data.actualRateAverage.toFixed(2)),
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
    <div className="bar-graph-container" onClick={onNavigateToMonthly}>
      <div className="stats-panel">
        <div className="stat-box">
          <h3>Monthly Rate</h3>
          <p className="stat-value">${data.monthlyRateAverage.toFixed(2)}</p>
          <p className="stat-label">Average</p>
          <p className="stat-detail">Total: ${data.monthlyRateTotal.toFixed(2)}</p>
          <p className="stat-detail">Count: {data.monthlyRateCount}</p>
        </div>

        <div className="stat-box">
          <h3>Actual Rate</h3>
          <p className="stat-value">${data.actualRateAverage.toFixed(2)}</p>
          <p className="stat-label">Average</p>
          <p className="stat-detail">Total: ${data.actualRateTotal.toFixed(2)}</p>
          <p className="stat-detail">Count: {data.actualRateCount}</p>
        </div>
      </div>

      <div className="graph-section">
        <h2>Comparison Graph</h2>
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
            <Bar dataKey="average" name="Average Rate" fill="#667eea" radius={[8, 8, 0, 0]}>
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
          <div className="legend-color" style={{ backgroundColor: '#667eea' }}></div>
          <span>Monthly Rate Average</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f5576c' }}></div>
          <span>Actual Rate Average</span>
        </div>
      </div>
    </div>
  )
}

export default BarGraph
