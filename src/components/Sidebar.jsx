import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FolderIcon, FileIcon, Plus, Trash2, Upload, Menu, X, ChevronUp, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { fileDB } from '../utils/db'
import axios from 'axios'

const Sidebar = ({ folders, setFolders, selectedFolder, setSelectedFolder, onFileSelect, selectedFileIds, collapsed = false, onToggleCollapse, onFileDelete, onBackToLanding, currentProject, onProcessFile, onExportJson, onExportExcel, hasJsonData }) => {
  // Persist folders/files to projectDB whenever they change
        const persistFoldersToDB = async (folders) => {
          if (!currentProject || !currentProject.id) return;
          try {
            const { getProject, saveProject } = await import('../utils/projectDB');
            const project = await getProject(currentProject.id);
            if (project) {
              await saveProject({ ...project, items: folders });
            }
          } catch (error) {
            console.error('Sidebar: Failed to persist folders/files to IndexedDB:', error);
          }
        };
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOverFolder, setDragOverFolder] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, type: '', item: null, folderId: null })
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [showDropdown, setShowDropdown] = useState(null) // Changed to store file ID instead of boolean

  const createFolder = () => {
    if (!newFolderName.trim()) return
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      files: [],
      expanded: false
    }
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    persistFoldersToDB(updatedFolders)
    setNewFolderName('')
    toast.success(`Folder "${newFolderName}" created`)
  }

  const deleteFolder = (folderId) => {
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return
    setDeleteModal({ show: true, type: 'folder', item: folder, folderId })
  }

  const deleteFile = async (folderId, fileId) => {
    const folder = folders.find(f => f.id === folderId)
    const file = folder ? folder.files.find(f => f.id === fileId) : null
    if (!file) {
      toast.error('File not found')
      return
    }
    setDeleteModal({ show: true, type: 'file', item: file, folderId })
  }

  const startRenameFolder = (folder) => {
    setRenamingFolder(folder.id)
    setRenameFolderName(folder.name)
  }

  const cancelRenameFolder = () => {
    setRenamingFolder(null)
    setRenameFolderName('')
  }

  const confirmRenameFolder = () => {
    if (!renameFolderName.trim()) {
      toast.error('Folder name cannot be empty')
      return
    }
    
    const updatedFolders = folders.map(f => 
      f.id === renamingFolder ? { ...f, name: renameFolderName.trim() } : f
    )
    setFolders(updatedFolders)
    persistFoldersToDB(updatedFolders)
    setRenamingFolder(null)
    setRenameFolderName('')
    toast.success('Folder renamed successfully')
  }

  const confirmDelete = async () => {
    const { type, item, folderId } = deleteModal
    setDeleteModal({ show: false, type: '', item: null, folderId: null })

    if (type === 'folder') {
      const updatedFolders = folders.filter(f => f.id !== item.id)
      setFolders(updatedFolders)
      persistFoldersToDB(updatedFolders)
      toast.success('Folder deleted')
    } else if (type === 'file') {
      try {
        // Delete from IndexedDB
        await fileDB.deleteFile(item.id)
        // If it's a PDF, also delete any associated JSON data
        if (item.type === 'application/pdf') {
          await fileDB.deleteJsonData(item.id)
        }

        // Remove from folders state
        const updatedFolders = folders.map(f => 
          f.id === folderId ? { ...f, files: f.files.filter(file => file.id !== item.id) } : f
        )
        setFolders(updatedFolders)
        persistFoldersToDB(updatedFolders)
        // Notify parent to clear selection if needed
        if (onFileDelete) {
          onFileDelete(item.id)
        }
        toast.success('File deleted')
      } catch (error) {
        console.error('Error deleting file:', error)
        toast.error('Error deleting file')
      }
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ show: false, type: '', item: null, folderId: null })
  }

  // Close dropdown when clicking outside
  const handleClickOutside = (event) => {
    if (showDropdown && !event.target.closest('.sidebar-dropdown-container')) {
      setShowDropdown(null);
    }
  }

  // Add event listener for click outside
  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const createDropzoneConfig = (folderId) => ({
    accept: {
      'application/pdf': ['.pdf'],
      'application/json': ['.json']
    },
    multiple: true,
    onDrop: (acceptedFiles) => {
      onDrop(acceptedFiles, folderId)
      setDragOverFolder(null)
    },
    onDragOver: () => setDragOverFolder(folderId),
    onDragLeave: () => setDragOverFolder(null),
    noClick: false,
    noKeyboard: true
  })

  const onDrop = async (acceptedFiles, folderId) => {
    const newFiles = []
    for (const file of acceptedFiles) {
      const fileId = Date.now().toString() + Math.random()
      try {
        await fileDB.storeFile(fileId, file.name, file.type, file)
        const newFile = {
          id: fileId,
          name: file.name,
          type: file.type
        }
        newFiles.push(newFile)
      } catch (error) {
        console.error('Error storing file:', error)
        toast.error(`Error storing ${file.name}`)
      }
    }
    if (newFiles.length > 0) {
      const updatedFolders = folders.map(f => f.id === folderId ? { ...f, files: [...f.files, ...newFiles] } : f);
      setFolders(updatedFolders);
      persistFoldersToDB(updatedFolders);
      toast.success(`${newFiles.length} file(s) uploaded`);
    }
  }

  const DropzoneArea = ({ folderId }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone(createDropzoneConfig(folderId))

    return (
      <div
        {...getRootProps()}
        className={`upload-area ${isDragActive ? 'drag-active' : ''} ${dragOverFolder === folderId ? 'drag-over' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload size={16} />
        <span>
          {isDragActive
            ? 'Drop files here...'
            : 'Drag & drop PDFs or click to upload'
          }
        </span>
      </div>
    )
  }

  return (
    <div className="sidebar-content">
      <div className="sidebar-toggle" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px'}}>
        {onBackToLanding && (
          <button
            className="sidebar-toggle-btn sidebar-back-btn"
            onClick={onBackToLanding}
            title="Back to Home"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              width: '32px',  
              height: '32px', 
              borderRadius: '6px',
              marginRight: 'auto',
              position: 'relative',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#333';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <span style={{fontSize: '1.4rem', verticalAlign: 'middle'}}>←</span>
          </button>
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          style={{marginLeft: 'auto'}}
        >
          <span style={{color: '#fff', fontSize: '16px', fontWeight: 'bold'}}>
            {collapsed ? '☰' : '✕'}
          </span>
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <input
              type="text"
              placeholder="Enter folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <button onClick={createFolder} disabled={!newFolderName.trim()}><Plus size={16} /></button>
          </div>
          <div className="folders-list">
            {folders.map(folder => (
              <div key={folder.id} className="folder">
                <div className="folder-header" style={{position: 'relative'}} onClick={() => { if (!renamingFolder) { setFolders(folders.map(f => f.id === folder.id ? { ...f, expanded: !f.expanded } : f)); setSelectedFolder(folder.id) } }}>
                  {folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <FolderIcon size={16} />
                  {renamingFolder === folder.id ? (
                    <input
                      type="text"
                      value={renameFolderName}
                      onChange={(e) => setRenameFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRenameFolder();
                        if (e.key === 'Escape') cancelRenameFolder();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        background: '#222',
                        border: '1px solid #555',
                        color: '#fff',
                        padding: '2px 4px',
                        fontSize: '14px',
                        borderRadius: '3px'
                      }}
                      autoFocus
                    />
                  ) : (
                    <span style={{flex: 1}}>{folder.name}</span>
                  )}
                  {renamingFolder === folder.id ? (
                    <>
                      <button 
                        style={{position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)', padding: '2px 4px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                        onClick={(e) => { e.stopPropagation(); confirmRenameFolder(); }}
                        title="Confirm rename"
                      >
                        ✓
                      </button>
                      <button 
                        style={{position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '2px 4px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                        onClick={(e) => { e.stopPropagation(); cancelRenameFolder(); }}
                        title="Cancel rename"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        style={{
                          position: 'absolute', 
                          right: '40px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          padding: '4px 6px', 
                          background: '#2b2b2bff', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={(e) => { e.stopPropagation(); startRenameFolder(folder); }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#444444ff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#444444ff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                        title="Rename folder"
                      >
                        ✏️
                      </button>
                      <button 
                        style={{
                          position: 'absolute', 
                          right: '8px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          padding: '4px',
                          background: 'transparent',
                          color: '#666',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#dc3545'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; }}
                        title="Delete folder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
                {folder.expanded && (
                  <div className="files-list">
                    {folder.files.map(file => (
                      <div key={file.id} className={`file ${selectedFileIds.includes(file.id) ? 'selected' : ''}`} onClick={() => {
                        // Only call onFileSelect if the file is not already selected
                        if (!selectedFileIds.includes(file.id)) {
                          onFileSelect(file);
                        }
                      }}>
                        <FileIcon size={16} />
                        <span title={file.name}>{file.name}</span>
                        {/* Process buttons for PDFs */}
                        {file.type === 'application/pdf' && (
                          <>
                            <button
                              className="sidebar-action-btn"
                              title="Load SAKTHI--S 1_analysis 1.json"
                              style={{marginRight: '2px', padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: '#ffc017', color: '#000', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  toast.loading('Loading analysis data...', { id: 'load1' });
                                  const response = await fetch('/pdfs/SAKTHI--S 1_analysis 1.json');
                                  if (response.ok) {
                                    const jsonData = await response.json();
                                    // Store in processed data
                                    const processedDataMap = {};
                                    processedDataMap[file.id] = jsonData;
                                    
                                    // Update parent component's processed data
                                    if (window.updateProcessedData) {
                                      window.updateProcessedData(processedDataMap);
                                    }
                                    
                                    // Save to IndexedDB
                                    const { fileDB } = await import('../utils/db');
                                    await fileDB.storeJsonData(file.id, jsonData);
                                    
                                    // Create virtual JSON file and select it
                                    const virtualJsonFile = {
                                      id: `${file.id}_analysis_1`,
                                      name: 'SAKTHI--S 1_analysis 1.json',
                                      type: 'application/json'
                                    };
                                    
                                    // Update selected file in parent
                                    if (window.selectJsonFile) {
                                      window.selectJsonFile(virtualJsonFile, jsonData);
                                    }
                                    
                                    toast.success('Analysis data loaded successfully!', { id: 'load1' });
                                  } else {
                                    toast.error('Analysis JSON file not found', { id: 'load1' });
                                  }
                                } catch (error) {
                                  console.error('Error loading analysis JSON:', error);
                                  toast.error('Failed to load analysis data', { id: 'load1' });
                                }
                              }}
                              onMouseOver={e => e.currentTarget.style.background = '#e6a814'}
                              onMouseOut={e => e.currentTarget.style.background = '#ffc017'}
                            ><ChevronUp size={14} /></button>
                            <button
                              className="sidebar-action-btn"
                              title="Load SAKTHI--S_final_expanded.json"
                              style={{marginRight: '2px', padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: '#54b741', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  toast.loading('Loading expanded analysis data...', { id: 'load2' });
                                  const response = await fetch('/pdfs/SAKTHI--S_final_expanded.json');
                                  if (response.ok) {
                                    const jsonData = await response.json();
                                    // Store in processed data
                                    const processedDataMap = {};
                                    processedDataMap[file.id] = jsonData;
                                    
                                    // Update parent component's processed data
                                    if (window.updateProcessedData) {
                                      window.updateProcessedData(processedDataMap);
                                    }
                                    
                                    // Save to IndexedDB
                                    const { fileDB } = await import('../utils/db');
                                    await fileDB.storeJsonData(file.id, jsonData);
                                    
                                    // Create virtual JSON file and select it
                                    const virtualJsonFile = {
                                      id: `${file.id}_final_expanded`,
                                      name: 'SAKTHI--S_final_expanded.json',
                                      type: 'application/json'
                                    };
                                    
                                    // Update selected file in parent
                                    if (window.selectJsonFile) {
                                      window.selectJsonFile(virtualJsonFile, jsonData);
                                    }
                                    
                                    toast.success('Expanded analysis data loaded successfully!', { id: 'load2' });
                                  } else {
                                    toast.error('Expanded analysis JSON file not found', { id: 'load2' });
                                  }
                                } catch (error) {
                                  console.error('Error loading expanded analysis JSON:', error);
                                  toast.error('Failed to load expanded analysis data', { id: 'load2' });
                                }
                              }}
                              onMouseOver={e => e.currentTarget.style.background = '#3d8b31'}
                              onMouseOut={e => e.currentTarget.style.background = '#54b741'}
                            ><ChevronUp size={14} /></button>
                          </>
                        )}
                        <button
                          className="sidebar-action-btn"
                          title="Delete file"
                          style={{padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: '#222', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                          onClick={(e) => { e.stopPropagation(); deleteFile(folder.id, file.id) }}
                          onMouseOver={e => e.currentTarget.style.background = '#a00'}
                          onMouseOut={e => e.currentTarget.style.background = '#222'}
                        ><Trash2 size={14} /></button>
                        {hasJsonData && (
                          <div className="sidebar-dropdown-container" style={{position: 'relative', display: 'inline-block'}}>
                            <button
                              className="sidebar-action-btn"
                              title="More options"
                              style={{padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: ' #343434', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                              onClick={(e) => { e.stopPropagation(); setShowDropdown(showDropdown === file.id ? null : file.id) }}
                              onMouseOver={e => e.currentTarget.style.background = '#666'}
                              onMouseOut={e => e.currentTarget.style.background = '#444'}
                            ><MoreVertical size={14} /></button>
                            {showDropdown === file.id && (
                              <div className="sidebar-dropdown-menu" style={{
                                position: 'absolute',
                                top: '100%',
                                right: '0',
                                background: '#333',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                zIndex: 1000,
                                minWidth: '120px',
                                marginTop: '2px'
                              }}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setShowDropdown(null); onExportJson(); }}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    fontSize: '12px',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#555'}
                                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  Export JSON
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setShowDropdown(null); onExportExcel(); }}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    fontSize: '12px',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#555'}
                                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  Export Excel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <DropzoneArea folderId={folder.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#222',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid #333'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '18px' }}>
              Confirm Deletion
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#aaa', lineHeight: '1.5' }}>
              Are you sure you want to delete {deleteModal.type === 'folder' ? 'the folder' : 'the file'} "{deleteModal.item?.name}"?
              {deleteModal.type === 'folder' && ' This will also delete all files in the folder.'}
              <br />
              <strong>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
