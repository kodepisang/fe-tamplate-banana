import { Button } from '@/components/ui/button'

import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Analytics } from './components/analytics'
import { useAuthStore } from '@/stores/auth-store'

export function Dashboard() {
  const user = useAuthStore((state) => state.auth.user)
  const isGuru = user?.roles?.some(r => r.includes('GURU'))

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>
            {isGuru ? 'Dasbor Guru' : 'Dasbor Kepala Sekolah / Admin'}
          </h1>
          <div className='flex items-center space-x-2'>
            <Button>Download Laporan</Button>
          </div>
        </div>
        <div className='mt-4'>
          <Analytics />
        </div>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  }
]
