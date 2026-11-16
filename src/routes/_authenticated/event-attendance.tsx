import { createFileRoute } from '@tanstack/react-router'
import { EventAttendanceView } from '@/features/event-attendance'

export const Route = createFileRoute('/_authenticated/event-attendance')({
  component: EventAttendanceView,
})
