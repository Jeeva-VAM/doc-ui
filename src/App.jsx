import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import FileViewer from './components/FileViewer'
import JsonForm from './components/JsonForm'
import LandingPage from './components/LandingPage'
import { fileDB } from './utils/db'
import { pdfjs } from 'react-pdf'
import './App.css'

function App() {
  const [currentProject, setCurrentProject] = useState(null)
  const [folders, setFolders] = useState([])
  // Helper to persist folders/files structure in IndexedDB per project
  const persistFoldersToDB = async (projectId, folders) => {
    if (!projectId) return;
    try {
      const { getProject, saveProject } = await import('./utils/projectDB');
      const project = await getProject(projectId);
      if (project) {
        await saveProject({ ...project, items: folders });
      }
    } catch (error) {
      console.error('Failed to persist folders/files to IndexedDB:', error);
    }
  } 
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [processedData, setProcessedData] = useState({})
  const [pdfUrl, setPdfUrl] = useState(null)
  const [jsonData, setJsonData] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const [pdfTextContent, setPdfTextContent] = useState([])
  const [highlightedText, setHighlightedText] = useState('')
  const [highlightedField, setHighlightedField] = useState(null) // For bbox highlighting
  const [currentPdfFile, setCurrentPdfFile] = useState(null) // Track currently loaded PDF file
  const [panelRightWidth, setPanelRightWidth] = useState(null) // Track PDF page width for panel sizing
  const [panelLeftWidth, setPanelLeftWidth] = useState(null) // Track form panel width
  const navigate = useNavigate();

  // Adjust panel widths when form is loaded
  useEffect(() => {
    if (jsonData && selectedFile && selectedFile.type === 'application/pdf') {
      // Form is loaded in panel-left, adjust widths
      setPanelRightWidth(340);
      setPanelLeftWidth(610);
    } else if (!jsonData) {
      // Reset to default when no form is loaded
      setPanelRightWidth(null);
      setPanelLeftWidth(null);
    }
  }, [jsonData, selectedFile]);

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
  const highlightTextInPdf = (input) => {
    // Handle field object with bbox
    if (typeof input === 'object' && input !== null && input.bbox) {
      console.log('Highlighting field bbox:', input)
      setHighlightedField(input)
      setHighlightedText('') // Clear text highlighting
      return
    }
    
    // Handle string input (backward compatibility)
    const searchText = input
    if (!searchText || !pdfTextContent.length) {
      setHighlightedText('')
      setHighlightedField(null)
      return
    }

    // Convert field names to human-readable format
    const normalizeFieldName = (text) => {
      return text
        // Replace underscores with spaces
        .replace(/_/g, ' ')
        // Convert camelCase to space-separated
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Trim and convert to title case for better matching
        .trim()
        .toLowerCase()
    }

    // Clean the search text (remove extra spaces, etc.)
    const cleanSearchText = normalizeFieldName(searchText)
    if (!cleanSearchText) {
      setHighlightedText('')
      setHighlightedField(null)
      return
    }

    console.log(`Searching for: "${searchText}" -> normalized: "${cleanSearchText}"`)
    setHighlightedText(cleanSearchText)
    setHighlightedField(null) // Clear bbox highlighting

    // The FileViewer component will handle scrolling to the found text
    // and display bounding boxes automatically
  }

  // Function to clear all stored data (for debugging/reset purposes)
  const clearAllData = async () => {
    if (!currentProject) return

    try {
      // Clear localStorage for current project
      localStorage.removeItem(`folders_${currentProject.id}`)
      localStorage.removeItem(`sidebarWidth_${currentProject.id}`)

      // Clear IndexedDB (keeping it global for now, but could be made project-specific)
      await fileDB.clearAll()

      // Reset state
      setFolders([])
      setSelectedFolder(null)
      setSelectedFile(null)
      setProcessedData({})
      setPdfUrl(null)
      setJsonData(null)
      setPdfTextContent([])
      setHighlightedText('')
      setSidebarWidth(240)
      setPanelRightWidth(null) // Reset panel width
      setPanelLeftWidth(null) // Reset panel width

      toast.success('Project data cleared successfully')
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Error clearing data')
    }
  }

  // Function to check storage status (for debugging)
  const checkStorageStatus = async () => {
    try {
      const files = await fileDB.getAllFiles()
      const jsonData = await fileDB.getAllJsonData()

      console.log('Storage Status:')
      console.log('Files in IndexedDB:', files.length)
      files.forEach(file => console.log(`  - ${file.name} (${file.type})`))
      console.log('JSON data in IndexedDB:', jsonData.length)
      jsonData.forEach(entry => console.log(`  - ID: ${entry.id}`))
      console.log('Folders in localStorage:', folders.length)
      console.log('Processed data in memory:', Object.keys(processedData).length)

      return { files: files.length, jsonData: jsonData.length, folders: folders.length }
    } catch (error) {
      console.error('Error checking storage status:', error)
      return null
    }
  }

  // Expose storage check to window for debugging
  useEffect(() => {
    window.checkStorageStatus = checkStorageStatus
  }, [folders, processedData])

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

  // ...existing code...

  // Handle going back to landing page
  const handleBackToLanding = () => {
    setCurrentProject(null)
    navigate('/')
    // Reset all state
    setFolders([])
    setSelectedFolder(null)
    setSelectedFile(null)
    setProcessedData({})
    setPdfUrl(null)
    setJsonData(null)
    setPdfTextContent([])
    setHighlightedText('')
    setCurrentPdfFile(null) // Reset the current PDF file
    setPanelRightWidth(null) // Reset panel width
    setPanelLeftWidth(null) // Reset panel width
  }

  useEffect(() => {
    if (!currentProject) return;
    const loadPersistedData = async () => {
      try {
        // Always load folders/files from IndexedDB projectDB
        const { getProject } = await import('./utils/projectDB');
        const project = await getProject(currentProject.id);
        if (project && Array.isArray(project.items)) {
          // Validate that files in folders actually exist in IndexedDB
          const validatedFolders = [];
          for (const folder of project.items) {
            const validatedFiles = [];
            for (const file of folder.files) {
              try {
                const fileBlob = await fileDB.getFile(file.id);
                if (fileBlob) {
                  validatedFiles.push(file);
                } else {
                  console.warn(`File ${file.name} (${file.id}) not found in IndexedDB, removing from folder`);
                }
              } catch (error) {
                console.warn(`Error checking file ${file.name}:`, error);
              }
            }
            validatedFolders.push({ ...folder, files: validatedFiles });
          }
          setFolders(validatedFolders);
          console.log(`Loaded ${validatedFolders.length} folders with ${validatedFolders.reduce((total, folder) => total + folder.files.length, 0)} files from IndexedDB projectDB`);
        } else {
          // If no folders in projectDB, try to rebuild from IndexedDB files
          const allFiles = await fileDB.getAllFiles();
          if (allFiles.length > 0) {
            const defaultFolder = {
              id: 'recovered-' + Date.now(),
              name: 'Recovered Files',
              files: allFiles.map(file => ({ id: file.id, name: file.name, type: file.type })),
              expanded: true
            };
            setFolders([defaultFolder]);
            await persistFoldersToDB(currentProject.id, [defaultFolder]);
            toast.success(`Recovered ${allFiles.length} files into a default folder`);
            console.log(`Recovered ${allFiles.length} orphaned files into default folder`);
          }
        }

        // Load processed data from IndexedDB on app start
        try {
          const allJsonData = await fileDB.getAllJsonData()
          const processedDataMap = {}

          // Only keep processed data for files that actually exist
          for (const entry of allJsonData) {
            try {
              const fileExists = await fileDB.getFile(entry.id)
              if (fileExists) {
                processedDataMap[entry.id] = entry.data
              } else {
                console.warn(`Processed data for non-existent file ${entry.id}, cleaning up`)
                await fileDB.deleteJsonData(entry.id)
              }
            } catch (error) {
              console.warn(`Error validating processed data for ${entry.id}:`, error)
            }
          }

          if (Object.keys(processedDataMap).length > 0) {
            setProcessedData(processedDataMap)
            console.log(`Loaded ${Object.keys(processedDataMap).length} processed data entries from IndexedDB`)
          }
        } catch (error) {
          console.error('Failed to load processed data from IndexedDB:', error)
        }

        // Load sidebar width from localStorage for the current project
        const savedWidth = localStorage.getItem(`sidebarWidth_${currentProject.id}`)
        if (savedWidth) {
          setSidebarWidth(parseInt(savedWidth, 10))
        }

        // If there's a currently loaded PDF, find it in the folders and mark it as selected
        if (currentPdfFile) {
          let foundFile = null;
          for (const folder of validatedFolders || []) {
            foundFile = folder.files.find(f => f.id === currentPdfFile.id);
            if (foundFile) break;
          }
          if (foundFile) {
            setSelectedFile(foundFile);
            console.log(`Restored selected file: ${foundFile.name}`);
          }
        }
      } catch (error) {
        console.error('Failed to load persisted data:', error)
      }
    }

    loadPersistedData()
  }, [currentProject])

  useEffect(() => {
    if (!currentProject) return

    // Persist folders/files structure in IndexedDB per project
    if (currentProject) {
      persistFoldersToDB(currentProject.id, folders);
    }
  }, [folders, currentProject])

  useEffect(() => {
    if (!currentProject) return

    try {
      localStorage.setItem(`sidebarWidth_${currentProject.id}`, sidebarWidth.toString())
    } catch (error) {
      console.error('Failed to save sidebar width to localStorage:', error)
    }
  }, [sidebarWidth, currentProject])

  // Expose functions to window for Sidebar component to update state
  useEffect(() => {
    window.updateProcessedData = (newProcessedData) => {
      setProcessedData(prev => ({ ...prev, ...newProcessedData }));
    };
    
    window.selectJsonFile = (virtualFile, jsonData) => {
      setSelectedFile(virtualFile);
      setJsonData(jsonData);
    };
    
    return () => {
      delete window.updateProcessedData;
      delete window.selectJsonFile;
    };
  }, []);

  const handleFileSelect = (file) => {
    // Don't reload if the same file is already selected
    if (selectedFile && selectedFile.id === file.id) {
      return
    }

    // If clicking on a PDF that's already loaded and displayed, just mark it as selected without reloading
    if (file.type === 'application/pdf' && currentPdfFile && currentPdfFile.id === file.id) {
      setSelectedFile(file) // Mark as selected for UI purposes
      return
    }

    setSelectedFile(file)
    if (file.type === 'application/pdf') {
      // Load PDF for viewing in panel-left, clear JSON
      loadPdfFile(file)
      setJsonData(null)
    } else if (file.type === 'application/json') {
      // Load JSON for editing in panel-left, keep PDF in panel-right if open
      loadJsonFile(file)
      // Do not clear pdfUrl/highlightedText/pdfTextContent
    } else {
      // Clear panel width for non-PDF files
      setPanelRightWidth(null)
    }
  }

  const handleFileDelete = (deletedFileId) => {
    console.log('Deleting file:', deletedFileId)

    // Clear selected file if it was the deleted file
    if (selectedFile && selectedFile.id === deletedFileId) {
      setSelectedFile(null)
    }

    // Get the file type to determine what to clear
    // We need to find the file in the folders to know its type
    let deletedFileType = null
    folders.forEach(folder => {
      const file = folder.files.find(f => f.id === deletedFileId)
      if (file) {
        deletedFileType = file.type
      }
    })

    console.log('File type being deleted:', deletedFileType)

    // Clear PDF URL only if the deleted file was a PDF
    if (deletedFileType === 'application/pdf' && pdfUrl) {
      console.log('Clearing PDF URL since PDF file was deleted')
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
      setCurrentPdfFile(null) // Clear the current PDF file reference
    }

    // Clear JSON data only if the deleted file was a JSON file
    if (deletedFileType === 'application/json' && jsonData && selectedFile && selectedFile.id === deletedFileId) {
      console.log('Clearing JSON data since JSON file was deleted')
      setJsonData(null)
    }

    // Clear processed data if the deleted file was a PDF with processed data
    if (processedData[deletedFileId]) {
      console.log('Clearing processed data for deleted PDF')
      const newProcessedData = { ...processedData }
      delete newProcessedData[deletedFileId]
      setProcessedData(newProcessedData)

      // Delete from IndexedDB as well
      fileDB.deleteJsonData(deletedFileId).catch(error => {
        console.error('Error deleting JSON data from IndexedDB:', error)
      })

      // If the processed data was being viewed, clear it
      if (jsonData && selectedFile && selectedFile.id === deletedFileId) {
        setJsonData(null)
        setPanelRightWidth(null) // Reset panel width
        setPanelLeftWidth(null) // Reset panel width
      }
    }

    // Clear PDF text content and highlighting only if a PDF was deleted
    if (deletedFileType === 'application/pdf') {
      console.log('Clearing PDF text content since PDF was deleted')
      setPdfTextContent([])
      setHighlightedText('')
    }
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
        const newUrl = URL.createObjectURL(blob)
        console.log('Created new URL:', newUrl)
        setPdfUrl(newUrl)
        setCurrentPdfFile(file) // Track the currently loaded PDF file
        
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

      // Store the processed JSON data in IndexedDB
      await fileDB.storeJsonData(selectedFile.id, mockJsonData)

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

  const handleProcessFile = async (file) => {
    // Check if there's a corresponding JSON file in the pdfs folder
    // Handle different naming patterns
    let jsonFileName = file.name.replace(/\.pdf$/, '_analysis.json')
    
    // Special case: if the PDF is "SAKTHI--S.pdf", look for "SAKTHI--S 1_analysis 1.json"
    if (file.name === 'SAKTHI--S.pdf') {
      jsonFileName = 'SAKTHI--S 1_analysis 1.json'
    }
    
    console.log('Processing PDF:', file.name, '-> JSON:', jsonFileName)
    try {
      const response = await fetch(`/pdfs/${jsonFileName}`)
      console.log('Fetch response status:', response.status, 'for URL:', `/pdfs/${jsonFileName}`)
      if (response.ok) {
        const jsonData = await response.json()
        console.log('Loaded JSON data:', jsonData)
        setProcessedData(prev => ({ ...prev, [file.id]: jsonData }))
        // Also save to IndexedDB
        fileDB.storeJsonData(file.id, jsonData).catch(error => {
          console.error('Failed to save JSON data to IndexedDB:', error)
        })

        // Create a virtual JSON file entry and select it
        const virtualJsonFile = {
          id: `${file.id}_analysis`,
          name: jsonFileName,
          type: 'application/json'
        }
        setJsonData(jsonData)
        setSelectedFile(virtualJsonFile)

        toast.success('PDF processed successfully')
      } else {
        toast.error(`Analysis JSON file not found: ${jsonFileName}`)
      }
    } catch (error) {
      console.error('Error loading analysis JSON:', error)
      toast.error('Error processing PDF')
    }
  }

  // When a project is selected, load its folders/files from IndexedDB
  const handleProjectSelect = async (project) => {
    setCurrentProject(project);
    navigate(`/project/${project.id}`);
    // Load folders/files from IndexedDB
    try {
      const { getProject } = await import('./utils/projectDB');
      const dbProject = await getProject(project.id);
      if (dbProject && Array.isArray(dbProject.items)) {
        setFolders(dbProject.items);
      } else {
        setFolders([]);
      }
    } catch (error) {
      setFolders([]);
      console.error('Failed to load folders/files from IndexedDB:', error);
    }
  };

  // Render landing page if no project is selected
  if (!currentProject) {
    return (
      <div className="app">
        <Toaster />
        <LandingPage onProjectSelect={handleProjectSelect} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="app">
          <Toaster />
          <LandingPage onProjectSelect={handleProjectSelect} />
        </div>
      } />
      <Route path="/project/:id" element={
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
              onBackToLanding={handleBackToLanding}
              currentProject={currentProject}
              onProcessFile={handleProcessFile}
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
              {/* Project Name Header inside controls */}
              {currentProject && (
                <div className="project-header" style={{padding: '5px 0', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #222', marginBottom: '8px'}}>
                  {currentProject.name}
                </div>
              )}
              {selectedFile && <div className="selected-file">{selectedFile.type === 'application/pdf' ? 'PDF' : 'JSON'}: {selectedFile.name}</div>}
            </div>
            <div className="content">
              <div className="split-panel">
                <div className="panel-right" style={panelRightWidth ? { width: `${panelRightWidth}px`, flex: 'none' } : {}}>
                  {!selectedFile ? (
                    <div className="empty-panel">
                      <p className="empty-message"></p>
                    </div>
                  ) : selectedFile.type === 'application/pdf' && jsonData ? (
                    <FileViewer 
                      pdfUrl={pdfUrl} 
                      highlightedText={highlightedText}
                      highlightedField={highlightedField}
                      pdfTextContent={pdfTextContent}
                      onTextSelect={(selectedText) => {
                        setHighlightedText(selectedText)
                      }}
                      onPageWidthChange={setPanelRightWidth}
                      containerWidth={panelRightWidth}
                    />
                  ) : selectedFile.type === 'application/json' && pdfUrl ? (
                    <FileViewer 
                      pdfUrl={pdfUrl} 
                      highlightedText={highlightedText}
                      highlightedField={highlightedField}
                      pdfTextContent={pdfTextContent}
                      onTextSelect={(selectedText) => {
                        setHighlightedText(selectedText)
                      }}
                      onPageWidthChange={setPanelRightWidth}
                      containerWidth={panelRightWidth}
                    />
                  ) : selectedFile.type === 'application/pdf' ? (
                    <div className="empty-panel">
                      <p className="empty-message">Click "Process" to view the result form</p>
                    </div>
                  ) : (
                    <div className="empty-panel">
                      <p className="empty-message"></p>
                    </div>
                  )}
                </div>
                <div className="panel-left" style={panelLeftWidth ? { width: `${panelLeftWidth}px`, flex: 'none' } : {}}>
                  {!selectedFile ? (
                    <div className="empty-panel">
                      <p className="empty-message">Select a PDF file to view</p>
                    </div>
                  ) : selectedFile.type === 'application/pdf' && jsonData ? (
                    <JsonForm
                      jsonData={jsonData}
                      setJsonData={(data) => {
                        setJsonData(data)
                        // Also update processedData for persistence
                        if (selectedFile) {
                          setProcessedData(prev => ({ ...prev, [selectedFile.id]: data }))
                          // Save to IndexedDB for permanent persistence
                          fileDB.storeJsonData(selectedFile.id, data).catch(error => {
                            console.error('Failed to save JSON data to IndexedDB:', error)
                          })
                        }
                      }}
                      onFieldClick={highlightTextInPdf}
                    />
                  ) : selectedFile.type === 'application/pdf' && pdfUrl ? (
                    <FileViewer 
                      pdfUrl={pdfUrl} 
                      highlightedText={highlightedText}
                      pdfTextContent={pdfTextContent}
                      onTextSelect={(selectedText) => {
                        setHighlightedText(selectedText)
                      }}
                    />
                  ) : selectedFile.type === 'application/json' && jsonData && typeof jsonData === 'object' ? (
                    <JsonForm
                      jsonData={jsonData}
                      setJsonData={(data) => {
                        setJsonData(data)
                        // Also update processedData for persistence
                        if (selectedFile) {
                          setProcessedData(prev => ({ ...prev, [selectedFile.id]: data }))
                          // Save to IndexedDB for permanent persistence
                          fileDB.storeJsonData(selectedFile.id, data).catch(error => {
                            console.error('Failed to save JSON data to IndexedDB:', error)
                          })
                        }
                      }}
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
      } />
    </Routes>
  )
}

export default App
