import { telemetryApi } from '../api/telemetry'
import type { EventPayload } from '../api/telemetry'

class TelemetryService {
  private buffer: EventPayload[] = []
  private timer: number | null = null
  private sessionId: string
  private isFlushing = false

  constructor() {
    this.sessionId = this.getOrCreateSessionId()
    this.setupUnloadHandler()
  }

  private getOrCreateSessionId(): string {
    let sid = localStorage.getItem('anon_session_id')
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('anon_session_id', sid)
    }
    return sid
  }

  private setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      this.flushSync()
    })
  }

  public track(event_type: EventPayload['event_type'], product_id?: number, payload?: any) {
    const event: EventPayload = {
      event_type,
      product_id,
      payload,
      session_id: this.sessionId,
      client_ts: new Date().toISOString()
    }
    
    this.buffer.push(event)

    if (this.buffer.length >= 50) {
      this.flush()
    } else if (!this.timer) {
      this.timer = window.setTimeout(() => this.flush(), 5000)
    }
  }

  private async flush() {
    if (this.isFlushing || this.buffer.length === 0) return
    
    this.isFlushing = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const batch = [...this.buffer]
    this.buffer = []

    try {
      await telemetryApi.ingestBatch(batch)
    } catch (error) {
      console.error('Failed to flush telemetry batch', error)
      // Re-queue failed events (simple retry logic)
      this.buffer = [...batch, ...this.buffer]
    } finally {
      this.isFlushing = false
    }
  }

  // Synchronous flush for beforeunload using sendBeacon if available, or fetch keepalive
  private flushSync() {
    if (this.buffer.length === 0) return
    
    const batch = [...this.buffer]
    this.buffer = []

    try {
      // Use beacon/fetch-keepalive if possible. Assuming token injection might be tricky sync,
      // but backend handles anon.
      const url = '/api/events'
      const data = JSON.stringify({ events: batch })
      
      const token = localStorage.getItem('auth_store') 
        ? JSON.parse(localStorage.getItem('auth_store') as string).state?.token 
        : null

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } else {
        fetch(url, {
          method: 'POST',
          headers,
          body: data,
          keepalive: true
        }).catch(console.error)
      }
    } catch (e) {
      // ignore on unload
    }
  }
}

export const telemetry = new TelemetryService()
