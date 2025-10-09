import { Document, Page } from 'react-pdf'
import { useState } from 'react'
import toast from 'react-hot-toast'

const FileViewer = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
  }

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error)
    toast.error('Failed to load PDF file. Please try again.')
  }

  return (
    <div className="file-viewer">
      {pdfUrl ? (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          options={{
            disableWorker: true,
            verbosity: 0
          }}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} />
          ))}
        </Document>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  )
}

export default FileViewer
