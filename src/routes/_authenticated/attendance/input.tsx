import { createFileRoute } from '@tanstack/react-router'
import { AttendanceInput } from '@/features/attendance/input'

export const Route = createFileRoute('/_authenticated/attendance/input')({
  component: AttendanceInput,
})
