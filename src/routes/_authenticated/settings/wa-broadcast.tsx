import { createFileRoute } from '@tanstack/react-router'
import { SettingsWaBroadcast } from '@/features/settings/wa-broadcast'

export const Route = createFileRoute('/_authenticated/settings/wa-broadcast')({
  component: SettingsWaBroadcast,
})
