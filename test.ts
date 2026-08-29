let syncPromise: Promise<void> | null = null;
export async function processOfflineSyncQueue(): Promise<void> {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      console.log('hi');
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
}
