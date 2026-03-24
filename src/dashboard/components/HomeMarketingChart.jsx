import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './HomeMarketingChart.css'

function HomeMarketingChart() {
  // Chart data with months and performance values (0-500 range)
  const chartData = [
    { month: 'Jan', performance: 120 },
    { month: 'Feb', performance: 180 },
    { month: 'Mar', performance: 240 },
    { month: 'Apr', performance: 0 },
    { month: 'May', performance: 0 },
    { month: 'Jun', performance: 0 },
    { month: 'Jul', performance: 0 },
    { month: 'Aug', performance: 0 },
    
  ]

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-month">{payload[0].payload.month}</p>
          <p className="tooltip-value">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="home-marketing-chart">
      <h2 className="chart-title">H & M Tower Performance</h2>
      
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.1} />
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
            />
            
            <YAxis
              domain={[0, 500]}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="performance"
              stroke="#dc2626"
              strokeWidth={3}
              fill="url(#colorPerformance)"
              dot={{
                fill: '#dc2626',
                r: 5,
              }}
              activeDot={{
                r: 7,
                fill: '#dc2626',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default HomeMarketingChart
