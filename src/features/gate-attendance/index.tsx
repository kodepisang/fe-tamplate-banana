import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getServerTime } from '@/lib/server-time'
import { GenericDataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Download,
  Eye,
  Phone,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  QrCode,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from '@tanstack/react-router'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type WaLogItem = {
  id: number | string
  eventType: string
  createdAt: string
  status: string
}

export type StudentUser = {
  id: number
  name: string
  email?: string
  profile?: {
    nomorInduk?: string
    guardianPhone?: string
    avatarUrl?: string
    classId?: number
    class?: {
      id: number
      name: string
    }
  }
}

export type GateLogData = {
  id: number
  userId: number
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  status: string
  user: {
    name: string
    profile?: {
      nomorInduk?: string
      guardianPhone?: string
      avatarUrl?: string
      classId?: number
      class?: {
        name: string
      }
    }
  }
}

export interface GateClassAnalysisItem {
  className: string
  total: number
  hadir: number
  terlambat: number
  pulang: number
  alpha: number
  totalHadir: number
  percentage: number
}

export function GateAttendance() {
  const [logs, setLogs] = useState<GateLogData[]>([])
  const [usersList, setUsersList] = useState<StudentUser[]>([])
  const [classesList, setClassesList] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    format(getServerTime(), 'yyyy-MM-dd')
  )
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL')

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<GateLogData | null>(null)
  const [studentWaLogs, setStudentWaLogs] = useState<WaLogItem[]>([])
  const [loadingWaLogs, setLoadingWaLogs] = useState(false)

  // Fetch initial classes
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

  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)
      const [resLogs, resUsers] = await Promise.all([
        api.get('/attendances/gate-logs', { params: { date: selectedDate } }),
        api.get('/users?role=MURID'),
      ])
      if (resLogs.data.success) {
        setLogs(resLogs.data.data)
      }
      if (resUsers.data.success) {
        setUsersList(resUsers.data.data)
      }
      setLastUpdated(format(getServerTime(), 'HH:mm:ss'))
    } catch (_error) {
      if (isManual) toast.error('Gagal memuat data absensi gerbang')
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [selectedDate])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) await fetchData()
    }
    load()
    return () => {
      isMounted = false
    }
  }, [fetchData])

  // Real-time polling every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchData(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  const handleOpenDetail = async (log: GateLogData) => {
    setSelectedLog(log)
    try {
      setLoadingWaLogs(true)
      const res = await api.get(`/whatsapp/logs?limit=10`)
      if (res.data.success) {
        const userWaLogs = res.data.data.filter(
          (l: { studentId?: number }) => l.studentId === log.userId
        )
        setStudentWaLogs(userWaLogs)
      }
    } catch (_err) {
      // silent
    } finally {
      setLoadingWaLogs(false)
    }
  }

  // Filter students by selected class
  const studentsFilteredByClass = useMemo(() => {
    if (selectedClassId === 'ALL') return usersList
    const targetClassId = parseInt(selectedClassId, 10)
    return usersList.filter((u) => u.profile?.classId === targetClassId)
  }, [usersList, selectedClassId])

  // Filter logs by selected date and class
  const dateFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchDate = format(new Date(log.date), 'yyyy-MM-dd') === selectedDate
      if (!matchDate) return false
      if (selectedClassId !== 'ALL') {
        const targetClassId = parseInt(selectedClassId, 10)
        return log.user.profile?.classId === targetClassId
      }
      return true
    })
  }, [logs, selectedDate, selectedClassId])

  // Map of student userId -> GateLogData for selected date
  const logMapByUserId = useMemo(() => {
    const map = new Map<number, GateLogData>()
    for (const log of dateFilteredLogs) {
      map.set(log.userId, log)
    }
    return map
  }, [dateFilteredLogs])

  // Synthesize complete list of all students with gate attendance status
  const allStudentsWithGateStatus = useMemo(() => {
    return studentsFilteredByClass.map((student) => {
      const existingLog = logMapByUserId.get(student.id)
      if (existingLog) {
        return existingLog
      }
      // Absent / Alpha record
      return {
        id: -student.id,
        userId: student.id,
        date: selectedDate,
        checkInTime: null,
        checkOutTime: null,
        status: 'ALPHA',
        user: {
          name: student.name,
          profile: {
            nomorInduk: student.profile?.nomorInduk || '-',
            guardianPhone: student.profile?.guardianPhone,
            avatarUrl: student.profile?.avatarUrl,
            classId: student.profile?.classId,
            class: student.profile?.class ? { name: student.profile.class.name } : undefined,
          },
        },
      } as GateLogData
    })
  }, [studentsFilteredByClass, logMapByUserId, selectedDate])

  // Filtered by active status tab and search query
  const finalFilteredLogs = useMemo(() => {
    return allStudentsWithGateStatus.filter((log) => {
      // Tab filter
      if (activeStatusTab === 'HADIR' && log.status !== 'HADIR') return false
      if (activeStatusTab === 'TERLAMBAT' && log.status !== 'TERLAMBAT') return false
      if (activeStatusTab === 'PULANG' && log.status !== 'PULANG') return false
      if (activeStatusTab === 'ALPHA' && log.status !== 'ALPHA') return false

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = log.user.name.toLowerCase().includes(q)
        const matchNis = (log.user.profile?.nomorInduk || '').toLowerCase().includes(q)
        const matchClass = (log.user.profile?.class?.name || '').toLowerCase().includes(q)
        if (!matchName && !matchNis && !matchClass) return false
      }

      return true
    })
  }, [allStudentsWithGateStatus, activeStatusTab, searchQuery])

  // Dashboard Metrics for selected date & class
  const totalSiswa = studentsFilteredByClass.length
  const totalHadir = dateFilteredLogs.filter((log) => log.status === 'HADIR').length
  const totalTerlambat = dateFilteredLogs.filter((log) => log.status === 'TERLAMBAT').length
  const totalPulang = dateFilteredLogs.filter((log) => log.status === 'PULANG').length
  const totalHadirKeseluruhan = totalHadir + totalTerlambat + totalPulang
  const totalTidakHadir = Math.max(0, totalSiswa - totalHadirKeseluruhan)
  const attendanceRate = totalSiswa > 0 ? Number(((totalHadirKeseluruhan / totalSiswa) * 100).toFixed(1)) : 0
  const onTimeRate = totalHadirKeseluruhan > 0 ? Number(((totalHadir / totalHadirKeseluruhan) * 100).toFixed(1)) : 0

  // Formatted date string in Indonesian
  const dateFormatted = useMemo(() => {
    return new Date(`${selectedDate}T12:00:00.000+07:00`).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    })
  }, [selectedDate])

  // Performance category label
  let performanceLabel = 'Perlu Perhatian'
  if (attendanceRate >= 90) performanceLabel = 'Sangat Baik'
  else if (attendanceRate >= 75) performanceLabel = 'Baik'
  else if (attendanceRate >= 60) performanceLabel = 'Cukup'

  // Per-Class Breakdown
  const classAnalysis = useMemo(() => {
    const classMap = new Map<string, GateClassAnalysisItem>()

    for (const item of allStudentsWithGateStatus) {
      const cName = item.user.profile?.class?.name || 'Tanpa Kelas'
      if (!classMap.has(cName)) {
        classMap.set(cName, {
          className: cName,
          total: 0,
          hadir: 0,
          terlambat: 0,
          pulang: 0,
          alpha: 0,
          totalHadir: 0,
          percentage: 0,
        })
      }
      const entry = classMap.get(cName)!
      entry.total += 1
      if (item.status === 'HADIR') {
        entry.hadir += 1
        entry.totalHadir += 1
      } else if (item.status === 'TERLAMBAT') {
        entry.terlambat += 1
        entry.totalHadir += 1
      } else if (item.status === 'PULANG') {
        entry.pulang += 1
        entry.totalHadir += 1
      } else {
        entry.alpha += 1
      }
    }

    return Array.from(classMap.values())
      .map((c) => ({
        ...c,
        percentage: c.total > 0 ? Number(((c.totalHadir / c.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.className.localeCompare(b.className))
  }, [allStudentsWithGateStatus])

  // Analysis Narrative Summary
  const analysisSummary = useMemo(() => {
    if (totalSiswa === 0) {
      return 'Belum ada data siswa terdaftar pada kelas yang dipilih.'
    }

    if (totalHadirKeseluruhan === 0) {
      return `Pada ${dateFormatted}, belum ada siswa yang mencatatkan presensi di gerbang sekolah. Dari total ${totalSiswa} siswa terdaftar, seluruhnya tercatat belum hadir/alpa.`
    }

    let classHighlight = ''
    if (classAnalysis.length > 0) {
      const sortedByRate = [...classAnalysis].sort((a, b) => b.percentage - a.percentage)
      const best = sortedByRate[0]
      const worst = sortedByRate[sortedByRate.length - 1]

      const mostLate = [...classAnalysis].sort((a, b) => b.terlambat - a.terlambat)[0]

      if (best && best.percentage > 0) {
        classHighlight += ` Kehadiran tertinggi diraih oleh kelas ${best.className} (${best.percentage}%).`
      }
      if (mostLate && mostLate.terlambat > 0) {
        classHighlight += ` Keterlambatan terbanyak terdapat pada kelas ${mostLate.className} (${mostLate.terlambat} siswa).`
      } else if (worst && worst.alpha > 0 && worst.className !== best?.className) {
        classHighlight += ` Ketidakhadiran terbanyak terdapat pada kelas ${worst.className} (${worst.alpha} siswa alpa).`
      }
    }

    const punctualityText = onTimeRate > 0 ? ` Sebanyak ${onTimeRate}% siswa yang hadir datang tepat waktu.` : ''

    return `Pada ${dateFormatted}, tingkat kehadiran siswa di gerbang mencapai ${attendanceRate}% (${performanceLabel}). Dari total ${totalSiswa} siswa terdaftar, sebanyak ${totalHadir} siswa (${((totalHadir / totalSiswa) * 100).toFixed(1)}%) hadir tepat waktu, ${totalTerlambat} siswa (${((totalTerlambat / totalSiswa) * 100).toFixed(1)}%) terlambat, dan ${totalTidakHadir} siswa (${((totalTidakHadir / totalSiswa) * 100).toFixed(1)}%) belum hadir/alpa.${punctualityText}${classHighlight}`
  }, [dateFormatted, attendanceRate, performanceLabel, totalSiswa, totalHadir, totalTerlambat, totalTidakHadir, totalHadirKeseluruhan, onTimeRate, classAnalysis])

  // Average arrival time
  const averageCheckInTime = useMemo(() => {
    const checkIns = dateFilteredLogs.filter((l) => l.checkInTime).map((l) => new Date(l.checkInTime!).getTime())
    if (checkIns.length === 0) return '-'
    const avg = checkIns.reduce((a, b) => a + b, 0) / checkIns.length
    return format(new Date(avg), 'HH:mm') + ' WIB'
  }, [dateFilteredLogs])

  // Table Columns with Action Detail Button
  const columns: ColumnDef<GateLogData>[] = [
    {
      id: 'index',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='No.' />
      ),
      cell: ({ row }) => <div className='ps-2 font-mono text-xs'>{row.index + 1}</div>,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'avatar',
      header: 'Foto',
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <Avatar className='h-8 w-8 border border-border shadow-xs'>
            <AvatarImage
              src={user.profile?.avatarUrl || ''}
              className='object-cover'
            />
            <AvatarFallback className='text-xs font-bold bg-muted text-muted-foreground'>
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'user.profile.nomorInduk',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='NIS' />
      ),
      cell: ({ row }) => <span className='font-mono text-xs'>{row.original.user.profile?.nomorInduk || '-'}</span>,
    },
    {
      accessorKey: 'user.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Siswa' />
      ),
      cell: ({ row }) => <span className='font-medium'>{row.original.user.name}</span>,
    },
    {
      accessorKey: 'user.profile.class.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kelas' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline' className='text-xs'>
          {row.original.user.profile?.class?.name || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: 'checkInTime',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jam Masuk' />
      ),
      cell: ({ row }) =>
        row.original.checkInTime ? (
          <span className='font-mono text-xs font-semibold'>
            {format(new Date(row.original.checkInTime), 'HH:mm:ss')} WIB
          </span>
        ) : (
          <span className='text-muted-foreground'>-</span>
        ),
    },
    {
      accessorKey: 'checkOutTime',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jam Keluar' />
      ),
      cell: ({ row }) =>
        row.original.checkOutTime ? (
          <span className='font-mono text-xs font-semibold'>
            {format(new Date(row.original.checkOutTime), 'HH:mm:ss')} WIB
          </span>
        ) : (
          <span className='text-muted-foreground'>-</span>
        ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        if (status === 'HADIR') {
          return (
            <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white gap-1'>
              <CheckCircle2 className='h-3 w-3' /> Hadir Tepat
            </Badge>
          )
        }
        if (status === 'TERLAMBAT') {
          return (
            <Badge className='bg-amber-500 hover:bg-amber-600 text-white gap-1'>
              <Clock className='h-3 w-3' /> Terlambat
            </Badge>
          )
        }
        if (status === 'PULANG') {
          return (
            <Badge className='bg-blue-500 hover:bg-blue-600 text-white gap-1'>
              Pulang
            </Badge>
          )
        }
        return (
          <Badge variant='destructive' className='bg-rose-500 hover:bg-rose-600 gap-1'>
            <XCircle className='h-3 w-3' /> Belum Hadir / Alpha
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: 'Detail',
      cell: ({ row }) => (
        <Button
          size='sm'
          variant='ghost'
          className='h-8 w-8 p-0'
          title='Lihat Detail'
          onClick={() => handleOpenDetail(row.original)}
        >
          <Eye className='h-4 w-4 text-primary' />
        </Button>
      ),
    },
  ]

  const handleExportExcel = () => {
    const exportData = finalFilteredLogs.map((log, index) => ({
      No: index + 1,
      NIS: log.user.profile?.nomorInduk || '-',
      'Nama Siswa': log.user.name,
      Kelas: log.user.profile?.class?.name || '-',
      Tanggal: selectedDate,
      'Jam Masuk': log.checkInTime
        ? format(new Date(log.checkInTime), 'HH:mm:ss')
        : '-',
      'Jam Keluar': log.checkOutTime
        ? format(new Date(log.checkOutTime), 'HH:mm:ss')
        : '-',
      Status: log.status,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi Gerbang')
    XLSX.writeFile(
      workbook,
      `Laporan_Absensi_Gerbang_${activeStatusTab}_${selectedDate}.xlsx`
    )
    toast.success('File Excel absensi gerbang berhasil diunduh.')
  }

  // Export PDF with Complete Analysis (No overflow)
  const handleExportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    // 1. KOP SURAT RESMI
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('SISTEM INFORMASI PRESENSI & KEHADIRAN SISWA', pageWidth / 2, 16, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('LAPORAN & ANALISIS PRESENSI GERBANG', pageWidth / 2, 22, { align: 'center' })

    // Double line divider
    doc.setLineWidth(0.8)
    doc.line(14, 26, pageWidth - 14, 26)
    doc.setLineWidth(0.2)
    doc.line(14, 27.2, pageWidth - 14, 27.2)

    // 2. METADATA
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMASI LAPORAN GERBANG', 14, 34)

    doc.setFont('helvetica', 'normal')
    doc.text(`Hari / Tanggal  : ${dateFormatted}`, 14, 40)
    const selectedClassName =
      selectedClassId === 'ALL'
        ? 'Semua Kelas'
        : classesList.find((c) => String(c.id) === selectedClassId)?.name || 'Kelas Terpilih'
    doc.text(`Filter Kelas    : ${selectedClassName}`, 14, 46)
    doc.text(`Status Filter   : ${activeStatusTab === 'ALL' ? 'Semua Status' : activeStatusTab}`, 14, 52)

    doc.text(`Dicetak Pada    : ${format(new Date(), 'dd/MM/yyyy HH:mm')} WIB`, pageWidth / 2, 40)
    doc.text(`Rata-rata Masuk : ${averageCheckInTime}`, pageWidth / 2, 46)
    doc.text(`Ketepatan Waktu : ${onTimeRate}% Tepat Waktu`, pageWidth / 2, 52)

    // 3. STATISTIK KEHADIRAN (Tabel Ringkasan Metrik)
    const metricsHead = [['Total Siswa', 'Hadir Tepat', 'Terlambat', 'Belum Hadir / Alpha', 'Tingkat Kehadiran']]
    const metricsBody = [
      [
        `${totalSiswa} Siswa`,
        `${totalHadir} Siswa (${((totalHadir / Math.max(1, totalSiswa)) * 100).toFixed(1)}%)`,
        `${totalTerlambat} Siswa (${((totalTerlambat / Math.max(1, totalSiswa)) * 100).toFixed(1)}%)`,
        `${totalTidakHadir} Siswa (${((totalTidakHadir / Math.max(1, totalSiswa)) * 100).toFixed(1)}%)`,
        `${attendanceRate}% [${performanceLabel.toUpperCase()}]`,
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
        fillColor: [30, 41, 59],
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
          if (data.column.index === 1) data.cell.styles.textColor = [16, 185, 129] // Emerald green
          else if (data.column.index === 2) data.cell.styles.textColor = [245, 158, 11] // Amber
          else if (data.column.index === 3) data.cell.styles.textColor = [239, 68, 68] // Red
          else if (data.column.index === 4) data.cell.styles.textColor = [37, 99, 235] // Blue
        }
      },
      theme: 'grid',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentY = (doc as any).lastAutoTable.finalY + 7

    // 4. KOTAK ANALISIS & KESIMPULAN GERBANG (Dynamic Height & Full Width)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text('ANALISIS & KESIMPULAN KEHADIRAN GERBANG', 14, currentY)

    const summaryWidth = pageWidth - 28 // 182mm
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const splitSummary = doc.splitTextToSize(analysisSummary, summaryWidth - 14)
    const lineHeight = 4.2
    const boxPadding = 4
    const boxHeight = (splitSummary.length * lineHeight) + (boxPadding * 2)

    // Background card for analysis
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
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
    if (classAnalysis.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text('REKAPITULASI KEHADIRAN GERBANG PER KELAS', 14, currentY)

      const classTableHead = [['No', 'Kelas', 'Total', 'Hadir Tepat', 'Terlambat', 'Alpha', '% Kehadiran']]
      const classTableBody = classAnalysis.map((c, i) => [
        i + 1,
        c.className,
        `${c.total}`,
        `${c.hadir}`,
        `${c.terlambat}`,
        `${c.alpha}`,
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
            if (data.column.index === 3) data.cell.styles.textColor = [16, 185, 129]
            else if (data.column.index === 4) data.cell.styles.textColor = [245, 158, 11]
            else if (data.column.index === 5) data.cell.styles.textColor = [239, 68, 68]
            else if (data.column.index === 6) {
              const rawPct = parseFloat(data.cell.raw)
              if (rawPct >= 80) data.cell.styles.textColor = [16, 185, 129]
              else if (rawPct < 60) data.cell.styles.textColor = [239, 68, 68]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
        theme: 'grid',
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable.finalY + 8
    }

    // 6. TABEL RINCIAN PRESENSI SISWA
    const pageHeight = doc.internal.pageSize.height
    if (currentY > pageHeight - 50) {
      doc.addPage()
      currentY = 18
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text('DAFTAR RINCI PRESENSI SISWA GERBANG', 14, currentY)

    const studentTableHead = [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Jam Masuk', 'Jam Keluar', 'Status']]
    const studentTableBody = finalFilteredLogs.map((log, idx) => [
      idx + 1,
      log.user.profile?.nomorInduk || '-',
      log.user.name,
      log.user.profile?.class?.name || '-',
      log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss') : '-',
      log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm:ss') : '-',
      log.status,
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
        2: { cellWidth: 50 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 24 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'HADIR') {
            data.cell.styles.textColor = [16, 185, 129]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.raw === 'TERLAMBAT') {
            data.cell.styles.textColor = [245, 158, 11]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.raw === 'PULANG') {
            data.cell.styles.textColor = [37, 99, 235]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [239, 68, 68]
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
    doc.text(`${dateFormatted}`, pageWidth - 65, signY)
    doc.text(`Petugas Gerbang / Piket,`, pageWidth - 65, signY + 5)
    doc.text(`( ........................................ )`, pageWidth - 65, signY + 26)

    doc.text(`Mengetahui,`, 22, signY)
    doc.text(`Kepala Sekolah / Waka Kesiswaan,`, 22, signY + 5)
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

    doc.save(`Laporan_Analisis_Absensi_Gerbang_${selectedDate}.pdf`)
    toast.success('Laporan PDF analisa absensi gerbang berhasil diunduh.')
  }

  const downloadIndividualReportPdf = (log: GateLogData) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('KARTU PRESENSI INDIVIDUAL SISWA', 14, 20)
    doc.setFontSize(10)
    doc.text(`Tanggal Cetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28)

    doc.rect(14, 33, 182, 45)
    doc.setFontSize(11)
    doc.text(`Nama Siswa   : ${log.user.name}`, 20, 43)
    doc.text(`NIS / NIP     : ${log.user.profile?.nomorInduk || '-'}`, 20, 51)
    doc.text(`Kelas         : ${log.user.profile?.class?.name || '-'}`, 20, 59)
    doc.text(`No. WA Ortu   : ${log.user.profile?.guardianPhone || '-'}`, 20, 67)

    const tableColumn = ['Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status Presensi']
    const tableRows = [
      [
        format(new Date(log.date), 'dd/MM/yyyy'),
        log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm') : '-',
        log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm') : '-',
        log.status,
      ],
    ]

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 85,
    })

    doc.save(`Presensi_${log.user.name.replace(/\s+/g, '_')}_${selectedDate}.pdf`)
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2'>
          <Clock className='h-5 w-5 text-primary' />
          <h1 className='text-base font-semibold sm:text-lg'>Dashboard Absensi Gerbang</h1>
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
              <h2 className='text-2xl font-bold tracking-tight'>
                Dashboard Absensi Gerbang
              </h2>
              <Badge variant='outline' className='flex items-center gap-1.5 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'>
                <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                Real-Time
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground'>
              Pantau kehadiran siswa secara real-time dari pintu gerbang sekolah.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => fetchData(true)}
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
              <Link to='/rfid-gate'>
                <QrCode className='mr-1.5 h-4 w-4 text-primary' />
                Kiosk Gerbang RFID
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <Card className='border bg-card shadow-sm'>
          <CardContent className='p-4'>
            <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end'>
              {/* Date Filter */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>Tanggal Presensi</label>
                <div className='flex gap-1'>
                  <Input
                    type='date'
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className='text-sm'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    type='button'
                    onClick={() => setSelectedDate(format(getServerTime(), 'yyyy-MM-dd'))}
                    title='Kembali ke hari ini'
                    className='px-2.5 text-xs'
                  >
                    Hari Ini
                  </Button>
                </div>
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

              {/* Quick Info */}
              <div className='space-y-1 text-xs text-muted-foreground'>
                <div>
                  Hari: <span className='font-semibold text-foreground'>{dateFormatted}</span>
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
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {/* Total Siswa */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveStatusTab('ALL')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Total Siswa</CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold tracking-tight'>{totalSiswa}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                Siswa terdaftar
              </p>
            </CardContent>
          </Card>

          {/* Hadir Tepat Waktu */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'HADIR' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setActiveStatusTab('HADIR')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-emerald-700 dark:text-emerald-400'>
                Hadir Tepat
              </CardTitle>
              <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-emerald-600 dark:text-emerald-400'>{totalHadir}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                  {totalSiswa > 0 ? ((totalHadir / totalSiswa) * 100).toFixed(1) : 0}%
                </span>{' '}
                tepat waktu
              </p>
            </CardContent>
          </Card>

          {/* Terlambat */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'TERLAMBAT' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setActiveStatusTab('TERLAMBAT')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-amber-700 dark:text-amber-400'>
                Terlambat
              </CardTitle>
              <Clock className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-amber-600 dark:text-amber-400'>{totalTerlambat}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-amber-600 dark:text-amber-400'>
                  {totalSiswa > 0 ? ((totalTerlambat / totalSiswa) * 100).toFixed(1) : 0}%
                </span>{' '}
                lewat jam masuk
              </p>
            </CardContent>
          </Card>

          {/* Belum Hadir / Alpha */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'ALPHA' ? 'ring-2 ring-rose-500' : ''}`}
            onClick={() => setActiveStatusTab('ALPHA')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-rose-700 dark:text-rose-400'>
                Belum Hadir / Alpa
              </CardTitle>
              <XCircle className='h-4 w-4 text-rose-500' />
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-rose-600 dark:text-rose-400'>{totalTidakHadir}</div>
              <p className='text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-rose-600 dark:text-rose-400'>
                  {totalSiswa > 0 ? ((totalTidakHadir / totalSiswa) * 100).toFixed(1) : 0}%
                </span>{' '}
                belum tap gerbang
              </p>
            </CardContent>
          </Card>

          {/* Tingkat Partisipasi Keseluruhan */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>Kehadiran Total</CardTitle>
              <TrendingUp className='h-4 w-4 text-primary' />
            </CardHeader>
            <CardContent>
              <div className='flex items-baseline justify-between'>
                <div className='text-3xl font-bold'>{attendanceRate}%</div>
                <Badge
                  variant='secondary'
                  className={
                    attendanceRate >= 75
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }
                >
                  {performanceLabel}
                </Badge>
              </div>
              <div className='w-full bg-muted rounded-full h-2 mt-3 overflow-hidden'>
                <div
                  className='bg-primary h-2 rounded-full transition-all duration-500'
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Dashboard Analisa Kehadiran Gerbang */}
        <Card className='border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-sm'>
          <CardHeader className='pb-2'>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                Analisa Kehadiran Gerbang: {dateFormatted}
              </CardTitle>
            </div>
            <CardDescription>
              Insight dan evaluasi presensi siswa gerbang sekolah
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Narrative Summary */}
            <p className='text-sm leading-relaxed text-foreground/90 bg-muted/40 p-3.5 rounded-lg border'>
              {analysisSummary}
            </p>

            {/* Quick Insights Row */}
            <div className='grid gap-3 sm:grid-cols-3'>
              <div className='p-3 rounded-lg border bg-background text-xs space-y-1'>
                <div className='text-muted-foreground flex items-center gap-1.5'>
                  <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                  <span>Ketepatan Waktu</span>
                </div>
                <div className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                  {onTimeRate}%
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Dari seluruh siswa yang hadir di gerbang
                </div>
              </div>

              <div className='p-3 rounded-lg border bg-background text-xs space-y-1'>
                <div className='text-muted-foreground flex items-center gap-1.5'>
                  <Clock className='h-3.5 w-3.5 text-primary' />
                  <span>Rata-Rata Waktu Masuk</span>
                </div>
                <div className='text-lg font-bold font-mono'>
                  {averageCheckInTime}
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Waktu rata-rata tap kartu siswa
                </div>
              </div>

              <div className='p-3 rounded-lg border bg-background text-xs space-y-1'>
                <div className='text-muted-foreground flex items-center gap-1.5'>
                  <Users className='h-3.5 w-3.5 text-blue-500' />
                  <span>Siswa Pulang Tercatat</span>
                </div>
                <div className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  {totalPulang} Siswa
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Telah tap gerbang keluar
                </div>
              </div>
            </div>

            {/* Per-Class Analysis Breakdown */}
            {classAnalysis.length > 0 && (
              <div>
                <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5'>
                  <Layers className='h-3.5 w-3.5' /> Rekapitulasi Presensi per Kelas
                </h4>
                <div className='grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
                  {classAnalysis.map((c) => (
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
                        <span className='text-emerald-600 dark:text-emerald-400'>Tepat: {c.hadir}</span>
                        <span className='text-amber-600 dark:text-amber-400'>Telat: {c.terlambat}</span>
                        <span className='text-rose-600 dark:text-rose-400'>Alpa: {c.alpha}</span>
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

        {/* Toolbar: Filter Tabs & Search */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-2'>
          <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab}>
            <TabsList>
              <TabsTrigger value='ALL'>Semua ({allStudentsWithGateStatus.length})</TabsTrigger>
              <TabsTrigger value='HADIR' className='text-emerald-700 dark:text-emerald-400'>
                Hadir Tepat ({totalHadir})
              </TabsTrigger>
              <TabsTrigger value='TERLAMBAT' className='text-amber-700 dark:text-amber-400'>
                Terlambat ({totalTerlambat})
              </TabsTrigger>
              <TabsTrigger value='PULANG' className='text-blue-700 dark:text-blue-400'>
                Pulang ({totalPulang})
              </TabsTrigger>
              <TabsTrigger value='ALPHA' className='text-rose-700 dark:text-rose-400'>
                Alpa ({totalTidakHadir})
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
        <div className='w-full'>
          {loading ? (
            <div className='py-12 text-center text-muted-foreground'>
              <RefreshCw className='h-6 w-6 animate-spin mx-auto mb-2 text-primary' />
              Memuat data absensi gerbang...
            </div>
          ) : (
            <GenericDataTable columns={columns} data={finalFilteredLogs} />
          )}
        </div>

        {/* Student Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          {selectedLog && (
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Detail Presensi Siswa</DialogTitle>
              </DialogHeader>

              <div className='space-y-4 py-2 text-sm'>
                {/* Profile Header */}
                <div className='flex items-center gap-4 p-3 bg-muted rounded-lg'>
                  <Avatar className='h-12 w-12'>
                    <AvatarImage src={selectedLog.user.profile?.avatarUrl || ''} />
                    <AvatarFallback>{selectedLog.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className='font-bold text-base'>{selectedLog.user.name}</h4>
                    <p className='text-xs text-muted-foreground'>
                      NIS: {selectedLog.user.profile?.nomorInduk || '-'} | Kelas: {selectedLog.user.profile?.class?.name || '-'}
                    </p>
                    <div className='flex items-center gap-1 mt-1 text-xs text-muted-foreground'>
                      <Phone className='h-3 w-3' />
                      Ortu: {selectedLog.user.profile?.guardianPhone || 'Belum diisi'}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className='grid grid-cols-2 gap-2 text-center'>
                  <div className='p-2 border rounded-md'>
                    <span className='text-xs text-muted-foreground block'>Jam Masuk</span>
                    <span className='font-bold font-mono text-sm'>
                      {selectedLog.checkInTime ? format(new Date(selectedLog.checkInTime), 'HH:mm:ss') : '-'}
                    </span>
                  </div>
                  <div className='p-2 border rounded-md'>
                    <span className='text-xs text-muted-foreground block'>Jam Keluar</span>
                    <span className='font-bold font-mono text-sm'>
                      {selectedLog.checkOutTime ? format(new Date(selectedLog.checkOutTime), 'HH:mm:ss') : '-'}
                    </span>
                  </div>
                </div>

                <div className='p-2.5 border rounded-md text-xs text-center'>
                  <span className='text-muted-foreground block mb-1'>Status Presensi</span>
                  <Badge
                    className={
                      selectedLog.status === 'HADIR'
                        ? 'bg-emerald-500'
                        : selectedLog.status === 'TERLAMBAT'
                          ? 'bg-amber-500'
                          : selectedLog.status === 'PULANG'
                            ? 'bg-blue-500'
                            : 'bg-rose-500'
                    }
                  >
                    {selectedLog.status}
                  </Badge>
                </div>

                {/* WA Delivery History */}
                <div className='space-y-2 border-t pt-3'>
                  <h5 className='font-semibold text-xs text-muted-foreground uppercase tracking-wider'>
                    Riwayat Pengiriman WA
                  </h5>
                  {loadingWaLogs ? (
                    <p className='text-xs text-muted-foreground'>Memuat riwayat WA...</p>
                  ) : studentWaLogs.length === 0 ? (
                    <p className='text-xs text-muted-foreground italic'>Belum ada notifikasi WA terkirim.</p>
                  ) : (
                    <div className='space-y-1.5 max-h-32 overflow-y-auto pr-1'>
                      {studentWaLogs.map((wa) => (
                        <div key={wa.id} className='flex items-center justify-between text-xs p-2 rounded bg-muted/60'>
                          <div>
                            <span className='font-semibold'>{wa.eventType}</span>
                            <span className='text-[10px] text-muted-foreground ml-2'>
                              {format(new Date(wa.createdAt), 'HH:mm')}
                            </span>
                          </div>
                          <Badge variant={wa.status === 'SENT' ? 'default' : 'destructive'} className='text-[10px]'>
                            {wa.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className='pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => downloadIndividualReportPdf(selectedLog)}
                >
                  <FileText className='mr-1.5 h-4 w-4' /> Download PDF Individual
                </Button>
                <Button size='sm' onClick={() => setSelectedLog(null)}>
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
