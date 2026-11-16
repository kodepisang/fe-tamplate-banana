import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User } from './data/schema'
import api from '@/lib/api'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get('/users')
        if (res.data.success) {
          // Map backend User to schema User if needed, or adjust schema
          const mappedUsers = res.data.data.map((u: Record<string, unknown>) => ({
            id: (u.id as number).toString(),
            firstName: (u.name as string).split(' ')[0],
            lastName: (u.name as string).split(' ').slice(1).join(' '),
            username: (u.username as string) || (u.email as string)?.split('@')[0] || (u.name as string).toLowerCase().replace(/\s/g, ''),
            email: u.email as string,
            phoneNumber: (u.profile as { phone?: string })?.phone || '',
            status: 'active',
            role: (u.roles as { name: string }[])?.map(r => r.name).join(', ') || 'GUEST',
            createdAt: u.createdAt as string,
            updatedAt: u.updatedAt as string,
          }))
          setUsers(mappedUsers)
        }
      } catch (_error) {
        // Handle error implicitly
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [refreshKey])

  return (
    <UsersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Daftar Pengguna</h2>
            <p className='text-muted-foreground'>
              Kelola data pengguna dan perannya di sini.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        {loading ? (
          <div>Memuat data...</div>
        ) : (
          <UsersTable data={users} search={search} navigate={navigate} onRefresh={() => setRefreshKey(k => k + 1)} />
        )}
      </Main>

      <UsersDialogs onRefresh={() => setRefreshKey(k => k + 1)} />
    </UsersProvider>
  )
}
