/**
 * Individual Monthly Burn Loader
 * Processes per-employee Monthly Rate ($) vs Actual Rate($) comparison
 */

const EXCEL_FILE_PATH = '/Combined-H&M 1 1.xlsx'

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

    return jsonData
  } catch (error) {
    console.error('✗ Error parsing Excel data:', error.message)
    throw new Error(`Cannot parse Excel file: ${error.message}`)
  }
}

/**
 * Process individual employee data
 * Groups data by EmpID and calculates rates for each employee
 * @param {Array} jsonData - Parsed Excel data
 * @returns {Object} - Processed individual employee data
 */
function processIndividualData(jsonData) {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('No data found in Excel file')
  }

  const firstRow = jsonData[0]
  const columnKeys = Object.keys(firstRow)

  // Find column headers
  let empIdKey = null
  let monthlyRateKey = null
  let actualRateKey = null

  columnKeys.forEach(key => {
    const lowerKey = key.toLowerCase().trim()
    const normalizedKey = lowerKey.replace(/[^a-z0-9]/g, '')
    
    // Match EmpID column
    if (lowerKey.includes('empid') || lowerKey.includes('emp id') || lowerKey.includes('employee id') || normalizedKey === 'empid') {
      empIdKey = key
    }
    
    // Match Monthly Rate column
    if (lowerKey.includes('monthly') && lowerKey.includes('rate')) {
      monthlyRateKey = key
    }
    
    // Match Actual Rate column
    if (lowerKey.includes('actual') && lowerKey.includes('rate')) {
      actualRateKey = key
    }
  })

  if (!empIdKey) {
    throw new Error(`Column "EmpID" not found. Available columns: ${columnKeys.join(', ')}`)
  }
  
  if (!monthlyRateKey) {
    throw new Error(`Column "Monthly Rate ($)" not found. Available columns: ${columnKeys.join(', ')}`)
  }
  
  if (!actualRateKey) {
    throw new Error(`Column "Actual Rate($)" not found. Available columns: ${columnKeys.join(', ')}`)
  }

  // Group data by EmpID
  const employeeMap = {}

  jsonData.forEach((row, index) => {
    try {
      const empId = String(row[empIdKey]).trim()
      
      if (!empId || empId === '' || empId === 'undefined') {
        return // Skip empty EmpID rows
      }

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          empId: empId,
          monthlyRateSum: 0,
          actualRateSum: 0,
          monthlyRateCount: 0,
          actualRateCount: 0,
        }
      }

      // Process Monthly Rate
      if (monthlyRateKey && row[monthlyRateKey] !== undefined && row[monthlyRateKey] !== null && row[monthlyRateKey] !== '') {
        let valueStr = String(row[monthlyRateKey]).replace(/[$,\s]/g, '').trim()
        const value = parseFloat(valueStr)
        if (!isNaN(value) && isFinite(value)) {
          employeeMap[empId].monthlyRateSum += value
          employeeMap[empId].monthlyRateCount++
        }
      }

      // Process Actual Rate
      if (actualRateKey && row[actualRateKey] !== undefined && row[actualRateKey] !== null && row[actualRateKey] !== '') {
        let valueStr = String(row[actualRateKey]).replace(/[$,\s]/g, '').trim()
        const value = parseFloat(valueStr)
        if (!isNaN(value) && isFinite(value)) {
          employeeMap[empId].actualRateSum += value
          employeeMap[empId].actualRateCount++
        }
      }
    } catch (error) {
      console.warn(`Warning: Error processing row ${index}:`, error.message)
    }
  })

  // Calculate averages for each employee
  const employees = Object.values(employeeMap)
    .map(emp => ({
      empId: emp.empId,
      monthlyRateAverage: emp.monthlyRateCount > 0 ? emp.monthlyRateSum / emp.monthlyRateCount : 0,
      actualRateAverage: emp.actualRateCount > 0 ? emp.actualRateSum / emp.actualRateCount : 0,
      monthlyRateTotal: emp.monthlyRateSum,
      actualRateTotal: emp.actualRateSum,
      monthlyRateCount: emp.monthlyRateCount,
      actualRateCount: emp.actualRateCount,
    }))
    .sort((a, b) => {
      // Sort by EmpID (numeric if possible)
      const aNum = parseInt(a.empId)
      const bNum = parseInt(b.empId)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      return a.empId.localeCompare(b.empId)
    })

  if (employees.length === 0) {
    throw new Error('No valid employee data found in Excel file')
  }

  return {
    employees: employees,
    totalEmployees: employees.length,
  }
}

/**
 * Main function: Load and process individual employee data
 * @returns {Promise<Object>} - Processed individual employee data
 */
export async function loadIndividualBurnData() {
  try {
    console.log('📊 Starting Individual Burn data processing...')
    
    // Step 1: Load Excel file
    const arrayBuffer = await loadExcelFile()
    
    // Step 2: Parse Excel data
    const jsonData = await parseExcelData(arrayBuffer)
    
    // Step 3: Process individual data
    const processedData = processIndividualData(jsonData)
    
    console.log('✅ Individual Burn processing completed successfully')
    console.log(`  Total employees: ${processedData.totalEmployees}`)
    
    return processedData
  } catch (error) {
    console.error('❌ Individual Burn processing failed:', error.message)
    throw error
  }
}
