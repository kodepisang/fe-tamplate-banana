import { createFileRoute } from '@tanstack/react-router'
import { GateAttendance } from '@/features/gate-attendance'

export const Route = createFileRoute('/_authenticated/gate-attendance')({
  component: GateAttendance,
})
