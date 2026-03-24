/**
 * Missing Classification Alerts Loader
 * Finds rows with empty Classification values
 * Allows editing and saving back to Excel
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
 * @returns {Promise<Object>} - Parsed data with workbook info
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

    return { jsonData, workbook, sheetName, worksheet, XLSX }
  } catch (error) {
    console.error('✗ Error parsing Excel data:', error.message)
    throw new Error(`Cannot parse Excel file: ${error.message}`)
  }
}

/**
 * Find rows with missing Classification values
 * @param {Array} jsonData - Parsed Excel data
 * @returns {Object} - Missing classification alerts data
 */
function findMissingClassifications(jsonData) {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('No data found in Excel file')
  }

  const firstRow = jsonData[0]
  const columnKeys = Object.keys(firstRow)

  // Find Classification column
  let classificationKey = null

  columnKeys.forEach(key => {
    const lowerKey = key.toLowerCase().trim()
    if (lowerKey.includes('classification')) {
      classificationKey = key
    }
  })

  if (!classificationKey) {
    throw new Error(`Column "Classification" not found. Available columns: ${columnKeys.join(', ')}`)
  }

  // Find rows with missing classification
  const missingRows = []

  jsonData.forEach((row, rowIndex) => {
    const classification = row[classificationKey]
    
    // Check if classification is empty, null, undefined, or whitespace
    if (!classification || 
        String(classification).trim() === '' || 
        String(classification).toLowerCase() === 'undefined' ||
        String(classification).toLowerCase() === 'null') {
      
      missingRows.push({
        rowIndex: rowIndex,
        originalIndex: rowIndex + 2, // +2 because row 1 is header, rowIndex starts at 0
        rowData: { ...row },
        classificationKey: classificationKey,
      })
    }
  })

  return {
    missingRows,
    totalRows: jsonData.length,
    missingCount: missingRows.length,
    classificationKey,
  }
}

/**
 * Main function: Load and process missing classifications
 * @returns {Promise<Object>} - Missing classifications data
 */
export async function loadMissingClassificationsData() {
  try {
    console.log('📊 Starting Missing Classifications data processing...')
    
    // Step 1: Load Excel file
    const arrayBuffer = await loadExcelFile()
    
    // Step 2: Parse Excel data
    const { jsonData, workbook, sheetName, worksheet, XLSX } = await parseExcelData(arrayBuffer)
    
    // Step 3: Find missing classifications
    const processedData = findMissingClassifications(jsonData)
    
    console.log('✅ Missing Classifications processing completed')
    console.log(`  Total rows: ${processedData.totalRows}`)
    console.log(`  Missing classifications: ${processedData.missingCount}`)
    
    return {
      ...processedData,
      jsonData, // Store original data for updating
      workbook,
      sheetName,
      worksheet,
      XLSX,
      arrayBuffer,
    }
  } catch (error) {
    console.error('❌ Missing Classifications processing failed:', error.message)
    throw error
  }
}

/**
 * Save updated data back to Excel file
 * @param {Object} updateData - Data to save
 * @returns {Promise<void>}
 */
export async function saveMissingClassificationsToExcel(updateData) {
  try {
    console.log('💾 Saving changes to Excel...')
    
    const { jsonData, workbook, sheetName, XLSX, classificationKey, updatedRows } = updateData
    
    // Validate required data
    if (!jsonData || !Array.isArray(jsonData)) {
      throw new Error('Invalid jsonData provided')
    }
    
    if (!workbook || !sheetName) {
      throw new Error('Invalid workbook or sheetName provided')
    }
    
    if (!XLSX) {
      throw new Error('XLSX library not provided')
    }
    
    if (!classificationKey) {
      throw new Error('classificationKey not provided')
    }
    
    if (!Array.isArray(updatedRows)) {
      throw new Error('updatedRows must be an array')
    }
    
    // Update the jsonData with new classification values
    updatedRows.forEach(({ rowIndex, newClassification }) => {
      if (jsonData[rowIndex]) {
        jsonData[rowIndex][classificationKey] = newClassification
      } else {
        console.warn(`Warning: Row index ${rowIndex} not found in jsonData`)
      }
    })
    
    // Convert back to worksheet
    const newWorksheet = XLSX.utils.json_to_sheet(jsonData)
    workbook.Sheets[sheetName] = newWorksheet
    
    // Write to array buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    
    // Convert to base64 for transmission
    let binaryString = ''
    const bytes = new Uint8Array(wbout)
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i])
    }
    const base64Data = btoa(binaryString)
    
    // Send to backend to save to disk
    const response = await fetch('/api/save-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workbookData: base64Data,
        fileName: 'Combined-H&M 1 1.xlsx'
      })
    })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      let errorMessage = 'Failed to save file on server'
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = `Server error: ${response.statusText}`
        }
      } else {
        const text = await response.text()
        errorMessage = text || `Server error: ${response.statusText}`
      }
      
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('✅ Changes saved successfully!', result)
    
    return true
  } catch (error) {
    console.error('❌ Error saving to Excel:', error.message)
    throw new Error(`Cannot save changes to Excel: ${error.message}`)
  }
}
