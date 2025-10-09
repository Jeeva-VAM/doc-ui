import { useState } from 'react'
import { ChevronDown, ChevronRight, FolderIcon, FileIcon, Plus, Trash2, Upload, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { fileDB } from '../utils/db'

const Sidebar = ({ folders, setFolders, selectedFolder, setSelectedFolder, onFileSelect, selectedFileIds, collapsed = false, onToggleCollapse }) => {
  const [newFolderName, setNewFolderName] = useState('')

  const createFolder = () => {
    if (!newFolderName.trim()) return
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      files: [],
      expanded: true
    }
    setFolders([...folders, newFolder])
    setNewFolderName('')
    toast.success('Folder created')
  }

  const deleteFolder = (id) => {
    setFolders(folders.filter(f => f.id !== id))
    if (selectedFolder === id) setSelectedFolder(null)
    toast.success('Folder deleted')
  }

  const deleteFile = async (folderId, fileId) => {
    try {
      await fileDB.deleteFile(fileId)
      setFolders(folders.map(f => f.id === folderId ? { ...f, files: f.files.filter(file => file.id !== fileId) } : f))
      toast.success('File deleted')
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Error deleting file')
    }
  }

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
      setFolders(folders.map(f => f.id === folderId ? { ...f, files: [...f.files, ...newFiles] } : f))
      toast.success(`${newFiles.length} file(s) uploaded`)
    }
  }

  return (
    <div className="sidebar-content">
      <div className="sidebar-toggle">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="sidebar-header">
            <input
              type="text"
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <button onClick={createFolder} disabled={!newFolderName.trim()}><Plus size={16} /></button>
          </div>
          <div className="folders-list">
            {folders.map(folder => (
              <div key={folder.id} className="folder">
                <div className="folder-header" onClick={() => { setFolders(folders.map(f => f.id === folder.id ? { ...f, expanded: !f.expanded } : f)); setSelectedFolder(folder.id) }}>
                  {folder.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <FolderIcon size={16} />
                  <span>{folder.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}><Trash2 size={16} /></button>
                </div>
                {folder.expanded && (
                  <div className="files-list">
                    {folder.files.map(file => (
                      <div key={file.id} className={`file ${selectedFileIds.includes(file.id) ? 'selected' : ''}`} onClick={() => onFileSelect(file)}>
                        <FileIcon size={16} />
                        <span>{file.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteFile(folder.id, file.id) }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <div className="upload-area">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.json"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          onDrop(files, folder.id)
                          e.target.value = ''
                        }}
                        style={{ display: 'none' }}
                        id={`upload-${folder.id}`}
                      />
                      <label htmlFor={`upload-${folder.id}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <Upload size={16} />
                        <span>Click to upload PDFs/JSONs</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Sidebar
