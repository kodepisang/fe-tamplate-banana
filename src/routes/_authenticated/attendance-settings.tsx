import { createFileRoute } from '@tanstack/react-router'
import { AttendanceSettings } from '@/features/attendance-settings'

export const Route = createFileRoute('/_authenticated/attendance-settings')({
  component: AttendanceSettings,
})
