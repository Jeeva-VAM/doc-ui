import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

const FileViewer = ({ pdfUrl, highlightedText, onTextSelect }) => {
  const [selectedText, setSelectedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [numPages, setNumPages] = useState(null)
  const fileViewerRef = useRef(null)

  // Custom text renderer for highlighting
  const customTextRenderer = useCallback((textItem) => {
    if (!highlightedText || !textItem.str) {
      return textItem.str
    }

    const text = textItem.str
    const searchText = highlightedText.toLowerCase().trim()
    const textLower = text.toLowerCase()

    if (!textLower.includes(searchText)) {
      return text
    }

    // Split text and highlight matches
    const parts = []
    let lastIndex = 0

    // Find all occurrences of the search text
    let index = textLower.indexOf(searchText, lastIndex)
    while (index !== -1) {
      // Add text before the match
      if (index > lastIndex) {
        parts.push(text.slice(lastIndex, index))
      }
      // Add highlighted match
      parts.push(
        <mark key={`highlight-${index}`}>
          {text.slice(index, index + highlightedText.length)}
        </mark>
      )
      lastIndex = index + highlightedText.length
      index = textLower.indexOf(searchText, lastIndex)
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }, [highlightedText])

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim()
        setSelectedText(selectedText)
        if (onTextSelect) {
          onTextSelect(selectedText)
        }
      }
    }

    const handleClickOutside = (e) => {
      if (fileViewerRef.current && !fileViewerRef.current.contains(e.target)) {
        setSelectedText('')
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [onTextSelect])

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error)
    setIsLoading(false)
  }

  const onLoadStart = () => {
    setIsLoading(true)
  }

  return (
    <div className="file-viewer" ref={fileViewerRef}>
      {pdfUrl ? (
        <>
          {isLoading && (
            <div className="pdf-loading">
              Loading PDF pages...
            </div>
          )}
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadStart={onLoadStart}
            loading=""
            className="pdf-container"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                customTextRenderer={customTextRenderer}
                className="pdf-page"
                data-page-number={index + 1}
              />
            ))}
          </Document>
        </>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  )
}

export default FileViewer
