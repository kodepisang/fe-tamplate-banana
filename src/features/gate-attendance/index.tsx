import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import api from '@/lib/api'
import { GenericDataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle2, Clock, XCircle, FileText, Download, Eye, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type WaLogItem = {
  id: number | string
  eventType: string
  createdAt: string
  status: string
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
      class?: {
        name: string
      }
    }
  }
}

export function GateAttendance() {
  const [logs, setLogs] = useState<GateLogData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSiswa, setTotalSiswa] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL')

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<GateLogData | null>(null)
  const [studentWaLogs, setStudentWaLogs] = useState<WaLogItem[]>([])
  const [loadingWaLogs, setLoadingWaLogs] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resLogs, resUsers] = await Promise.all([
        api.get('/attendances/gate-logs'),
        api.get('/users?role=MURID'),
      ])
      if (resLogs.data.success) {
        setLogs(resLogs.data.data)
      }
      if (resUsers.data.success) {
        setTotalSiswa(resUsers.data.data.length)
      }
    } catch (_error) {
      toast.error('Gagal memuat data absensi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

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

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = logs.filter(
    (log) => format(new Date(log.date), 'yyyy-MM-dd') === todayStr
  )

  // Dashboard Metrics
  const totalHadir = todayLogs.filter((log) => log.status === 'HADIR').length
  const totalTerlambat = todayLogs.filter(
    (log) => log.status === 'TERLAMBAT'
  ).length
  const totalPulang = todayLogs.filter((log) => log.status === 'PULANG').length
  const totalTidakHadir = Math.max(0, totalSiswa - (totalHadir + totalTerlambat + totalPulang))

  // Filtered by selected date
  const dateFilteredLogs = logs.filter(
    (log) => format(new Date(log.date), 'yyyy-MM-dd') === selectedDate
  )

  // Filtered by active status tab
  const finalFilteredLogs = dateFilteredLogs.filter((log) => {
    if (activeStatusTab === 'ALL') return true
    if (activeStatusTab === 'HADIR') return log.status === 'HADIR'
    if (activeStatusTab === 'TERLAMBAT') return log.status === 'TERLAMBAT'
    if (activeStatusTab === 'PULANG') return log.status === 'PULANG'
    if (activeStatusTab === 'ALPHA') return log.status === 'ALPHA' || !log.status
    return true
  })

  // Table Columns with Action Detail Button
  const columns: ColumnDef<GateLogData>[] = [
    {
      id: 'index',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='No.' />
      ),
      cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
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
      cell: ({ row }) => row.original.user.profile?.nomorInduk || '-',
    },
    {
      accessorKey: 'user.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Siswa' />
      ),
    },
    {
      accessorKey: 'user.profile.class.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kelas' />
      ),
      cell: ({ row }) => row.original.user.profile?.class?.name || '-',
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tanggal' />
      ),
      cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'checkInTime',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jam Masuk' />
      ),
      cell: ({ row }) =>
        row.original.checkInTime
          ? format(new Date(row.original.checkInTime), 'HH:mm')
          : '-',
    },
    {
      accessorKey: 'checkOutTime',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Jam Keluar' />
      ),
      cell: ({ row }) =>
        row.original.checkOutTime
          ? format(new Date(row.original.checkOutTime), 'HH:mm')
          : '-',
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        let colorClass = 'bg-gray-100 text-gray-800'
        if (status === 'HADIR') colorClass = 'bg-emerald-100 text-emerald-800'
        else if (status === 'TERLAMBAT') colorClass = 'bg-amber-100 text-amber-800'
        else if (status === 'PULANG') colorClass = 'bg-blue-100 text-blue-800'
        else if (status === 'ALPHA') colorClass = 'bg-rose-100 text-rose-800'
        return (
          <span className={`rounded px-2 py-1 text-xs font-semibold ${colorClass}`}>
            {status}
          </span>
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
      Nama: log.user.name,
      Kelas: log.user.profile?.class?.name || '-',
      Tanggal: format(new Date(log.date), 'dd/MM/yyyy'),
      'Jam Masuk': log.checkInTime
        ? format(new Date(log.checkInTime), 'HH:mm')
        : '-',
      'Jam Keluar': log.checkOutTime
        ? format(new Date(log.checkOutTime), 'HH:mm')
        : '-',
      Status: log.status,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi Gerbang')
    XLSX.writeFile(
      workbook,
      `Laporan_Absensi_${activeStatusTab}_${selectedDate}.xlsx`
    )
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.text(`Laporan Absensi Gerbang (${activeStatusTab}) - ${selectedDate}`, 14, 15)

    const tableColumn = [
      'No',
      'NIS',
      'Nama',
      'Kelas',
      'Tanggal',
      'Jam Masuk',
      'Jam Keluar',
      'Status',
    ]
    const tableRows = finalFilteredLogs.map((log, index) => [
      index + 1,
      log.user.profile?.nomorInduk || '-',
      log.user.name,
      log.user.profile?.class?.name || '-',
      format(new Date(log.date), 'dd/MM/yyyy'),
      log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm') : '-',
      log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm') : '-',
      log.status,
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    })

    doc.save(`Laporan_Absensi_${activeStatusTab}_${selectedDate}.pdf`)
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
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Dashboard Absensi Gerbang
          </h2>
          <p className='text-muted-foreground'>
            Pantau kehadiran siswa hari ini secara real-time dari pintu gerbang.
          </p>
        </div>

        {/* Dashboard Metrics Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveStatusTab('ALL')}
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Siswa</CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalSiswa}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'HADIR' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setActiveStatusTab('HADIR')}
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Hadir Tepat Waktu</CardTitle>
              <CheckCircle2 className='h-4 w-4 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-600'>{totalHadir}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'TERLAMBAT' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setActiveStatusTab('TERLAMBAT')}
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Terlambat</CardTitle>
              <Clock className='h-4 w-4 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-amber-600'>{totalTerlambat}</div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${activeStatusTab === 'ALPHA' ? 'ring-2 ring-rose-500' : ''}`}
            onClick={() => setActiveStatusTab('ALPHA')}
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Belum Hadir / Alpa</CardTitle>
              <XCircle className='h-4 w-4 text-rose-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-rose-600'>{totalTidakHadir}</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar: Filter Date, Status Tabs, Export */}
        <div className='flex flex-wrap items-center justify-between gap-4 mt-4'>
          <div className='flex flex-wrap items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Tanggal:</span>
              <Input
                type='date'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className='w-[150px]'
              />
            </div>

            <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab}>
              <TabsList>
                <TabsTrigger value='ALL'>Semua</TabsTrigger>
                <TabsTrigger value='HADIR'>Hadir Tepat ✅</TabsTrigger>
                <TabsTrigger value='TERLAMBAT'>Terlambat ⏰</TabsTrigger>
                <TabsTrigger value='PULANG'>Pulang 🏠</TabsTrigger>
                <TabsTrigger value='ALPHA'>Alpha ❌</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleExportPDF}>
              <FileText className='mr-2 h-4 w-4' /> PDF ({finalFilteredLogs.length})
            </Button>
            <Button variant='outline' size='sm' onClick={handleExportExcel}>
              <Download className='mr-2 h-4 w-4' /> Excel ({finalFilteredLogs.length})
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className='w-full'>
          {loading ? (
            <div className='py-8 text-center text-muted-foreground'>Memuat data...</div>
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
                      {selectedLog.checkInTime ? format(new Date(selectedLog.checkInTime), 'HH:mm') : '-'}
                    </span>
                  </div>
                  <div className='p-2 border rounded-md'>
                    <span className='text-xs text-muted-foreground block'>Jam Keluar</span>
                    <span className='font-bold font-mono text-sm'>
                      {selectedLog.checkOutTime ? format(new Date(selectedLog.checkOutTime), 'HH:mm') : '-'}
                    </span>
                  </div>
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
