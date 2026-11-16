import { createFileRoute } from '@tanstack/react-router'
import { SettingsWaTemplates } from '@/features/settings/wa-templates'

export const Route = createFileRoute('/_authenticated/settings/wa-templates')({
  component: SettingsWaTemplates,
})
