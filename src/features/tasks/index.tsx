import { useEffect, useState } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksDialogs } from './components/tasks-dialogs'
import { TasksPrimaryButtons } from './components/tasks-primary-buttons'
import { TasksProvider } from './components/tasks-provider'
import { TasksTable } from './components/tasks-table'
import { type Task } from './data/schema'
import api from '@/lib/api'

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks')
      if (res.data.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedTasks = res.data.data.map((t: any) => ({
          id: `TASK-${t.id}`,
          title: t.title,
          status: t.status.toLowerCase(),
          label: 'feature',
          priority: 'medium',
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          assignee: t.userId ? String(t.userId) : 'Unassigned',
          description: t.description || '',
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          dbId: t.id,
        }))
        setTasks(mappedTasks)
      }
    } catch (_error) {
      // console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks()
  }, [])

  return (
    <TasksProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Tasks</h2>
            <p className='text-muted-foreground'>
              Here&apos;s a list of your tasks for this month!
            </p>
          </div>
          <TasksPrimaryButtons />
        </div>
        {loading ? (
          <div>Loading tasks...</div>
        ) : (
          <TasksTable data={tasks} onRefresh={fetchTasks} />
        )}
      </Main>

      <TasksDialogs fetchTasks={fetchTasks} />
    </TasksProvider>
  )
}
