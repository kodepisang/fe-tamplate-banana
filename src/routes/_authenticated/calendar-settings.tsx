import { createFileRoute } from '@tanstack/react-router'
import { CalendarSettings } from '@/features/calendar-settings'

export const Route = createFileRoute('/_authenticated/calendar-settings')({
  component: CalendarSettings,
})
