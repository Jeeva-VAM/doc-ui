import React, { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

const FileViewer = ({ pdfUrl, highlightedText, pdfTextContent, onTextSelect }) => {
  const [selectedText, setSelectedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [numPages, setNumPages] = useState(null)
  const [matches, setMatches] = useState([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [totalMatches, setTotalMatches] = useState(0)
  const fileViewerRef = useRef(null)

  // Search for matches when highlightedText or pdfTextContent changes
  useEffect(() => {
    if (!highlightedText || !pdfTextContent.length || !numPages) {
      setMatches([])
      setTotalMatches(0)
      setCurrentMatchIndex(-1)
      return
    }

    try {
      const searchText = highlightedText.toLowerCase().trim()
      if (!searchText) {
        setMatches([])
        setTotalMatches(0)
        setCurrentMatchIndex(-1)
        return
      }

      const foundMatches = []
      let totalMatchCount = 0

      pdfTextContent.forEach((page) => {
        const pageText = page.text.toLowerCase()
        let startIndex = 0
        let index = pageText.indexOf(searchText, startIndex)

        while (index !== -1) {
          foundMatches.push({
            pageNumber: page.pageNumber,
            startIndex: index,
            endIndex: index + searchText.length,
            text: page.text.slice(index, index + highlightedText.length)
          })
          totalMatchCount++
          startIndex = index + 1
          index = pageText.indexOf(searchText, startIndex)
        }
      })

      setMatches(foundMatches)
      setTotalMatches(totalMatchCount)
      setCurrentMatchIndex(foundMatches.length > 0 ? 0 : -1)

      if (foundMatches.length > 0) {
        const firstMatch = foundMatches[0]
        // Delay scrolling to ensure pages are rendered
        setTimeout(() => scrollToPage(firstMatch.pageNumber), 100)
        toast.success(`Found ${totalMatchCount} matches on page ${firstMatch.pageNumber}`)
      } else {
        toast.info(`"${highlightedText}" not found in PDF`)
      }
    } catch (error) {
      console.error('Error during PDF search:', error)
      setMatches([])
      setTotalMatches(0)
      setCurrentMatchIndex(-1)
    }
  }, [highlightedText, pdfTextContent, numPages])

  // Custom text renderer for highlighting
  const customTextRenderer = useCallback((textItem) => {
    if (!highlightedText || !textItem.str) {
      return textItem.str
    }

    const text = textItem.str
    const searchText = highlightedText.trim()
    const textNormalized = text.toLowerCase()
    const searchNormalized = searchText.toLowerCase()

    // Check if this text item contains any part of the search text
    if (!textNormalized.includes(searchNormalized)) {
      // Also check for individual words if it's a multi-word search
      const searchWords = searchNormalized.split(/\s+/).filter(word => word.length > 2)
      const hasMatchingWord = searchWords.some(word => textNormalized.includes(word))
      if (!hasMatchingWord) {
        return text
      }
    }

    // If we found a match, highlight the entire text item or the matching parts
    if (textNormalized.includes(searchNormalized)) {
      // Exact match - highlight the specific text
      const parts = []
      let lastIndex = 0
      let index = textNormalized.indexOf(searchNormalized, lastIndex)

      while (index !== -1) {
        // Add text before the match
        if (index > lastIndex) {
          parts.push(text.slice(lastIndex, index))
        }
        // Add highlighted match
        const highlightedElement = (
          <mark
            key={`highlight-${index}`}
            style={{
              backgroundColor: '#ffff00',
              color: '#000',
              padding: '1px 2px',
              borderRadius: '2px',
              fontWeight: 'bold'
            }}
          >
            {text.slice(index, index + searchText.length)}
          </mark>
        )
        parts.push(highlightedElement)
        lastIndex = index + searchText.length
        index = textNormalized.indexOf(searchNormalized, lastIndex)
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }

      return parts.length > 0 ? parts : text
    } else {
      // Partial match (word-based) - highlight the entire text item
      return (
        <mark
          style={{
            backgroundColor: '#ffff88',
            color: '#000',
            padding: '1px 2px',
            borderRadius: '2px'
          }}
        >
          {text}
        </mark>
      )
    }
  }, [highlightedText])

  // Handle text selection (disabled - only search on form field clicks)
  // useEffect(() => {
  //   const handleSelection = () => {
  //     const selection = window.getSelection()
  //     if (selection && selection.toString().trim()) {
  //       const selectedText = selection.toString().trim()
  //       setSelectedText(selectedText)
  //       if (onTextSelect) {
  //         onTextSelect(selectedText)
  //       }
  //     }
  //   }

  //   const handleClickOutside = (e) => {
  //     if (fileViewerRef.current && !fileViewerRef.current.contains(e.target)) {
  //       setSelectedText('')
  //     }
  //   }

  //   document.addEventListener('selectionchange', handleSelection)
  //   document.addEventListener('click', handleClickOutside)

  //   return () => {
  //     document.removeEventListener('selectionchange', handleSelection)
  //     document.removeEventListener('click', handleClickOutside)
  //   }
  // }, [onTextSelect])

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

  // Scroll to a specific page
  const scrollToPage = (pageNumber) => {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Navigate to next match
  const goToNextMatch = () => {
    if (matches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIndex)
    const match = matches[nextIndex]
    setTimeout(() => scrollToPage(match.pageNumber), 50)
  }

  // Navigate to previous match
  const goToPrevMatch = () => {
    if (matches.length === 0) return
    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    const match = matches[prevIndex]
    setTimeout(() => scrollToPage(match.pageNumber), 50)
  }

  // Clear search and hide search bar
  const clearSearch = () => {
    setMatches([])
    setTotalMatches(0)
    setCurrentMatchIndex(-1)
    // Clear the highlighted text in the parent component
    if (onTextSelect) {
      onTextSelect('')
    }
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
                key={`page_${index + 1}_${highlightedText}`}
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                customTextRenderer={customTextRenderer}
                className="pdf-page"
                data-page-number={index + 1}
              />
            ))}
          </Document>
          {matches.length > 0 && (
            <div className="search-bar">
              <div className="search-info">
                {currentMatchIndex + 1} of {totalMatches}
              </div>
              <button onClick={goToPrevMatch} className="search-btn">↑</button>
              <button onClick={goToNextMatch} className="search-btn">↓</button>
              <button onClick={clearSearch} className="search-btn cancel-btn">×</button>
            </div>
          )}
        </>
      ) : (
        <div className="no-file">Click "View PDF" to display the PDF</div>
      )}
    </div>
  )
}

export default React.memo(FileViewer)
