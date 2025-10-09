import { Document, Page } from 'react-pdf'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'

const FileViewer = ({ pdfUrl, highlightedText }) => {
  const [numPages, setNumPages] = useState(null)
  const [pageLoadStates, setPageLoadStates] = useState({})

  const documentOptions = useMemo(() => ({
    disableWorker: true,
    verbosity: 0
  }), [])

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageLoadStates({})
  }

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error)
    toast.error('Failed to load PDF file. Please try again.')
  }

  const onPageLoadSuccess = (pageNumber) => {
    setPageLoadStates(prev => ({
      ...prev,
      [pageNumber]: 'loaded'
    }))
  }

  const onPageLoadError = (pageNumber, error) => {
    console.error(`Page ${pageNumber} load error:`, error)
    setPageLoadStates(prev => ({
      ...prev,
      [pageNumber]: 'error'
    }))
  }

  return (
    <div className="file-viewer">
      {pdfUrl ? (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          options={documentOptions}
        >
          {Array.from(new Array(numPages), (_, index) => {
            const pageNumber = index + 1
            const loadState = pageLoadStates[pageNumber]

            return (
              <div key={`page_container_${pageNumber}`} className="pdf-page-container">
                {loadState === 'error' ? (
                  <div className="page-error">
                    Failed to load page {pageNumber}
                  </div>
                ) : (
                  <Page
                    pageNumber={pageNumber}
                    onLoadSuccess={() => onPageLoadSuccess(pageNumber)}
                    onLoadError={(error) => onPageLoadError(pageNumber, error)}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    customTextRenderer={({ str, itemIndex }) => {
                      if (!highlightedText) return str
                      
                      // Simple text highlighting - replace matching text with highlighted version
                      const regex = new RegExp(`(${highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
                      const parts = str.split(regex)
                      
                      return parts.map((part, index) => 
                        regex.test(part) ? 
                          <mark key={index} style={{ backgroundColor: '#ffff00', color: '#000' }}>{part}</mark> : 
                          part
                      )
                    }}
                  />
                )}
              </div>
            )
          })}
        </Document>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  )
}

export default FileViewer
