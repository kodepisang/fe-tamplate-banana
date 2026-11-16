import { createFileRoute } from '@tanstack/react-router'
import { SettingsNotificationRecipients } from '@/features/settings/notification-recipients'

export const Route = createFileRoute('/_authenticated/settings/notification-recipients')({
  component: SettingsNotificationRecipients,
})
