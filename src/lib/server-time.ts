import { useState, useEffect } from 'react'
import api from './api'

let serverOffsetMs = 0
let hasSynced = false
let syncListeners: Array<() => void> = []

export function syncServerTime(serverEpochMs: number) {
  serverOffsetMs = serverEpochMs - Date.now()
  hasSynced = true
  syncListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function getServerTime(): Date {
  return new Date(Date.now() + serverOffsetMs)
}

export function getServerOffset(): number {
  return serverOffsetMs
}

export function isServerTimeSynced(): boolean {
  return hasSynced
}

/**
 * Fetch and sync server time explicitly from backend /api/server-time
 */
export async function fetchServerTime(): Promise<Date> {
  try {
    const res = await api.get('/server-time')
    if (res.data?.data?.timestamp) {
      syncServerTime(res.data.data.timestamp)
    }
  } catch {
    // fallback to local time if server is unreachable
  }
  return getServerTime()
}

/**
 * React hook to get real-time server Date, ticking every intervalMs (default 1000ms).
 * Automatically synchronizes with backend via /server-time on mount and periodically.
 */
export function useServerTime(intervalMs = 1000): Date {
  const [time, setTime] = useState<Date>(() => getServerTime())

  useEffect(() => {
    // Initial fetch of server time if not synced yet
    if (!hasSynced) {
      fetchServerTime().then((syncedDate) => {
        setTime(syncedDate)
      })
    }

    // Subscribe to any sync event (e.g. from axios response headers)
    const onSync = () => {
      setTime(getServerTime())
    }
    syncListeners.push(onSync)

    // Regular interval ticker
    const timer = setInterval(() => {
      setTime(getServerTime())
    }, intervalMs)

    // Periodic sync every 60s with server
    const syncInterval = setInterval(() => {
      fetchServerTime()
    }, 60000)

    return () => {
      syncListeners = syncListeners.filter((l) => l !== onSync)
      clearInterval(timer)
      clearInterval(syncInterval)
    }
  }, [intervalMs])

  return time
}
