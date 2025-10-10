// IndexedDB utilities for storing PDF files and JSON data

const DB_NAME = 'DocUI_DB'
const DB_VERSION = 2 // Increased version to add JSON store
const FILES_STORE = 'files'
const JSON_STORE = 'json_data'

class FileDB {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create files store if it doesn't exist
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, { keyPath: 'id' })
        }

        // Create JSON data store for extracted JSON
        if (!db.objectStoreNames.contains(JSON_STORE)) {
          db.createObjectStore(JSON_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  // Store file blobs (PDFs and uploaded JSON files)
  async storeFile(id, name, type, data) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([FILES_STORE], 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const file = { id, name, type, data, timestamp: Date.now() }
      const request = store.put(file)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Store extracted JSON data from PDFs
  async storeJsonData(id, data) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([JSON_STORE], 'readwrite')
      const store = transaction.objectStore(JSON_STORE)
      const jsonEntry = { id, data, timestamp: Date.now() }
      const request = store.put(jsonEntry)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getFile(id) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([FILES_STORE], 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.data : null)
      }
    })
  }

  async getJsonData(id) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([JSON_STORE], 'readonly')
      const store = transaction.objectStore(JSON_STORE)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.data : null)
      }
    })
  }

  async deleteFile(id) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([FILES_STORE], 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteJsonData(id) {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([JSON_STORE], 'readwrite')
      const store = transaction.objectStore(JSON_STORE)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll() {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([FILES_STORE, JSON_STORE], 'readwrite')
      const fileStore = transaction.objectStore(FILES_STORE)
      const jsonStore = transaction.objectStore(JSON_STORE)

      const promises = [
        new Promise((resolve, reject) => {
          const request = fileStore.clear()
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve()
        }),
        new Promise((resolve, reject) => {
          const request = jsonStore.clear()
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve()
        })
      ]

      Promise.all(promises).then(() => resolve()).catch(reject)
    })
  }

  // Get all stored files metadata
  async getAllFiles() {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([FILES_STORE], 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const files = request.result.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          timestamp: file.timestamp
        }))
        resolve(files)
      }
    })
  }

  // Get all stored JSON data
  async getAllJsonData() {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([JSON_STORE], 'readonly')
      const store = transaction.objectStore(JSON_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const jsonData = request.result.map(entry => ({
          id: entry.id,
          data: entry.data,
          timestamp: entry.timestamp
        }))
        resolve(jsonData)
      }
    })
  }
}

export const fileDB = new FileDB()
