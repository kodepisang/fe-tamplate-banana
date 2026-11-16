import { createFileRoute } from '@tanstack/react-router'
import { RfidGate } from '@/features/kiosk/rfid-gate'

export const Route = createFileRoute('/rfid-gate')({
  component: RfidGate,
})
