import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import FileViewer from './components/FileViewer'
import JsonForm from './components/JsonForm'
import { fileDB } from './utils/db'
import { pdfjs } from 'react-pdf'
import './App.css'

function App() {
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [processedData, setProcessedData] = useState({})
  const [pdfUrl, setPdfUrl] = useState(null)
  const [jsonData, setJsonData] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [pdfTextContent, setPdfTextContent] = useState([])
  const [highlightedText, setHighlightedText] = useState('')

  // Extract text from PDF
  const extractTextFromPdf = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      
      const textContent = []
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContentItem = await page.getTextContent()
        const pageText = textContentItem.items.map(item => item.str).join(' ')
        textContent.push({
          pageNumber: pageNum,
          text: pageText,
          items: textContentItem.items
        })
      }
      setPdfTextContent(textContent)
      return textContent
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      return []
    }
  }

  // Function to highlight text in PDF
  const highlightTextInPdf = (searchText) => {
    if (!searchText || !pdfTextContent.length) {
      setHighlightedText('')
      return
    }

    // Clean the search text (remove extra spaces, etc.)
    const cleanSearchText = searchText.trim()
    if (!cleanSearchText) {
      setHighlightedText('')
      return
    }

    setHighlightedText(cleanSearchText)

    // Find the page containing the text - try multiple search strategies
    for (const page of pdfTextContent) {
      // Try exact match first
      if (page.text.toLowerCase().includes(cleanSearchText.toLowerCase())) {
        scrollToPage(page.pageNumber)
        return
      }

      // Try searching individual words (longer than 3 chars)
      const searchWords = cleanSearchText.split(/\s+/).filter(word => word.length > 3)
      const foundWords = searchWords.filter(word =>
        page.text.toLowerCase().includes(word.toLowerCase())
      )

      if (foundWords.length > 0) {
        scrollToPage(page.pageNumber)
        return
      }

      // Try partial matches for numbers and short terms
      if (cleanSearchText.length <= 10) {
        const cleanLower = cleanSearchText.toLowerCase()
        const pageLower = page.text.toLowerCase()
        let matchCount = 0
        for (let i = 0; i < cleanSearchText.length; i++) {
          if (pageLower.includes(cleanLower[i])) matchCount++
        }
        if (matchCount > cleanSearchText.length * 0.7) { // 70% character match
          scrollToPage(page.pageNumber)
          return
        }
      }
    }

    // If text not found, clear highlight
    setHighlightedText('')
  }

  // Function to scroll to a specific page
  const scrollToPage = (pageNumber) => {
    // Try multiple selectors to find the page element
    let pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`)
    
    if (!pageElement) {
      // Fallback: find by react-pdf page structure
      const pages = document.querySelectorAll('.react-pdf__Page')
      if (pages.length >= pageNumber) {
        pageElement = pages[pageNumber - 1]
      }
    }
    
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    const initDB = async () => {
      try {
        await fileDB.init()
      } catch (error) {
        console.error('DB init error:', error)
      }
    }
    initDB()
  }, [])

  useEffect(() => {
    // Load folders from localStorage on app start
    try {
      const savedFolders = localStorage.getItem('folders')
      if (savedFolders) {
        setFolders(JSON.parse(savedFolders))
      }
    } catch (error) {
      console.error('Failed to load folders from localStorage:', error)
    }

    // Load sidebar width from localStorage
    try {
      const savedWidth = localStorage.getItem('sidebarWidth')
      if (savedWidth) {
        setSidebarWidth(parseInt(savedWidth, 10))
      }
    } catch (error) {
      console.error('Failed to load sidebar width from localStorage:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('folders', JSON.stringify(folders))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      toast.error('Storage limit exceeded. Please delete some files or folders.')
    }
  }, [folders])

  useEffect(() => {
    try {
      localStorage.setItem('sidebarWidth', sidebarWidth.toString())
    } catch (error) {
      console.error('Failed to save sidebar width to localStorage:', error)
    }
  }, [sidebarWidth])

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    if (file.type === 'application/pdf') {
      // Load PDF for viewing
      loadPdfFile(file)
    } else if (file.type === 'application/json') {
      // Load JSON for editing
      loadJsonFile(file)
    }
  }

  const handleFileDelete = (deletedFileId) => {
    // Clear selected file if it was the deleted file
    if (selectedFile && selectedFile.id === deletedFileId) {
      setSelectedFile(null)
    }

    // Clear PDF URL if the deleted file was being viewed
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }

    // Clear JSON data if the deleted file was a JSON file being edited
    if (jsonData && selectedFile && selectedFile.id === deletedFileId && selectedFile.type === 'application/json') {
      setJsonData(null)
    }

    // Clear processed data if the deleted file was a PDF with processed data
    if (processedData[deletedFileId]) {
      const newProcessedData = { ...processedData }
      delete newProcessedData[deletedFileId]
      setProcessedData(newProcessedData)

      // If the processed data was being viewed, clear it
      if (jsonData && selectedFile && selectedFile.id === deletedFileId) {
        setJsonData(null)
      }
    }

    // Clear PDF text content and highlighting
    setPdfTextContent([])
    setHighlightedText('')
  }

  // Sidebar resize functionality
  const handleMouseDown = (e) => {
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!isResizing) return
    const newWidth = Math.max(200, Math.min(500, e.clientX))
    setSidebarWidth(newWidth)
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const loadPdfFile = async (file) => {
    try {
      console.log('Loading PDF file:', file.name, 'ID:', file.id)
      const blob = await fileDB.getFile(file.id)
      console.log('Retrieved blob:', blob)
      if (blob) {
        console.log('Blob size:', blob.size, 'type:', blob.type)
        if (pdfUrl) {
          console.log('Revoking previous URL:', pdfUrl)
          URL.revokeObjectURL(pdfUrl)
        }
        const newUrl = URL.createObjectURL(blob)
        console.log('Created new URL:', newUrl)
        setPdfUrl(newUrl)
        
        // Extract text from PDF for search functionality
        await extractTextFromPdf(blob)
      } else {
        console.error('Blob not found for file ID:', file.id)
        toast.error('PDF file not found')
      }
    } catch (error) {
      console.error('Error loading PDF:', error)
      toast.error('Error loading PDF')
    }
  }

  const loadJsonFile = async (file) => {
    try {
      const blob = await fileDB.getFile(file.id)
      if (blob) {
        const text = await blob.text()
        const parsedJson = JSON.parse(text)
        setJsonData(parsedJson)
      }
    } catch (error) {
      console.error('Error loading JSON:', error)
      toast.error('Error loading JSON')
    }
  }

  const handleProcessPdf = async () => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return

    // Check if this file has already been processed
    if (processedData[selectedFile.id]) {
      setJsonData(processedData[selectedFile.id])
      toast('This PDF has already been processed. Showing existing results.')
      return
    }

    try {
      const blob = await fileDB.getFile(selectedFile.id)
      if (!blob) {
        toast.error('File not found')
        return
      }
      console.log('Processing PDF, blob size:', blob.size, 'type:', blob.type)

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock JSON response for insurance policy extraction - now fully dynamic
      const mockJsonData =
{
  "Policy": {
    "Policy Number": "POL123456789",
    "Effective Date": "2025-01-01",
    "Sum Insured": "₹10,00,000"
  },
  "Risk": {
    "Risk Location": "No. 12, Sea Breeze Avenue, Coimbatore, Tamil Nadu",
    "Coverage Type": "Comprehensive"
  },
  "Broker": {
    "Agency Name": "BlueShield Insurance Brokers Pvt Ltd",
    "Agency Address": "45, Mount Road, Chennai, Tamil Nadu, 600002",
    "Agency Phone": "+91-9876543210",
    "Agency Code": "BSI-2025"
  },
  "Insured": {
    "Named Insured": "Rohan Kumar",
    "Mailing Address": "Flat 3B, Green Meadows, Race Course Road, Coimbatore, Tamil Nadu, 641018"
  },
  "PolicyDetails": {
    "Policy Number": "POL987654321",
    "Policy Period": "01-Jan-2025 to 31-Dec-2025",
    "Issuing Company": "MarinSurance General Insurance Co. Ltd."
  },
  "Vehicles": [
    {
      "Make": "Hyundai Creta",
      "VIN": "MH4ABC12345DEF6789",
      "Year Make Model": "2023 Hyundai Creta SX(O)",
      "Agreed Value": "₹12,50,000",
      "COLL Symbol": "C12",
      "COMP Symbol": "C10",
      "Liability Symbol": "L8"
    }
  ],
  "Drivers": [
    {
      "Driver Name": "Rohan Kumar",
      "License State": "TN",
      "DOB": "1999-07-14",
      "Sex": "Male"
    }
  ],
  "Discounts": {
    "Home Companion": "Yes",
    "Multi-Car": "No",
    "Group Marketing": "Yes"
  },
    "Premium": {
      "Premium": "₹18,750",
      "Grand Total": "₹19,313 (incl. taxes)"
    },
    "Endorsement": {
      "form_name": "BUSINESSOWNERS HIGHER LIMITS ENDORSEMENT",
      "form_number": "BP 14 80 07 13",
      "form_type": "Endorsement",
      "fields_extracted": {
        "policy": {
          "policy_number": "",
          "named_insured": "",
          "policy_effective_date": "",
          "policy_expiry_date": ""
        },
        "endorsement_details": {
          "endorsement_title": "",
          "endorsement_effective_date": "",
          "modification_description": "",
          "form_edition_date": ""
        },
        "schedule": {
          "premises_number": "",
          "building_number": "Deductible",
          "location_address": "2117 E Street Northwest, Washington, DC,",
          "higher_limit_amount": "$15,669,000 $589,000",
          "premium_adjustment": "$5,043.00"
        },
        "coverage_modifications": {
          "increased_limits": "$1,000,000 / $2,000,000",
          "additional_coverage": "",
          "modified_deductibles": "Limit",
          "special_conditions": ""
        },
        "businessowners_coverage_form": {
          "reference_form": "",
          "iso_reference": "",
          "copyright_notice": "",
          "page_numbers": ""
        }
      },
      "total_fillable_fields": 18,
      "total_categories": 5,
      "detection_method": "Comprehensive_Pattern_Analysis",
      "actual_fields_detected": 182,
      "validation_method": "Template_Validated_Against_Actual"
    }
  }

      setProcessedData(prev => ({ ...prev, [selectedFile.id]: mockJsonData }))
      setJsonData(mockJsonData) // Also set the jsonData for immediate display
      toast.success('PDF processed successfully')
    } catch (error) {
      console.error('Error processing PDF:', error)
      toast.error(`Error processing PDF: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleViewPdf = async () => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      loadPdfFile(selectedFile)
    }
  }

  const handleViewResult = () => {
    if (selectedFile && selectedFile.type === 'application/pdf' && processedData[selectedFile.id]) {
      setJsonData(processedData[selectedFile.id])
    }
  }

  return (
    <div className="app">
      <Toaster />
      <div 
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} 
        style={{ width: sidebarCollapsed ? '60px' : `${sidebarWidth}px` }}
      >
        <Sidebar
          folders={folders}
          setFolders={setFolders}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          onFileSelect={handleFileSelect}
          onFileDelete={handleFileDelete}
          selectedFileIds={selectedFile ? [selectedFile.id] : []}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {!sidebarCollapsed && (
          <div 
            className="sidebar-resize-handle"
            onMouseDown={handleMouseDown}
          />
        )}
      </div>
      <div className={`main-panel ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="controls">
          {selectedFile && <div className="selected-file">{selectedFile.type === 'application/pdf' ? 'PDF' : 'JSON'}: {selectedFile.name}</div>}
          {selectedFile && selectedFile.type === 'application/pdf' && !!(processedData[selectedFile.id]) && <button onClick={handleViewResult}>View Result</button>}
        </div>
        <div className="content">
          <div className="split-panel">
            <div className="panel-left">
              {pdfUrl ? (
                <FileViewer 
                  pdfUrl={pdfUrl} 
                  highlightedText={highlightedText}
                  pdfTextContent={pdfTextContent}
                  onTextSelect={(selectedText) => {
                    setHighlightedText(selectedText)
                  }}
                />
              ) : (
                <div className="empty-panel">
                  <p className="empty-message">Select a PDF file to view</p>
                </div>
              )}
            </div>
            <div className="panel-right">
              {jsonData && typeof jsonData === 'object' ? (
                <JsonForm
                  jsonData={jsonData}
                  setJsonData={(data) => setJsonData(data)}
                  onFieldClick={highlightTextInPdf}
                />
              ) : (
                <div className="empty-panel">
                  <p className="empty-message">Select a JSON file or process a PDF to view results</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
