/**
 * Excel File Loader and Data Processor
 * Connects to the Excel file: Combined-Main.xlsx
 * Processes Monthly Rate ($) and Actual Rate($) columns
 */

const EXCEL_FILE_PATH = '/Combined-Main.xlsx'

/**
 * Load Excel file from public directory
 * @returns {Promise<ArrayBuffer>} - Excel file as ArrayBuffer
 */
async function loadExcelFile() {
  try {
    const response = await fetch(EXCEL_FILE_PATH)
    
    if (!response.ok) {
      throw new Error(`Failed to load Excel file: ${response.statusText}`)
    }

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    
    console.log('✓ Excel file loaded successfully from:', EXCEL_FILE_PATH)
    console.log('  File size:', (arrayBuffer.byteLength / 1024).toFixed(2), 'KB')
    
    return arrayBuffer
  } catch (error) {
    console.error('✗ Error loading Excel file:', error.message)
    throw new Error(`Cannot load Excel file from ${EXCEL_FILE_PATH}: ${error.message}`)
  }
}

/**
 * Parse Excel file data using XLSX library
 * @param {ArrayBuffer} arrayBuffer - Excel file as ArrayBuffer
 * @returns {Promise<Array>} - Parsed data as JSON array
 */
async function parseExcelData(arrayBuffer) {
  try {
    // Dynamically import XLSX library
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule

    // Read workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    
    if (!sheetName) {
      throw new Error('No sheets found in Excel file')
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log('✓ Excel data parsed successfully')
    console.log('  Sheet name:', sheetName)
    console.log('  Total rows:', jsonData.length)
    console.log('  Columns:', Object.keys(jsonData[0] || {}).join(', '))
    console.log('📄 First row sample data:')
    Object.entries(jsonData[0] || {}).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`)
    })

    return jsonData
  } catch (error) {
    console.error('✗ Error parsing Excel data:', error.message)
    throw new Error(`Cannot parse Excel file: ${error.message}`)
  }
}

/**
 * Calculate averages from Excel data
 * Finds "Monthly Rate ($)" and "Actual Rate($)" columns dynamically
 * @param {Array} jsonData - Parsed Excel data
 * @returns {Object} - Calculated averages and statistics
 */
function calculateAverages(jsonData) {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('No data found in Excel file')
  }

  let monthlyRateSum = 0
  let actualRateSum = 0
  let monthlyRateCount = 0
  let actualRateCount = 0
  let monthlyRateKey = null
  let actualRateKey = null

  // Find column headers on first row
  const firstRow = jsonData[0]
  const columnKeys = Object.keys(firstRow)

  console.log('📋 All available columns in Excel:')
  columnKeys.forEach((key, index) => {
    console.log(`  ${index + 1}. "${key}"`)
  })

  // Try multiple matching strategies
  columnKeys.forEach(key => {
    const lowerKey = key.toLowerCase().trim()
    const normalizedKey = lowerKey.replace(/[^a-z0-9]/g, '')
    
    // Match "Monthly Rate ($)" column - try various formats
    if (
      (lowerKey.includes('monthly') && lowerKey.includes('rate')) ||
      (normalizedKey.includes('monthly') && normalizedKey.includes('rate'))
    ) {
      monthlyRateKey = key
      console.log('  ✓ Found Monthly Rate column:', key)
    }
    
    // Match "Actual Rate($)" column - try various formats
    if (
      (lowerKey.includes('actual') && lowerKey.includes('rate')) ||
      (normalizedKey.includes('actual') && normalizedKey.includes('rate'))
    ) {
      actualRateKey = key
      console.log('  ✓ Found Actual Rate column:', key)
    }
  })

  // Prefer 'Projected Rate($)' if available, otherwise try to match 'Monthly Rate'
  if (columnKeys.includes('Projected Rate($)')) {
    monthlyRateKey = 'Projected Rate($)'
    console.log('  ✓ Found Projected Rate($) column, using it for Monthly Rate')
  } else {
    // Fallback: try to match any column with monthly+rate
    columnKeys.forEach(key => {
      const lowerKey = key.toLowerCase().trim()
      const normalizedKey = lowerKey.replace(/[^a-z0-9]/g, '')
      if (
        (lowerKey.includes('monthly') && lowerKey.includes('rate')) ||
        (normalizedKey.includes('monthly') && normalizedKey.includes('rate'))
      ) {
        monthlyRateKey = key
        console.log('  ✓ Found Monthly Rate column:', key)
      }
    })
  }

  // For actual rate, try to match 'Actual Rate' or 'Actual Rate($)' or 'Actual'
  if (!actualRateKey) {
    if (columnKeys.includes('Actual Rate')) {
      actualRateKey = 'Actual Rate'
      console.log('  ✓ Found Actual Rate column')
    } else if (columnKeys.includes('Actual Rate($)')) {
      actualRateKey = 'Actual Rate($)'
      console.log('  ✓ Found Actual Rate($) column')
    } else if (columnKeys.includes('Actual')) {
      actualRateKey = 'Actual'
      console.log('  ✓ Found Actual column')
    }
  }

  if (!monthlyRateKey) {
    throw new Error(`Column "Projected Rate($)" or "Monthly Rate ($)" not found. Available columns: ${columnKeys.join(', ')}`)
  }
  if (!actualRateKey) {
    throw new Error(`Column "Actual Rate($)" or "Actual Rate" or "Actual" not found. Available columns: ${columnKeys.join(', ')}`)
  }

  console.log('✓ Column mapping:')
  console.log('  Monthly Rate found as:', monthlyRateKey)
  console.log('  Actual Rate found as:', actualRateKey)

  // Process each row
  jsonData.forEach((row, index) => {
    try {
      // Process Monthly Rate
      if (monthlyRateKey && row[monthlyRateKey] !== undefined && row[monthlyRateKey] !== null && row[monthlyRateKey] !== '') {
        // Remove $ symbol and any commas, then convert to number
        let valueStr = String(row[monthlyRateKey]).replace(/[$,\s]/g, '').trim()
        const value = parseFloat(valueStr)
        if (!isNaN(value) && isFinite(value) && value !== 0) {
          monthlyRateSum += value
          monthlyRateCount++
        }
      }

      // Process Actual Rate
      if (actualRateKey && row[actualRateKey] !== undefined && row[actualRateKey] !== null && row[actualRateKey] !== '') {
        // Remove $ symbol and any commas, then convert to number
        let valueStr = String(row[actualRateKey]).replace(/[$,\s]/g, '').trim()
        const value = parseFloat(valueStr)
        if (!isNaN(value) && isFinite(value) && value !== 0) {
          actualRateSum += value
          actualRateCount++
        }
      }
    } catch (error) {
      console.warn(`Warning: Error processing row ${index}:`, error.message)
    }
  })

  console.log('📊 Data processing results:')
  console.log('  Monthly Rate entries found:', monthlyRateCount)
  console.log('  Actual Rate entries found:', actualRateCount)
  console.log('  Monthly Rate total sum:', monthlyRateSum)
  console.log('  Actual Rate total sum:', actualRateSum)

  if (monthlyRateCount === 0 && actualRateCount === 0) {
    throw new Error('No valid data found in rate columns. Check that the Excel file contains numeric values.')
  }

  if (monthlyRateCount === 0) {
    console.warn('⚠️  Warning: No valid Monthly Rate data found')
  }

  if (actualRateCount === 0) {
    console.warn('⚠️  Warning: No valid Actual Rate data found')
  }

  const result = {
    monthlyRateAverage: monthlyRateCount > 0 ? monthlyRateSum / monthlyRateCount : 0,
    actualRateAverage: actualRateCount > 0 ? actualRateSum / actualRateCount : 0,
    monthlyRateTotal: monthlyRateSum,
    actualRateTotal: actualRateSum,
    monthlyRateCount,
    actualRateCount,
    rows: jsonData,
  }

  console.log('✓ Averages calculated:')
  console.log('  Monthly Rate Average:', result.monthlyRateAverage.toFixed(2))
  console.log('  Actual Rate Average:', result.actualRateAverage.toFixed(2))
  console.log('  Monthly Rate Total:', result.monthlyRateTotal.toFixed(2))
  console.log('  Actual Rate Total:', result.actualRateTotal.toFixed(2))
  console.log('✅ CRITICAL: Result object now includes rows:', result.rows.length, 'records')

  return result
}

/**
 * Main function: Load, parse, and process Excel data
 * @returns {Promise<Object>} - Processed data with averages
 */
export async function loadAndProcessExcelData() {
  try {
    console.log('📊 Starting Excel data processing...')
    
    // Step 1: Load Excel file
    const arrayBuffer = await loadExcelFile()
    
    // Step 2: Parse Excel data
    const jsonData = await parseExcelData(arrayBuffer)
    
    // Step 3: Calculate averages
    const processedData = calculateAverages(jsonData)
    
    console.log('✅ Excel processing completed successfully\n')
    
    return processedData
  } catch (error) {
    console.error('❌ Excel processing failed:', error.message)
    throw error
  }
}
