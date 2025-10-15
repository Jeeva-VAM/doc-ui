import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const JsonForm = ({ jsonData, setJsonData, onFieldClick }) => {
  const [viewMode, setViewMode] = useState('form') // 'form' or 'json'
  const [rawJsonText, setRawJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Ensure raw JSON text is initialized when switching to JSON view
  useEffect(() => {
    if (viewMode === 'json' && !rawJsonText) {
      if (jsonData) {
        setRawJsonText(JSON.stringify(jsonData, null, 2))
      } else {
        setRawJsonText('{}')
      }
    }
  }, [viewMode, jsonData, rawJsonText])

  // Handle raw JSON text changes
  const handleRawJsonChange = (e) => {
    const newText = e.target.value
    setRawJsonText(newText)

    // Only try to parse if the text is not empty
    if (newText.trim() === '') {
      setJsonError('')
      return
    }

    try {
      const parsed = JSON.parse(newText)
      setJsonData(parsed)
      setJsonError('')
    } catch (error) {
      // Show error but don't prevent future updates
      setJsonError('Invalid JSON: ' + error.message)
    }
  }

  // Handle keyboard events for better JSON editing
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newText = rawJsonText.substring(0, start) + '  ' + rawJsonText.substring(end)
      setRawJsonText(newText)

      // Set cursor position after the inserted tabs
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }
  }

  // Helper function to check if a value is empty (should not trigger search)
  const isEmptyValue = (value) => {
    return value === null || value === undefined || value === ''
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

    if (key === 'form_fields' && Array.isArray(value)) {
      // Special handling for form_fields array
      return (
        <div key={id} className="form-fields-section">
          <label className="field-label">Form Fields:</label>
          <div className="form-fields-list">
            {value.map((field, index) => {
              // Determine confidence color based on score
              const confidence = field.confidence || 0;
              let confidenceColor = '#ff4444'; // red for low confidence
              if (confidence >= 0.8) confidenceColor = '#54b741'; // green for high confidence
              else if (confidence >= 0.5) confidenceColor = '#ffc017'; // yellow for medium confidence
              
              return (
                <div key={field.field_id || index} className="form-field-item">
                  <div className="field-label-container">
                    <label 
                      className="field-label-text clickable-label"
                      onClick={() => onFieldClick && onFieldClick(field)}
                      title={`Click to highlight field in PDF`}
                    >
                      {field.label}:
                    </label>
                    <div className="confidence-indicator" style={{ color: confidenceColor }}>
                      Confidence: {(confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder={field.field_type}
                    value={field.text_content || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      const newData = updateNestedValue(jsonData, [...currentPath, index.toString(), 'text_content'], newValue)
                      setJsonData(newData)
                    }}
                    className="field-input"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )
    } else if (Array.isArray(value)) {
      return (
        <div key={id} className="array-field">
          <label 
            className="field-label clickable-label"
            onClick={() => onFieldClick && onFieldClick(String(key))}
            title={`Click to search for "${key}" in PDF`}
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
                      onClick={() => !isEmptyValue(item) && onFieldClick && onFieldClick(String(item))}
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
            title={`Click to search for "${key}" in PDF`}
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
            title={`Click to search for "${key}" in PDF`}
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
              onClick={() => onFieldClick && onFieldClick(String(key))}
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
              onClick={() => onFieldClick && onFieldClick(String(key))}
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
          <button 
            onClick={() => {
              if (viewMode === 'json' && jsonError) {
                // Don't switch to form view if JSON has errors
                toast.error('Please fix JSON errors before switching to form view')
                return
              }
              setViewMode(viewMode === 'form' ? 'json' : 'form')
            }}
            className="toggle-btn"
          >
            {viewMode === 'form' ? 'View Raw JSON' : 'View Form'}
          </button>
        </div>
      </div>
      {viewMode === 'json' ? (
        <div className={`raw-json-view ${jsonError ? 'has-error' : ''}`}>
          {jsonError && (
            <div className="json-error">
              {jsonError}
            </div>
          )}
          <textarea
            value={rawJsonText}
            onChange={handleRawJsonChange}
            onKeyDown={handleKeyDown}
            className="json-textarea"
            placeholder="Enter JSON here..."
          />
        </div>
      ) : (
        <div className="form-fields">
          {Object.entries(jsonData)
            .filter(([key]) => !['document_info', 'processing_config', 'summary', 'tables'].includes(key))
            .map(([key, value]) =>
              renderField(key, value)
            )}
        </div>
      )}
    </div>
  )
}

export default JsonForm
