import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

const FileViewer = ({ pdfUrl, highlightedText, onTextSelect }) => {
  const [selectedText, setSelectedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const fileViewerRef = useRef(null)

  // Clear PDF content when URL changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    if (pdfUrl) {
      loadPdfSequentially(pdfUrl)
    }
  }, [pdfUrl])

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

  const loadPdfSequentially = async (url) => {
    if (!containerRef.current) return

    setIsLoading(true)
    containerRef.current.innerHTML = ''

    try {
      const { getDocument } = await import('pdfjs-dist')
      const loadingTask = getDocument({
        url: url,
        disableWorker: true,
        verbosity: 0
      })

      const pdf = await loadingTask.promise
      const numPages = pdf.numPages

      // Render pages one by one sequentially
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        await renderPage(pdf, pageNum)
      }

      setIsLoading(false)
      toast.success(`PDF loaded with ${numPages} pages`)
    } catch (error) {
      console.error('Error loading PDF:', error)
      setIsLoading(false)
      toast.error('Failed to load PDF')
    }
  }

  const renderPage = async (pdf, pageNum) => {
    if (!containerRef.current) return

    try {
      const page = await pdf.getPage(pageNum)

      // Create page container
      const pageContainer = document.createElement('div')
      pageContainer.className = 'pdf-page-container'
      pageContainer.setAttribute('data-page-number', pageNum)

      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      // Calculate scale to fit container width
      const containerWidth = containerRef.current.clientWidth - 40 // padding
      const viewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })

      canvas.height = scaledViewport.height
      canvas.width = scaledViewport.width

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
      }

      await page.render(renderContext).promise

      // Create text layer for selection and highlighting
      const textContent = await page.getTextContent()
      const textLayer = createTextLayer(textContent, scaledViewport, canvas)

      // Append elements
      pageContainer.appendChild(canvas)
      if (textLayer) {
        pageContainer.appendChild(textLayer)
      }

      containerRef.current.appendChild(pageContainer)
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error)
    }
  }

  const createTextLayer = (textContent, viewport, canvas) => {
    if (!textContent || !textContent.items.length) return null

    const textLayer = document.createElement('div')
    textLayer.className = 'pdf-text-layer'
    textLayer.style.position = 'absolute'
    textLayer.style.left = '0'
    textLayer.style.top = '0'
    textLayer.style.width = canvas.width + 'px'
    textLayer.style.height = canvas.height + 'px'
    textLayer.style.pointerEvents = 'none'

    textContent.items.forEach((item, index) => {
      const textDiv = document.createElement('div')
      textDiv.style.position = 'absolute'
      textDiv.style.left = item.transform[4] * viewport.scale + 'px'
      textDiv.style.top = (viewport.height - item.transform[5] * viewport.scale) + 'px'
      textDiv.style.fontSize = item.transform[0] * viewport.scale + 'px'
      textDiv.style.fontFamily = 'sans-serif'
      textDiv.style.whiteSpace = 'pre'
      textDiv.style.pointerEvents = 'auto'
      textDiv.style.userSelect = 'text'

      let text = item.str

      // Apply highlighting if needed
      if (highlightedText && text.toLowerCase().includes(highlightedText.toLowerCase())) {
        text = text.replace(new RegExp(`(${highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
          `<mark style="background-color: #ffff00; color: #000; padding: 2px 4px; border-radius: 2px; font-weight: bold;">$1</mark>`)
        textDiv.innerHTML = text
      } else if (selectedText && text.toLowerCase().includes(selectedText.toLowerCase())) {
        text = text.replace(new RegExp(`(${selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
          `<mark style="background-color: #00ff00; color: #000; padding: 2px 4px; border-radius: 2px; font-weight: bold;">$1</mark>`)
        textDiv.innerHTML = text
      } else {
        textDiv.textContent = text
      }

      textLayer.appendChild(textDiv)
    })

    return textLayer
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
          <div
            ref={containerRef}
            className="pdf-container"
            style={{
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#f5f5f5'
            }}
          />
        </>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  )
}

export default FileViewer
