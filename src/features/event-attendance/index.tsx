import { useEffect, useState, useCallback, useMemo } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getServerTime } from '@/lib/server-time'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Users,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Clock,
  Download,
  FileText,
  RefreshCw,
  QrCode,
  Search,
  Phone,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Eye,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { EventAttendanceChart } from './components/event-attendance-chart'

export interface EventItem {
  id: number
  name: string
  description?: string | null
  startTime?: string | null
  endTime?: string | null
  isActive: boolean
}

export interface StudentWithStatus {
  userId: number
  name: string
  nomorInduk: string
  className: string
  classId: number | null
  guardianPhone: string | null
  avatarUrl: string | null
  status: 'HADIR' | 'TIDAK_HADIR'
  tapTime: string | null
  notes: string | null
}

export interface ClassAnalysisItem {
  className: string
  total: number
  attended: number
  unattended: number
  percentage: number
}

export interface EventDashboardData {
  events: EventItem[]
  currentEvent: EventItem | null
  date: string
  dateFormatted: string
  totalStudents: number
  attendedCount: number
  unattendedCount: number
  attendanceRate: number
  performanceLabel: string
  studentsWithStatus: StudentWithStatus[]
  classAnalysis: ClassAnalysisItem[]
  analysisSummary: string
}

export function EventAttendanceView() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Filters
  const [startDate, setStartDate] = useState<string>(
    format(getServerTime(), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState<string>(
    format(getServerTime(), 'yyyy-MM-dd')
  )
  const [isRangeMode, setIsRangeMode] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'HADIR' | 'TIDAK_HADIR'>('ALL')

  // Data
  const [dashboardData, setDashboardData] = useState<EventDashboardData | null>(null)
  const [classesList, setClassesList] = useState<{ id: number; name: string }[]>([])

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStatus | null>(null)

  // Fetch classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await api.get('/classes')
        if (res.data.success) {
          setClassesList(res.data.data)
        }
      } catch (_err) {
        // ignore
      }
    }
    loadClasses()
  }, [])

  // Fetch dashboard data
  const fetchDashboard = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true)
        const params: Record<string, string | number> = {}
        if (startDate === endDate) {
          params.date = startDate
        } else {
          params.startDate = startDate
          params.endDate = endDate
        }
        if (selectedEventId) {
          params.eventId = selectedEventId
        }
        if (selectedClassId !== 'ALL') {
          params.classId = parseInt(selectedClassId, 10)
        }

        const res = await api.get('/events/dashboard', { params })
        if (res.data.success) {
          const data: EventDashboardData = res.data.data
          setDashboardData(data)
          if (!selectedEventId && data.currentEvent) {
            setSelectedEventId(data.currentEvent.id)
          }
          setLastUpdated(format(getServerTime(), 'HH:mm:ss'))
        }
      } catch (_err) {
        if (isManual) toast.error('Gagal memperbarui data presensi kegiatan')
      } finally {
        setLoading(false)
        if (isManual) setRefreshing(false)
      }
    },
    [startDate, endDate, selectedEventId, selectedClassId]
  )

  // Initial and reactive fetch
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) await fetchDashboard()
    }
    load()
    return () => {
      isMounted = false
    }
  }, [fetchDashboard])

  // Real-time polling (every 10 seconds if auto-refresh is active and viewing today)
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchDashboard(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchDashboard])

  // Filtered students by tab and search
  const filteredStudents = useMemo(() => {
    if (!dashboardData) return []
    return dashboardData.studentsWithStatus.filter((s) => {
      // Tab filter
      if (activeTab === 'HADIR' && s.status !== 'HADIR') return false
      if (activeTab === 'TIDAK_HADIR' && s.status !== 'TIDAK_HADIR') return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = s.name.toLowerCase().includes(q)
        const matchNis = s.nomorInduk.toLowerCase().includes(q)
        const matchClass = s.className.toLowerCase().includes(q)
        if (!matchName && !matchNis && !matchClass) return false
      }

      return true
    })
  }, [dashboardData, activeTab, searchQuery])

  // Export to Excel
  const handleExportExcel = () => {
    if (!dashboardData || !dashboardData.currentEvent) {
      toast.error('Tidak ada data untuk diexport.')
      return
    }

    const exportRows = dashboardData.studentsWithStatus.map((s, idx) => ({
      No: idx + 1,
      NIS: s.nomorInduk,
      'Nama Siswa': s.name,
      Kelas: s.className,
      Kegiatan: dashboardData.currentEvent?.name || '-',
      Tanggal: dashboardData.date,
      Status: s.status === 'HADIR' ? 'Hadir' : 'Tidak Hadir',
      'Waktu Presensi': s.tapTime ? format(new Date(s.tapTime), 'HH:mm:ss') : '-',
      Keterangan: s.notes || (s.status === 'HADIR' ? 'Hadir Mengikuti Kegiatan' : 'Tidak Hadir'),
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran Kegiatan')

    const cleanName = dashboardData.currentEvent.name.replace(/[^a-zA-Z0-9]/g, '_')
    XLSX.writeFile(wb, `Log_Kehadiran_${cleanName}_${dashboardData.date}.xlsx`)
    toast.success('File Excel berhasil diunduh.')
  }

  // Export to PDF with Analysis
  const handleExportPDF = () => {
    if (!dashboardData || !dashboardData.currentEvent) {
      toast.error('Tidak ada data untuk diexport.')
      return
    }

    const doc = new jsPDF()
    const evt = dashboardData.currentEvent
    const pageWidth = doc.internal.pageSize.width

    // 1. KOP SURAT
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('SISTEM INFORMASI PRESENSI & KEHADIRAN SISWA', pageWidth / 2, 16, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('LAPORAN & ANALISIS KEHADIRAN KEGIATAN', pageWidth / 2, 22, { align: 'center' })

    // Double line divider
    doc.setLineWidth(0.8)
    doc.line(14, 26, pageWidth - 14, 26)
    doc.setLineWidth(0.2)
    doc.line(14, 27.2, pageWidth - 14, 27.2)

    // 2. INFORMASI KEGIATAN
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMASI KEGIATAN', 14, 34)

    doc.setFont('helvetica', 'normal')
    doc.text(`Nama Kegiatan   : ${evt.name.toUpperCase()}`, 14, 40)
    doc.text(`Hari / Tanggal  : ${dashboardData.dateFormatted}`, 14, 46)
    doc.text(`Waktu Pelaksanaan: ${evt.startTime || '-'} s/d ${evt.endTime || '-'} WIB`, 14, 52)

    const selectedClassName =
      selectedClassId === 'ALL'
        ? 'Semua Kelas'
        : classesList.find((c) => String(c.id) === selectedClassId)?.name || 'Kelas Terpilih'
    doc.text(`Filter Kelas    : ${selectedClassName}`, pageWidth / 2, 40)
    doc.text(`Status Kegiatan : ${evt.isActive ? 'Aktif' : 'Nonaktif'}`, pageWidth / 2, 46)
    doc.text(`Dicetak Pada    : ${format(new Date(), 'dd/MM/yyyy HH:mm')} WIB`, pageWidth / 2, 52)

    // 3. STATISTIK KEHADIRAN (Tabel Ringkasan Metrik)
    const metricsHead = [['Total Siswa Terdaftar', 'Hadir Mengikuti', 'Tidak Hadir', 'Tingkat Partisipasi']]
    const metricsBody = [
      [
        `${dashboardData.totalStudents} Siswa`,
        `${dashboardData.attendedCount} Siswa (${dashboardData.attendanceRate}%)`,
        `${dashboardData.unattendedCount} Siswa (${(100 - dashboardData.attendanceRate).toFixed(1)}%)`,
        `${dashboardData.attendanceRate}% [${dashboardData.performanceLabel.toUpperCase()}]`,
      ],
    ]

    autoTable(doc, {
      head: metricsHead,
      body: metricsBody,
      startY: 58,
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        halign: 'center',
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: 255,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontStyle: 'bold',
        textColor: [15, 23, 42],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          if (data.column.index === 1) {
            data.cell.styles.textColor = [16, 185, 129] // Emerald green
          } else if (data.column.index === 2) {
            data.cell.styles.textColor = [239, 68, 68] // Red
          } else if (data.column.index === 3) {
            data.cell.styles.textColor = [37, 99, 235] // Blue
          }
        }
      },
      theme: 'grid',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentY = (doc as any).lastAutoTable.finalY + 7

    // 4. KOTAK ANALISIS & KESIMPULAN KEGIATAN (Dynamic Height & Full Width)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text('ANALISIS & KESIMPULAN KEGIATAN', 14, currentY)

    const summaryWidth = pageWidth - 28 // 182mm
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const splitSummary = doc.splitTextToSize(dashboardData.analysisSummary, summaryWidth - 14)
    const lineHeight = 4.2
    const boxPadding = 4
    const boxHeight = (splitSummary.length * lineHeight) + (boxPadding * 2)

    // Background card for analysis
    doc.setDrawColor(226, 232, 240) // border-slate-200
    doc.setFillColor(248, 250, 252) // slate-50
    doc.roundedRect(14, currentY + 2.5, summaryWidth, boxHeight, 1.5, 1.5, 'FD')

    // Deep blue accent border on the left
    doc.setFillColor(40, 53, 147)
    doc.roundedRect(14, currentY + 2.5, 2.5, boxHeight, 1, 1, 'F')

    // Text inside box
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(51, 65, 85)
    doc.text(splitSummary, 20, currentY + 2.5 + boxPadding + 3.2)

    currentY = currentY + 2.5 + boxHeight + 7

    // 5. TABEL ANALISIS PER KELAS
    if (dashboardData.classAnalysis.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('REKAPITULASI KEHADIRAN PER KELAS', 14, currentY)

      const classTableHead = [['No', 'Kelas', 'Total Siswa', 'Hadir', 'Tidak Hadir', '% Kehadiran']]
      const classTableBody = dashboardData.classAnalysis.map((c, i) => [
        i + 1,
        c.className,
        `${c.total} Siswa`,
        `${c.attended} Siswa`,
        `${c.unattended} Siswa`,
        `${c.percentage}%`,
      ])

      autoTable(doc, {
        head: classTableHead,
        body: classTableBody,
        startY: currentY + 2.5,
        styles: { fontSize: 8, cellPadding: 2.2, halign: 'center' },
        columnStyles: {
          1: { halign: 'left', fontStyle: 'bold' },
        },
        headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: 'bold' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            if (data.column.index === 3) {
              data.cell.styles.textColor = [16, 185, 129] // Emerald
            } else if (data.column.index === 4) {
              data.cell.styles.textColor = [239, 68, 68] // Red
            } else if (data.column.index === 5) {
              const rawPct = parseFloat(data.cell.raw)
              if (rawPct >= 80) data.cell.styles.textColor = [16, 185, 129]
              else if (rawPct < 50) data.cell.styles.textColor = [239, 68, 68]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
        theme: 'grid',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable.finalY + 8
    }

    // 6. TABEL RINCIAN SISWA
    const pageHeight = doc.internal.pageSize.height
    if (currentY > pageHeight - 50) {
      doc.addPage()
      currentY = 18
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text('DAFTAR RINCI PRESENSI SISWA', 14, currentY)

    const studentTableHead = [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Waktu Presensi', 'Keterangan']]
    const studentTableBody = dashboardData.studentsWithStatus.map((s, idx) => [
      idx + 1,
      s.nomorInduk || '-',
      s.name,
      s.className,
      s.status === 'HADIR' ? 'HADIR' : 'TIDAK HADIR',
      s.tapTime ? `${format(new Date(s.tapTime), 'HH:mm:ss')} WIB` : '-',
      s.notes || (s.status === 'HADIR' ? 'Tepat Waktu' : 'Belum Presensi'),
    ])

    autoTable(doc, {
      head: studentTableHead,
      body: studentTableBody,
      startY: currentY + 2.5,
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center', fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 26 },
        2: { cellWidth: 45 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 26 },
        6: { halign: 'left' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'HADIR') {
            data.cell.styles.textColor = [16, 185, 129] // Emerald green
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [239, 68, 68] // Red
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      theme: 'grid',
    })

    // 7. LEMBAR PENGESAHAN / TANDA TANGAN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signY = (doc as any).lastAutoTable.finalY + 12
    if (signY > pageHeight - 38) {
      doc.addPage()
      signY = 22
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(`${dashboardData.dateFormatted}`, pageWidth - 65, signY)
    doc.text(`Penanggung Jawab Kegiatan,`, pageWidth - 65, signY + 5)
    doc.text(`( ........................................ )`, pageWidth - 65, signY + 26)

    doc.text(`Mengetahui,`, 22, signY)
    doc.text(`Koordinator Presensi,`, 22, signY + 5)
    doc.text(`( ........................................ )`, 22, signY + 26)

    // Page numbering on all pages
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Halaman ${i} dari ${totalPages} • Sistem Informasi Presensi Siswa`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      )
    }

    const cleanName = evt.name.replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`Laporan_Analisis_Kehadiran_${cleanName}_${dashboardData.date}.pdf`)
    toast.success('Laporan PDF lengkap dengan analisa berhasil diunduh.')
  }

  const currentEvent = dashboardData?.currentEvent

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <CalendarCheck className='h-5 w-5 text-primary' />
          <h1 className='text-base font-semibold sm:text-lg'>Log Kehadiran Kegiatan</h1>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 p-4 sm:p-6'>
        {/* Title & Real-time Indicator Banner */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-bold tracking-tight'>Log Kehadiran Kegiatan</h2>
              <Badge variant='outline' className='flex items-center gap-1.5 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'>
                <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                Real-Time
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground'>
              Pantau kehadiran siswa hari ini secara real-time per kegiatan dan per tanggal.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'secondary'}
              size='sm'
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh aktif setiap 10 detik' : 'Auto-refresh dinonaktifkan'}
            >
              <Activity className='mr-1.5 h-4 w-4' />
              {autoRefresh ? 'Auto Refresh: ON' : 'Auto Refresh: OFF'}
            </Button>
            <Button variant='outline' size='sm' asChild>
              <Link to='/event-kiosk'>
                <QrCode className='mr-1.5 h-4 w-4 text-primary' />
                Kiosk Tap Kegiatan
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <Card className='border bg-card shadow-sm'>
          <CardContent className='p-4'>
            <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 items-end'>
              {/* Event Selector */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>Pilih Kegiatan</label>
                <select
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(Number(e.target.value))}
                >
                  {dashboardData?.events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} {evt.isActive ? '(Aktif)' : '(Nonaktif)'}
                    </option>
                  ))}
                  {dashboardData?.events.length === 0 && (
                    <option value=''>Belum ada kegiatan</option>
                  )}
                </select>
              </div>

              {/* Date / Date Range Selector */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-semibold text-muted-foreground'>
                    {isRangeMode ? 'Rentang Tanggal' : 'Tanggal Kegiatan'}
                  </label>
                  <button
                    type='button'
                    onClick={() => {
                      if (!isRangeMode) {
                        setIsRangeMode(true)
                      } else {
                        setIsRangeMode(false)
                        setEndDate(startDate)
                      }
                    }}
                    className='text-[10px] text-primary hover:underline font-medium'
                  >
                    {isRangeMode ? '1 Hari' : 'Rentang'}
                  </button>
                </div>
                {!isRangeMode ? (
                  <div className='flex gap-1'>
                    <Input
                      type='date'
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setEndDate(e.target.value)
                      }}
                      className='text-sm'
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      type='button'
                      onClick={() => {
                        const today = format(getServerTime(), 'yyyy-MM-dd')
                        setStartDate(today)
                        setEndDate(today)
                      }}
                      title='Kembali ke hari ini'
                      className='px-2.5 text-xs'
                    >
                      Hari Ini
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    <div className='flex items-center gap-1'>
                      <Input
                        type='date'
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className='text-xs h-8 px-2'
                        title='Tanggal Mulai'
                      />
                      <span className='text-[10px] text-muted-foreground'>s/d</span>
                      <Input
                        type='date'
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className='text-xs h-8 px-2'
                        title='Tanggal Selesai'
                      />
                    </div>
                    <div className='flex flex-wrap gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='h-5 px-1 text-[10px]'
                        onClick={() => {
                          const today = format(getServerTime(), 'yyyy-MM-dd')
                          setStartDate(today)
                          setEndDate(today)
                          setIsRangeMode(false)
                        }}
                      >
                        Hari Ini
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='h-5 px-1 text-[10px]'
                        onClick={() => {
                          const now = getServerTime()
                          setStartDate(format(subDays(now, 6), 'yyyy-MM-dd'))
                          setEndDate(format(now, 'yyyy-MM-dd'))
                        }}
                      >
                        7 Hari
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='h-5 px-1 text-[10px]'
                        onClick={() => {
                          const now = getServerTime()
                          setStartDate(format(subDays(now, 13), 'yyyy-MM-dd'))
                          setEndDate(format(now, 'yyyy-MM-dd'))
                        }}
                      >
                        14 Hari
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='h-5 px-1 text-[10px]'
                        onClick={() => {
                          const now = getServerTime()
                          setStartDate(format(subDays(now, 29), 'yyyy-MM-dd'))
                          setEndDate(format(now, 'yyyy-MM-dd'))
                        }}
                      >
                        30 Hari
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        type='button'
                        className='h-5 px-1 text-[10px]'
                        onClick={() => {
                          const now = getServerTime()
                          setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'))
                          setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'))
                        }}
                      >
                        Bulan Ini
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Class Filter */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>Filter Kelas</label>
                <select
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value='ALL'>Semua Kelas</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Info & Refresh status */}
              <div className='space-y-1 text-xs text-muted-foreground'>
                <div>
                  Jam Acara: <span className='font-semibold text-foreground'>{currentEvent?.startTime || '-'} s/d {currentEvent?.endTime || '-'} WIB</span>
                </div>
                {lastUpdated && (
                  <div>
                    Update Terakhir: <span className='font-mono font-medium'>{lastUpdated} WIB</span>
                  </div>
                )}
              </div>

              {/* Export Buttons */}
              <div className='flex gap-2 sm:justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleExportPDF}
                  className='flex-1 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/50'
                >
                  <FileText className='mr-1.5 h-4 w-4' />
                  Export PDF
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleExportExcel}
                  className='flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/50'
                >
                  <Download className='mr-1.5 h-4 w-4' />
                  Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Metrics Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {/* Total Siswa */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Total Siswa</CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold tracking-tight'>
                {dashboardData ? dashboardData.totalStudents : 0}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Siswa terdaftar dalam sistem
              </p>
            </CardContent>
          </Card>

          {/* Hadir Mengikuti Kegiatan */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'HADIR' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setActiveTab('HADIR')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-emerald-700 dark:text-emerald-400'>
                Hadir Mengikuti Kegiatan
              </CardTitle>
              <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-emerald-600 dark:text-emerald-400'>
                {dashboardData ? dashboardData.attendedCount : 0}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                  {dashboardData ? dashboardData.attendanceRate : 0}%
                </span>{' '}
                partisipasi siswa
              </p>
            </CardContent>
          </Card>

          {/* Tidak Hadir Mengikuti Kegiatan */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'TIDAK_HADIR' ? 'ring-2 ring-rose-500' : ''}`}
            onClick={() => setActiveTab('TIDAK_HADIR')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-rose-700 dark:text-rose-400'>
                Tidak Hadir Mengikuti Kegiatan
              </CardTitle>
              <XCircle className='h-4 w-4 text-rose-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-rose-600 dark:text-rose-400'>
                {dashboardData ? dashboardData.unattendedCount : 0}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-rose-600 dark:text-rose-400'>
                  {dashboardData ? (100 - dashboardData.attendanceRate).toFixed(1) : 0}%
                </span>{' '}
                belum / tidak hadir
              </p>
            </CardContent>
          </Card>

          {/* Analisa & Partisipasi */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Tingkat Partisipasi</CardTitle>
              <TrendingUp className='h-4 w-4 text-primary' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline justify-between'>
                <div className='text-3xl font-bold'>
                  {dashboardData ? `${dashboardData.attendanceRate}%` : '0%'}
                </div>
                <Badge
                  variant='secondary'
                  className={
                    (dashboardData?.attendanceRate || 0) >= 70
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }
                >
                  {dashboardData?.performanceLabel || '-'}
                </Badge>
              </div>
              <div className='w-full bg-muted rounded-full h-2 mt-3 overflow-hidden'>
                <div
                  className='bg-primary h-2 rounded-full transition-all duration-500'
                  style={{ width: `${dashboardData?.attendanceRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Analytics Chart */}
        <EventAttendanceChart
          dashboardData={dashboardData}
          selectedEventId={selectedEventId}
          startDate={startDate}
          endDate={endDate}
          selectedDate={startDate}
          selectedClassId={selectedClassId}
          onRefresh={() => fetchDashboard(true)}
        />

        {/* Panel Analisa Kehadiran Kegiatan */}
        {dashboardData && (
          <Card className='border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-sm'>
            <CardHeader className='pb-2'>
              <div className='flex items-center gap-2'>
                <BarChart3 className='h-5 w-5 text-primary' />
                <CardTitle className='text-base font-semibold'>
                  Analisa Kehadiran Kegiatan: {currentEvent?.name || 'Kegiatan'}
                </CardTitle>
              </div>
              <CardDescription>
                {dashboardData.dateFormatted} • Waktu: {currentEvent?.startTime || '-'} - {currentEvent?.endTime || '-'} WIB
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-sm leading-relaxed text-foreground/90 bg-muted/40 p-3 rounded-lg border'>
                {dashboardData.analysisSummary}
              </p>

              {/* Per-Class Analysis Breakdown */}
              {dashboardData.classAnalysis.length > 0 && (
                <div>
                  <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5'>
                    <Layers className='h-3.5 w-3.5' /> Rekapitulasi Partisipasi per Kelas
                  </h4>
                  <div className='grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                    {dashboardData.classAnalysis.map((c) => (
                      <div
                        key={c.className}
                        className='p-2.5 rounded-md border bg-background/80 text-xs space-y-1.5'
                      >
                        <div className='flex justify-between items-center font-semibold'>
                          <span>{c.className}</span>
                          <span
                            className={
                              c.percentage >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : c.percentage >= 60
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {c.percentage}%
                          </span>
                        </div>
                        <div className='flex justify-between text-muted-foreground text-[11px]'>
                          <span>Hadir: {c.attended}/{c.total}</span>
                          <span>Absen: {c.unattended}</span>
                        </div>
                        <div className='w-full bg-muted rounded-full h-1.5 overflow-hidden'>
                          <div
                            className={`h-1.5 rounded-full ${
                              c.percentage >= 80
                                ? 'bg-emerald-500'
                                : c.percentage >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Student Table Controls & Search */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-2'>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'ALL' | 'HADIR' | 'TIDAK_HADIR')}
          >
            <TabsList>
              <TabsTrigger value='ALL'>
                Semua Siswa ({dashboardData?.totalStudents || 0})
              </TabsTrigger>
              <TabsTrigger value='HADIR' className='text-emerald-700 dark:text-emerald-400'>
                Hadir ({dashboardData?.attendedCount || 0})
              </TabsTrigger>
              <TabsTrigger value='TIDAK_HADIR' className='text-rose-700 dark:text-rose-400'>
                Tidak Hadir ({dashboardData?.unattendedCount || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='relative w-full sm:w-72'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Cari nama atau NIS siswa...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 text-sm'
            />
          </div>
        </div>

        {/* Data Table */}
        <Card className='shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm text-left border-collapse'>
              <thead className='bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b'>
                <tr>
                  <th className='py-3 px-4 w-12 text-center'>No</th>
                  <th className='py-3 px-4'>Nama Siswa</th>
                  <th className='py-3 px-4'>NIS / NIP</th>
                  <th className='py-3 px-4'>Kelas</th>
                  <th className='py-3 px-4 text-center'>Status Kehadiran</th>
                  <th className='py-3 px-4 text-center'>Waktu Presensi</th>
                  <th className='py-3 px-4 text-center'>Aksi</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {loading ? (
                  <tr>
                    <td colSpan={7} className='py-12 text-center text-muted-foreground'>
                      <RefreshCw className='h-6 w-6 animate-spin mx-auto mb-2 text-primary' />
                      Memuat data presensi kegiatan...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='py-12 text-center text-muted-foreground'>
                      Tidak ada data siswa yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr
                      key={student.userId}
                      className='hover:bg-muted/40 transition-colors'
                    >
                      <td className='py-3 px-4 text-center text-muted-foreground font-mono text-xs'>
                        {idx + 1}
                      </td>
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-2.5'>
                          <Avatar className='h-8 w-8'>
                            <AvatarImage src={student.avatarUrl || ''} />
                            <AvatarFallback className='text-xs font-semibold'>
                              {student.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className='font-medium text-foreground block'>{student.name}</span>
                            {student.guardianPhone && (
                              <span className='text-[10px] text-muted-foreground flex items-center gap-1'>
                                <Phone className='h-2.5 w-2.5' /> {student.guardianPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='py-3 px-4 font-mono text-xs text-muted-foreground'>
                        {student.nomorInduk || '-'}
                      </td>
                      <td className='py-3 px-4'>
                        <Badge variant='outline' className='text-xs'>
                          {student.className}
                        </Badge>
                      </td>
                      <td className='py-3 px-4 text-center'>
                        {student.status === 'HADIR' ? (
                          <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white gap-1'>
                            <CheckCircle2 className='h-3 w-3' /> Hadir
                          </Badge>
                        ) : (
                          <Badge variant='destructive' className='gap-1 bg-rose-500 hover:bg-rose-600'>
                            <XCircle className='h-3 w-3' /> Tidak Hadir
                          </Badge>
                        )}
                      </td>
                      <td className='py-3 px-4 text-center font-mono text-xs'>
                        {student.tapTime ? (
                          <span className='font-semibold text-foreground flex items-center justify-center gap-1'>
                            <Clock className='h-3 w-3 text-muted-foreground' />
                            {format(new Date(student.tapTime), 'HH:mm:ss')} WIB
                          </span>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </td>
                      <td className='py-3 px-4 text-center'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 w-7 p-0'
                          onClick={() => setSelectedStudent(student)}
                          title='Lihat Detail'
                        >
                          <Eye className='h-4 w-4 text-primary' />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className='p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground'>
            <span>Menampilkan {filteredStudents.length} dari {dashboardData?.totalStudents || 0} siswa</span>
            {currentEvent && (
              <span>Kegiatan: {currentEvent.name} ({currentEvent.isActive ? 'Aktif' : 'Nonaktif'})</span>
            )}
          </div>
        </Card>

        {/* Student Detail Modal */}
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          {selectedStudent && (
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Detail Presensi Siswa</DialogTitle>
              </DialogHeader>

              <div className='space-y-4 py-2 text-sm'>
                <div className='flex items-center gap-3 p-3 bg-muted rounded-lg'>
                  <Avatar className='h-12 w-12'>
                    <AvatarImage src={selectedStudent.avatarUrl || ''} />
                    <AvatarFallback>{selectedStudent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className='font-bold text-base'>{selectedStudent.name}</h4>
                    <p className='text-xs text-muted-foreground'>
                      NIS: {selectedStudent.nomorInduk || '-'} • Kelas: {selectedStudent.className}
                    </p>
                    <div className='flex items-center gap-1 mt-1 text-xs text-muted-foreground'>
                      <Phone className='h-3 w-3' />
                      No. Ortu: {selectedStudent.guardianPhone || 'Belum diisi'}
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 text-center'>
                  <div className='p-3 border rounded-lg bg-card'>
                    <span className='text-xs text-muted-foreground block mb-1'>Status Kehadiran</span>
                    {selectedStudent.status === 'HADIR' ? (
                      <Badge className='bg-emerald-500 text-white'>Hadir Mengikuti</Badge>
                    ) : (
                      <Badge variant='destructive'>Tidak Hadir</Badge>
                    )}
                  </div>
                  <div className='p-3 border rounded-lg bg-card'>
                    <span className='text-xs text-muted-foreground block mb-1'>Waktu Presensi</span>
                    <span className='font-bold font-mono text-sm'>
                      {selectedStudent.tapTime
                        ? format(new Date(selectedStudent.tapTime), 'HH:mm:ss') + ' WIB'
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className='p-3 border rounded-lg text-xs space-y-1 bg-muted/30'>
                  <div className='font-semibold'>Kegiatan yang Diikuti:</div>
                  <div className='text-muted-foreground'>{currentEvent?.name || '-'}</div>
                  <div className='text-muted-foreground'>Tanggal: {dashboardData?.dateFormatted}</div>
                </div>
              </div>

              <DialogFooter>
                <Button size='sm' onClick={() => setSelectedStudent(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </Main>
    </>
  )
}
