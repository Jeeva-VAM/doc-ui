import React, { useState } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const JsonForm = ({ jsonData, setJsonData, onFieldClick }) => {
  const [viewMode, setViewMode] = useState('form') // 'form' or 'json'
  const handleExportJson = () => {
    const dataStr = JSON.stringify(jsonData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = 'extracted-data.json'

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    toast.success('JSON exported successfully!')
  }

  const handleExportExcel = () => {
    try {
      // Flatten the JSON data for Excel export
      const flattenObject = (obj, prefix = '') => {
        let flattened = {}
        
        for (let key in obj) {
          if (obj.hasOwnProperty(key)) {
            let newKey = prefix ? `${prefix}.${key}` : key
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              Object.assign(flattened, flattenObject(obj[key], newKey))
            } else if (Array.isArray(obj[key])) {
              // For arrays, create separate rows or flatten as comma-separated values
              flattened[newKey] = obj[key].join(', ')
            } else {
              flattened[newKey] = obj[key]
            }
          }
        }
        
        return flattened
      }

      const flattenedData = flattenObject(jsonData)
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet([flattenedData])
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data')
      
      // Generate Excel file
      XLSX.writeFile(wb, 'extracted-data.xlsx')
      
      toast.success('Excel exported successfully!')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Error exporting Excel file')
    }
  }

  const updateNestedValue = (obj, path, value) => {
    if (path.length === 0) return value
    const [head, ...tail] = path
    if (Array.isArray(obj)) {
      const index = parseInt(head)
      return obj.map((item, i) => i === index ? updateNestedValue(item, tail, value) : item)
    } else {
      return { ...obj, [head]: updateNestedValue(obj[head], tail, value) }
    }
  }

  const renderField = (key, value, path = []) => {
    const currentPath = [...path, key]
    const id = currentPath.join('.')

    if (Array.isArray(value)) {
      return (
        <div key={id} className="array-field">
          <label 
            className="field-label clickable-label"
            onClick={() => onFieldClick && onFieldClick(String(key))}
          >
            {key} ({value.length} items):
          </label>
          <div className="array-items">
            {value.map((item, index) => (
              <div key={index} className="array-item">
                <h5>Item {index + 1}</h5>
                {typeof item === 'object' && item !== null ? (
                  <div className="nested-object">
                    {Object.entries(item).map(([itemKey, itemValue]) =>
                      renderField(itemKey, itemValue, [...currentPath, index.toString()])
                    )}
                  </div>
                ) : (
                  <div className="field">
                    <input
                      type={typeof item === 'number' ? 'number' : typeof item === 'boolean' ? 'checkbox' : 'text'}
                      checked={typeof item === 'boolean' ? item : undefined}
                      value={typeof item === 'boolean' ? undefined : String(item)}
                      onChange={(e) => {
                        let newValue = e.target.value
                        if (e.target.type === 'number') newValue = Number(e.target.value)
                        if (e.target.type === 'checkbox') newValue = e.target.checked
                        const newData = updateNestedValue(jsonData, [...currentPath, index.toString()], newValue)
                        setJsonData(newData)
                      }}
                      onClick={() => onFieldClick && onFieldClick(String(item))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    } else if (typeof value === 'object' && value !== null) {
      return (
        <div key={id} className="object-field">
          <label 
            className="field-label clickable-label"
            onClick={() => onFieldClick && onFieldClick(String(key))}
          >
            {key}:
          </label>
          <div className="nested-object">
            {Object.entries(value).map(([objKey, objValue]) =>
              renderField(objKey, objValue, currentPath)
            )}
          </div>
        </div>
      )
    } else {
      // Handle different data types
      const inputType = typeof value === 'number' ? 'number' :
                       typeof value === 'boolean' ? 'checkbox' : 'text'

      return (
        <div key={id} className="field">
          <label 
            htmlFor={id} 
            className="field-label clickable-label"
            onClick={() => onFieldClick && onFieldClick(String(key))}
          >
            {key}:
          </label>
          {inputType === 'checkbox' ? (
            <input
              id={id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => {
                const newData = updateNestedValue(jsonData, currentPath, e.target.checked)
                setJsonData(newData)
              }}
              onClick={() => onFieldClick && onFieldClick(String(value))}
            />
          ) : (
            <input
              id={id}
              type={inputType}
              value={String(value)}
              onChange={(e) => {
                let newValue = e.target.value
                if (inputType === 'number') newValue = Number(e.target.value)
                const newData = updateNestedValue(jsonData, currentPath, newValue)
                setJsonData(newData)
              }}
              onClick={() => onFieldClick && onFieldClick(String(value))}
            />
          )}
        </div>
      )
    }
  }

  if (!jsonData) {
    return (
      <div className="json-form">
        <h3>Extracted Data</h3>
        <p>Process a PDF to see the extracted data here</p>
      </div>
    )
  }

  return (
    <div className="json-form">
      <div className="form-header">
        <h3>Extracted Result</h3>
        <div className="form-actions">
          <button onClick={handleExportJson} className="export-btn">Export JSON</button>
          <button onClick={handleExportExcel} className="export-btn excel-btn">Export Excel</button>
          <button 
            onClick={() => setViewMode(viewMode === 'form' ? 'json' : 'form')}
            className="toggle-btn"
          >
            {viewMode === 'form' ? 'View Raw JSON' : 'View Form'}
          </button>
        </div>
      </div>
      {viewMode === 'json' ? (
        <div className="raw-json-view">
          <pre>{JSON.stringify(jsonData, null, 2)}</pre>
        </div>
      ) : (
        <div className="form-fields">
          {Object.entries(jsonData).map(([key, value]) =>
            renderField(key, value)
          )}
        </div>
      )}
    </div>
  )
}

export default JsonForm
