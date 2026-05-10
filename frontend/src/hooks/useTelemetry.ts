import { useEffect } from 'react'
import { telemetry } from '../services/telemetry'

export const useTelemetry = () => {
  return {
    track: (...args: Parameters<typeof telemetry.track>) => telemetry.track(...args)
  }
}

export const useTrackView = (productId?: number) => {
  useEffect(() => {
    if (productId) {
      telemetry.track('view', productId)
    }
  }, [productId])
}
