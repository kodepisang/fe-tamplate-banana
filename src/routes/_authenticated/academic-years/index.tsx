import { createFileRoute } from '@tanstack/react-router'
import { AcademicYears } from '@/features/academic-years'

export const Route = createFileRoute('/_authenticated/academic-years/')({
  component: AcademicYears,
})
