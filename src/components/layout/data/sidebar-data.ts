import {
  LayoutDashboard,
  Users,
  Settings,
  CheckSquare,
  FileSpreadsheet,
  BookOpen,
  School,
  Calendar,
  CalendarCheck
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'user@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Sekolah App',
      logo: School,
      plan: 'Attendance System',
    }
  ],
  navGroups: [
    {
      title: 'Menu Utama',
      items: [
        {
          title: 'Dasbor',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Input Kehadiran',
          url: '/attendance/input',
          icon: CheckSquare,
          roles: ['ADMINISTRATOR', 'GURU_MAPEL', 'GURU_WALI_KELAS'],
        },
        {
          title: 'Laporan Kehadiran',
          url: '/reports',
          icon: FileSpreadsheet,
          roles: ['ADMINISTRATOR', 'KEPALA_SEKOLAH', 'GURU_BK'],
        },
      ],
    },
    {
      title: 'Data Master',
      items: [
        {
          title: 'Manajemen Pengguna',
          url: '/users',
          icon: Users,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Manajemen Role',
          url: '/roles',
          icon: Settings,
          roles: ['ADMINISTRATOR'],
        },
        {
          title: 'Data Siswa',
          url: '/students',
          icon: Users,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Data Guru',
          url: '/teachers',
          icon: Users,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Data Kelas',
          url: '/classes',
          icon: School,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Tahun Akademik',
          url: '/academic-years',
          icon: Calendar,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Data Mata Pelajaran',
          url: '/subjects',
          icon: BookOpen,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Upload Data',
          url: '/import',
          icon: FileSpreadsheet,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Kegiatan & Event',
          url: '/events',
          icon: Calendar,
          roles: ['ADMINISTRATOR', 'TU', 'GURU_MAPEL', 'GURU_BK'],
        }
      ],
    },
    {
      title: 'Lainnya',
      items: [
        {
          title: 'Log Absensi Gerbang',
          url: '/gate-attendance',
          icon: CheckSquare,
        },
        {
          title: 'Log Kehadiran Kegiatan',
          url: '/event-attendance',
          icon: CalendarCheck,
          roles: ['ADMINISTRATOR', 'TU', 'GURU_MAPEL', 'GURU_BK', 'KEPALA_SEKOLAH', 'GURU_WALI_KELAS'],
        },
        {
          title: 'Kiosk Tap Kegiatan',
          url: '/event-kiosk',
          icon: CheckSquare,
        },
        {
          title: 'Konfigurasi Jam Absensi',
          url: '/attendance-settings',
          icon: Calendar,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Kalender Absensi',
          url: '/calendar-settings',
          icon: Calendar,
          roles: ['ADMINISTRATOR', 'TU'],
        },
        {
          title: 'Pengaturan',
          url: '/settings',
          icon: Settings,
        }
      ],
    },
  ],
}
