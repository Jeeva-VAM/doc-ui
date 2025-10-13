import { useState } from 'react'
import { ChevronDown, ChevronRight, FolderIcon, FileIcon, Plus, Trash2, Upload, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { fileDB } from '../utils/db'

const Sidebar = ({ folders, setFolders, selectedFolder, setSelectedFolder, onFileSelect, selectedFileIds, collapsed = false, onToggleCollapse, onFileDelete, onBackToLanding, currentProject, onProcessFile }) => {
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
        {!collapsed && onBackToLanding && (
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
          {collapsed ? <Menu size={16} /> : <X size={16} />}
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
                <div className="folder-header" style={{position: 'relative'}} onClick={() => { setFolders(folders.map(f => f.id === folder.id ? { ...f, expanded: !f.expanded } : f)); setSelectedFolder(folder.id) }}>
                  {folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <FolderIcon size={16} />
                  <span style={{flex: 1}}>{folder.name}</span>
                  <button style={{position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)'}} onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}><Trash2 size={16} /></button>
                </div>
                {folder.expanded && (
                  <div className="files-list">
                    {folder.files.map(file => (
                      <div key={file.id} className={`file ${selectedFileIds.includes(file.id) ? 'selected' : ''}`} onClick={() => onFileSelect(file)}>
                        <FileIcon size={16} />
                        <span title={file.name}>{file.name}</span>
                        {/* Process button for PDFs */}
                        {file.type === 'application/pdf' && (
                          <button
                            className="sidebar-action-btn"
                            title="Process PDF"
                            style={{marginRight: '2px', padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: '#ffc017', color: '#000', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                            onClick={e => {
                              e.stopPropagation();
                              if (onProcessFile) {
                                onProcessFile(file);
                              }
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#e6a814'}
                            onMouseOut={e => e.currentTarget.style.background = '#ffc017'}
                          >Process</button>
                        )}
                        <button
                          className="sidebar-action-btn"
                          title="Delete file"
                          style={{padding: '2px 6px', fontSize: '0.85rem', borderRadius: '4px', background: '#222', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.2s'}}
                          onClick={(e) => { e.stopPropagation(); deleteFile(folder.id, file.id) }}
                          onMouseOver={e => e.currentTarget.style.background = '#a00'}
                          onMouseOut={e => e.currentTarget.style.background = '#222'}
                        ><Trash2 size={14} /></button>
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
