import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import HomeMarketingChart from './HomeMarketingChart'
import './ResourceFlags.css'

function ResourceFlags({ data, onNavigateToResourceFlags }) {

  // Transform data for Recharts PieChart
  const pieData = data.pieChartData.labels.map((label, index) => ({
    name: label,
    value: data.pieChartData.values[index],
  }))

  // Calculate total for percentage calculation
  const total = pieData.reduce((sum, item) => sum + item.value, 0)

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const { name, value } = payload[0]
      const percentage = ((value / total) * 100).toFixed(1)
      return (
        <div className="custom-tooltip">
          <p style={{ fontWeight: 'bold' }}>{name}</p>
          <p>{value} users</p>
          <p>{percentage}%</p>
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
