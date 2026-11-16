import { createFileRoute } from '@tanstack/react-router'
import { SettingsWaDevice } from '@/features/settings/wa-device'

export const Route = createFileRoute('/_authenticated/settings/wa-device')({
  component: SettingsWaDevice,
})
