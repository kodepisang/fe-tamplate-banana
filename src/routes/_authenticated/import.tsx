import { createFileRoute } from '@tanstack/react-router'
import ImportData from '@/features/import'

export const Route = createFileRoute('/_authenticated/import')({
  component: ImportData,
})
