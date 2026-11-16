import { createFileRoute } from '@tanstack/react-router'
import { EventKiosk } from '@/features/kiosk/event-kiosk'

export const Route = createFileRoute('/event-kiosk')({
  component: EventKiosk,
})
