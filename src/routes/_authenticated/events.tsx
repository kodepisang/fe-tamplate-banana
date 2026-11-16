import { createFileRoute } from '@tanstack/react-router'
import { ManagementEvents } from '@/features/events'

export const Route = createFileRoute('/_authenticated/events')({
  component: ManagementEvents,
})
