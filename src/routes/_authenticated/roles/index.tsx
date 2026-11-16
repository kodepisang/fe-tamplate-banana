import { createFileRoute } from '@tanstack/react-router';
import RoleManagement from '@/features/roles';

export const Route = createFileRoute('/_authenticated/roles/')({
  component: RoleManagement,
});
