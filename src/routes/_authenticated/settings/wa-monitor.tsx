import { createFileRoute } from '@tanstack/react-router'
import { SettingsWaMonitor } from '@/features/settings/wa-monitor'

export const Route = createFileRoute('/_authenticated/settings/wa-monitor')({
  component: SettingsWaMonitor,
})
