import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import './BarGraph.css'

function getRegionTotals(rows, type = 'projected') {
  if (!rows || !Array.isArray(rows)) {
    console.warn('❌ No rows available for country totals calculation')
    return { india: 0, us: 0, indiaAvg: 0, usAvg: 0 }
  }
  
  console.log(`📊 Calculating ${type} rate totals from ${rows.length} rows`)
  
  // First, let's detect the actual column names from the first row
  let projectedRateKey = null
  let actualRateKey = null
  let countryKey = null
  
  if (rows.length > 0) {
    const firstRow = rows[0]
    const columnKeys = Object.keys(firstRow)
    
    console.log('📋 Available columns:', columnKeys)
    console.log('📋 First row data sample:', firstRow)
    
    // Find Country column - MUST be exact match for "Country"
    countryKey = columnKeys.find(key => 
      key.toLowerCase().trim() === 'country'
    )
    
    // Only fallback to location if Country doesn't exist
    if (!countryKey) {
      countryKey = columnKeys.find(key => 
        key.toLowerCase().trim() === 'location'
      )
    }
    
    // Find Baseline Rate column
    projectedRateKey = columnKeys.find(key => {
      const lower = key.toLowerCase().trim()
      return (lower.includes('projected') && lower.includes('rate')) ||
             (lower.includes('monthly') && lower.includes('rate'))
    })
    
    // Find Monthly Burn Rate column
    actualRateKey = columnKeys.find(key => {
      const lower = key.toLowerCase().trim()
      return lower.includes('actual') && lower.includes('rate')
    })
    
    console.log(`✓ Detected columns:`)
    console.log(`  - Country: "${countryKey}"`)
    console.log(`  - Baseline Rate: "${projectedRateKey}"`)
    console.log(`  - Monthly Burn Rate: "${actualRateKey}"`)
  }
  
  let india = 0, us = 0
  let indiaCount = 0, usCount = 0
  let countrySamples = []
  let allCountries = []
  
  rows.forEach((row, idx) => {
    const country = countryKey ? (row[countryKey] || '').toString().toLowerCase().trim() : ''
    let value = 0
    
    // Collect all unique country values for debugging
    if (!allCountries.includes(country) && country) {
      allCountries.push(country)
    }
    
    // Collect first few country samples for debugging
    if (countrySamples.length < 5 && country) {
      countrySamples.push(country)
    }
    
    if (type === 'projected') {
      const rawValue = projectedRateKey ? row[projectedRateKey] : (row['Baseline Rate($)'] || row['Baseline Rate'] || row['Monthly Rate'] || '')
      value = parseFloat(String(rawValue).replace(/[$,\s]/g, ''))
      if (idx < 5) console.log(`  Raw Projected: "${rawValue}" → Parsed: ${value}`)
    } else {
      const rawValue = actualRateKey ? row[actualRateKey] : (row['Monthly Burn Rate'] || row['Monthly Burn Rate($)'] || row['Actual'] || '')
      value = parseFloat(String(rawValue).replace(/[$,\s]/g, ''))
      if (idx < 5) console.log(`  Raw Actual: "${rawValue}" → Parsed: ${value}`)
    }
    
    if (!isNaN(value) && value > 0) {
      // Debug: log every country value we see
      if (idx < 5) {
        console.log(`Row ${idx}: Raw country="${row[countryKey]}" | Lowercased="${country}" | Length=${country.length} | Charcode=[${Array.from(country).map(c => c.charCodeAt(0)).join(',')}]`)
        console.log(`  Value: $${value}`)
      }
      
      // Trim and check for any hidden characters
      const countryTrimmed = country.replace(/\s+/g, ' ').trim()
      
      // Match INDIA - exact and flexible matching
      const isIndia = country === 'india' || 
                      countryTrimmed === 'india' ||
                      country === 'in' || 
                      country === 'ind' || 
                      country.includes('india') ||
                      country.startsWith('india');
      
      // Match USA - exact and flexible matching with all variations
      const isUSA = country === 'usa' || 
                    countryTrimmed === 'usa' ||
                    country === 'us' || 
                    country === 'u.s.a' || 
                    country === 'u.s.' || 
                    country === 'america' ||
                    country === 'american' ||
                    country === 'united states' ||
                    country === 'united states of america' ||
                    country.includes('usa') ||
                    (country.includes('us') && !country.includes('india')) ||
                    country.startsWith('usa') || 
                    country.startsWith('us ') ||
                    country.startsWith('united');
      
      if (isIndia) {
        india += value
        indiaCount++
        if (idx < 20) console.log(`✓ Matched INDIA: "${row[countryKey]}" (normalized: "${countryTrimmed}") = $${value}`)
      } else if (isUSA) {
        us += value
        usCount++
        if (idx < 20) console.log(`✓ Matched USA: "${row[countryKey]}" (normalized: "${countryTrimmed}") = $${value}`)
      } else {
        // Log unmatched countries with value > 0
        if (idx < 20) {
          console.log(`⚠️ UNMATCHED: country="${country}" | normalized="${countryTrimmed}" | original="${row[countryKey]}" | value=$${value}`)
        }
      }
    }
  })
  
  const indiaAvg = indiaCount > 0 ? india / indiaCount : 0
  const usAvg = usCount > 0 ? us / usCount : 0
  
  console.log(`📍 Country samples from data:`, countrySamples)
  console.log(`📋 ALL unique countries found:`, allCountries)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✓ INDIA TOTAL: ${indiaCount} records = $${india.toFixed(2)} | AVERAGE: $${indiaAvg.toFixed(2)}`)
  console.log(`✓ USA TOTAL: ${usCount} records = $${us.toFixed(2)} | AVERAGE: $${usAvg.toFixed(2)}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  
  return { india, us, indiaAvg, usAvg }
}

function UnifiedTooltip({ visible, x, y, name, value, indiaAvg, usAvg, isChart = false }) {
  if (!visible && !isChart) return null
  
  // Calculate smart positioning to avoid going off-screen
  const tooltipWidth = 260
  const tooltipHeight = 140
  const offset = 15
  
  let tooltipX = x + offset
  let tooltipY = y + offset
  
  // Prevent tooltip from going off the right edge
  if (tooltipX + tooltipWidth > window.innerWidth) {
    tooltipX = x - tooltipWidth - offset
  }
  
  // Prevent tooltip from going off the bottom edge
  if (tooltipY + tooltipHeight > window.innerHeight) {
    tooltipY = y - tooltipHeight - offset
  }
  
  // Prevent tooltip from going off the left edge
  if (tooltipX < 0) {
    tooltipX = 10
  }
  
  // Prevent tooltip from going off the top edge
  if (tooltipY < 0) {
    tooltipY = 10
  }

  const tooltipContent = (
    <div
      className="unified-tooltip"
      style={{
        position: 'fixed',
        left: `${tooltipX}px`,
        top: `${tooltipY}px`,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        padding: '12px 16px',
        zIndex: 9999,
        pointerEvents: isChart ? 'auto' : 'none',
        minWidth: 240,
        transition: 'all 0.15s ease-out',
      }}
    >
      <p className="label" style={{ fontWeight: 600, marginBottom: 10, fontSize: 14, margin: 0 }}>
        {name}
      </p>
      <p className="value" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #eee', margin: 0, padding: '0 0 8px 0' }}>
        <b>${value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b> (Overall Average)
      </p>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#667eea' }}>
        India Average
      </div>
      <p style={{ fontSize: 13, margin: '0 0 8px 0' }}>
        <b>${indiaAvg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
      </p>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#f5576c' }}>
        USA Average
      </div>
      <p style={{ fontSize: 13, margin: 0 }}>
        <b>${usAvg?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b>
      </p>
    </div>
  )

  // For chart tooltips, render directly. For stats tooltips, use portal to render at body level
  if (isChart) {
    return tooltipContent
  }

  return createPortal(tooltipContent, document.body)
}

function BarGraph({ data, onNavigateToMonthly }) {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    name: '',
    value: 0,
    indiaAvg: 0,
    usAvg: 0,
  })

  // Debug: Check if data.rows exists
  console.log('🔍 BarGraph component rendered with data:', {
    monthlyRateAverage: data?.monthlyRateAverage,
    actualRateAverage: data?.actualRateAverage,
    hasRows: !!data?.rows,
    rowsLength: data?.rows?.length || 0,
    dataKeys: data ? Object.keys(data) : []
  });

  if (data && data.rows) {
    console.log('✓ BarGraph received data with rows:', data.rows.length)
    if (data.rows.length > 0) {
      console.log('📊 First row complete data:')
      const firstRow = data.rows[0]
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`  "${key}": "${value}" (type: ${typeof value})`)
      })
    }
  } else {
    console.warn('❌ BarGraph data.rows is missing')
    console.warn('Data object keys:', data ? Object.keys(data) : 'data is undefined')
  }

  // Prepare data for Recharts
  const chartData = [
    {
      name: 'Baseline Rate',
      value: parseFloat(data.monthlyRateAverage.toFixed(2)),
      average: parseFloat(data.monthlyRateAverage.toFixed(2)),
    },
    {
      name: 'Monthly Burn Rate',
      value: parseFloat(data.actualRateAverage.toFixed(2)),
      average: parseFloat(data.actualRateAverage.toFixed(2)),
    },
  ]

  const colors = ['#667eea', '#f5576c']
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataType = payload[0].payload.name.includes('Baseline') ? 'projected' : 'actual'
      const regionTotals = getRegionTotals(data.rows, dataType)
      
      return (
        <UnifiedTooltip
          visible={true}
          isChart={true}
          name={payload[0].payload.name}
          value={payload[0].value}
          indiaAvg={regionTotals.indiaAvg}
          usAvg={regionTotals.usAvg}
        />
      )
    }
    return null
  }

  return (
    <div className="bar-graph-container" onClick={onNavigateToMonthly}>
      <div className="stats-panel">        <div
          className="stat-box"
          onMouseEnter={e => {
            console.log('🖱️ Baseline Rate hover - data.rows:', data.rows ? data.rows.length : 'missing')
            const regionTotals = getRegionTotals(data.rows, 'projected')
            console.log('📊 Region totals for projected:', regionTotals)
            const rect = e.currentTarget.getBoundingClientRect()
            // Position tooltip to the right of the stat box
            setTooltip({
              visible: true,
              x: rect.right,
              y: rect.top + (rect.height / 2),
              name: 'Baseline Rate',
              value: data.monthlyRateAverage,
              indiaAvg: regionTotals.indiaAvg,
              usAvg: regionTotals.usAvg,
            })
          }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            setTooltip(t => ({ ...t, x: rect.right, y: rect.top + (rect.height / 2) }))
          }}
          onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
          style={{ position: 'relative' }}
        >
          <h3>Baseline Rate</h3>
          <p className="stat-value">${data.monthlyRateTotal.toFixed(2)}</p>
          <p className="stat-label">Total</p>
         {/* <p className="stat-detail">Average:${data.monthlyRateAverage.toFixed(2)} </p>*/}
          <p className="stat-detail">Count: {data.monthlyRateCount}</p>
        </div>        <div
          className="stat-box"
          onMouseEnter={e => {
            console.log('🖱️ Monthly Burn Rate hover - data.rows:', data.rows ? data.rows.length : 'missing')
            const regionTotals = getRegionTotals(data.rows, 'actual')
            console.log('📊 Region totals for actual:', regionTotals)
            const rect = e.currentTarget.getBoundingClientRect()
            // Position tooltip to the right of the stat box
            setTooltip({
              visible: true,
              x: rect.right,
              y: rect.top + (rect.height / 2),
              name: 'Monthly Burn Rate',
              value: data.actualRateAverage,
              indiaAvg: regionTotals.indiaAvg,
              usAvg: regionTotals.usAvg,
            })
          }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            setTooltip(t => ({ ...t, x: rect.right, y: rect.top + (rect.height / 2) }))
          }}
          onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
          style={{ position: 'relative' }}
        >
          <h3>Monthly Burn Rate</h3>
          <p className="stat-value"> ${data.actualRateTotal.toFixed(2)}</p>
          <p className="stat-label">Total</p>
         {/* <p className="stat-detail">Average:${data.actualRateAverage.toFixed(2)}</p>*/}
          <p className="stat-detail">Count: {data.actualRateCount}</p>
        </div>
        <UnifiedTooltip {...tooltip} />
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
          <span>Baseline Rate Average</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f5576c' }}></div>
          <span>Monthly Burn Rate Average</span>
        </div>
      </div>
    </div>
  )
}

export default BarGraph
