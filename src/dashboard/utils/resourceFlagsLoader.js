/**
 * Resource Flags Loader
 * Processes Classification column data and creates pie chart data
 * Filters for Premium and Expert users only
 */

const EXCEL_FILE_PATH = '/Combined-Input.xlsx'

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
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule

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
 * Process resource flags data
 * Extracts Classification data and filters for Premium/Expert only
 * @param {Array} jsonData - Parsed Excel data
 * @returns {Object} - Processed resource flags data
 */
function processResourceFlagsData(jsonData) {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('No data found in Excel file')
  }

  const firstRow = jsonData[0]
  const columnKeys = Object.keys(firstRow)

  // Find column headers
  let empIdKey = null
  let classificationKey = null

  columnKeys.forEach(key => {
    const lowerKey = key.toLowerCase().trim()
    
    // Match EmpID column
    if (lowerKey.includes('empid') || lowerKey.includes('emp id') || lowerKey.includes('employee id')) {
      empIdKey = key
    }
    
    // Match Classification column
    if (lowerKey.includes('classification')) {
      classificationKey = key
    }
  })

  if (!empIdKey) {
    throw new Error(`Column "EmpID" not found. Available columns: ${columnKeys.join(', ')}`)
  }
  
  if (!classificationKey) {
    throw new Error(`Column "Classification" not found. Available columns: ${columnKeys.join(', ')}`)
  }

  // Process data and filter for Premium/Expert
  const classificationCounts = {}
  const employeesByClassification = {}
  const allEmployees = []

  jsonData.forEach((row, index) => {
    try {
      const empId = String(row[empIdKey]).trim()
      const classification = String(row[classificationKey]).trim()
      
      if (!empId || empId === '' || empId === 'undefined') {
        return // Skip empty EmpID rows
      }

      if (!classification || classification === '' || classification === 'undefined') {
        return // Skip empty classification rows
      }

      // Store all employees for search
      allEmployees.push({
        empId: empId,
        classification: classification,
      })

      // Count classifications
      if (classificationCounts[classification]) {
        classificationCounts[classification]++
      } else {
        classificationCounts[classification] = 1
      }

      // Group employees by classification
      if (!employeesByClassification[classification]) {
        employeesByClassification[classification] = []
      }
      employeesByClassification[classification].push(empId)
    } catch (error) {
      console.warn(`Warning: Error processing row ${index}:`, error.message)
    }
  })

  // Filter for Premium and Expert only
  const filteredClassifications = {}
  const filteredEmployees = {}

  Object.entries(classificationCounts).forEach(([classification, count]) => {
    const lowerClassification = classification.toLowerCase()
    if (lowerClassification.includes('premium') || lowerClassification.includes('expert')) {
      filteredClassifications[classification] = count
      filteredEmployees[classification] = employeesByClassification[classification] || []
    }
  })

  if (Object.keys(filteredClassifications).length === 0) {
    throw new Error('No Premium or Expert classification data found')
  }

  // Prepare pie chart data
  const pieChartData = {
    labels: Object.keys(filteredClassifications),
    values: Object.values(filteredClassifications),
    colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  }

  return {
    pieChartData,
    allEmployees: allEmployees.sort((a, b) => {
      const aNum = parseInt(a.empId)
      const bNum = parseInt(b.empId)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      return a.empId.localeCompare(b.empId)
    }),
    classificationSummary: filteredClassifications,
    totalPremiumExpertCount: Object.values(filteredClassifications).reduce((a, b) => a + b, 0),
  }
}

/**
 * Main function: Load and process resource flags data
 * @returns {Promise<Object>} - Processed resource flags data
 */
export async function loadResourceFlagsData() {
  try {
    console.log('📊 Starting Resource Flags data processing...')
    
    // Step 1: Load Excel file
    const arrayBuffer = await loadExcelFile()
    
    // Step 2: Parse Excel data
    const jsonData = await parseExcelData(arrayBuffer)
    
    // Step 3: Process resource flags data
    const processedData = processResourceFlagsData(jsonData)
    
    console.log('✅ Resource Flags processing completed successfully')
    console.log(`  Total Premium/Expert users: ${processedData.totalPremiumExpertCount}`)
    console.log(`  Classifications found:`, processedData.classificationSummary)
    
    return processedData
  } catch (error) {
    console.error('❌ Resource Flags processing failed:', error.message)
    throw error
  }
}
