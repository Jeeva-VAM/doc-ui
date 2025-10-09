// IndexedDB utilities for storing PDF files

const DB_NAME = 'DocUI_DB'
const DB_VERSION = 1
const FILES_STORE = 'files'

interface DBFile {
  id: string
  name: string
  type: string
  data: Blob
}

class FileDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  async storeFile(id: string, name: string, type: string, data: Blob): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const file: DBFile = { id, name, type, data }
      const request = store.put(file)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getFile(id: string): Promise<Blob | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result as DBFile | undefined
        resolve(result ? result.data : null)
      }
    })
  }

  async deleteFile(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readwrite')
      const store = transaction.objectStore(FILES_STORE)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

export const fileDB = new FileDB()
