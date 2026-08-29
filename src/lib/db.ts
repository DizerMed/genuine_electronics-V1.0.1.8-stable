// Stub functions for db.ts - local IndexedDB caching disabled in online mode.

export async function openDB(): Promise<any> {
  return null;
}

export async function getIDBItem<T>(_storeName: string, _id: string): Promise<T | null> {
  return null;
}

export async function saveIDBItem(_storeName: string, _item: any): Promise<void> {}

export async function getIDBCollection<T>(_collectionName: string): Promise<T[] | null> {
  return null;
}

export async function saveIDBCollection<T>(_collectionName: string, _items: T[]): Promise<void> {}

export async function deleteIDBCollection(_collectionName: string): Promise<void> {}

export async function clearAllIDB(): Promise<void> {}
