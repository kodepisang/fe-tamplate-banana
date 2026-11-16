/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Reports() {
  const [classData, setClassData] = useState<any[]>([])
  const [subjectData, setSubjectData] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [eventLogs, setEventLogs] = useState<any[]>([])
  const [selectedClassDetail, setSelectedClassDetail] = useState<any | null>(
    null
  )

  // Filters for Class Report
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [academicYears, setAcademicYears] = useState<any[]>([])

  // Pagination for Class Report
  const [classPage, setClassPage] = useState(1)
  const itemsPerPage = 10

  // Calendar for Daily Report
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [attendanceDates, setAttendanceDates] = useState<string[]>([])

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await api.get('/academic-years')
      if (res.data?.success) {
        setAcademicYears(res.data.data)
      } else if (Array.isArray(res.data)) {
        setAcademicYears(res.data)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [])

  const fetchAttendanceDates = useCallback(async () => {
    try {
      const res = await api.get('/reports/dates')
      if (res.data.success) setAttendanceDates(res.data.data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [])

  const fetchSubjectData = useCallback(async () => {
    try {
      const res = await api.get('/reports/subject')
      if (res.data.success) setSubjectData(res.data.data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [])

  const fetchClassData = useCallback(async () => {
    try {
      let url = '/reports/class?'
      if (selectedMonth !== 'all') url += `month=${selectedMonth}&`
      if (selectedYear !== 'all') url += `academicYearId=${selectedYear}`
      const res = await api.get(url)
      if (res.data.success) setClassData(res.data.data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [selectedMonth, selectedYear])

  const fetchDailyData = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const res = await api.get(`/reports/daily?date=${dateStr}`)
      if (res.data.success) setDailyData(res.data.data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [selectedDate])

  const fetchEventLogs = useCallback(async () => {
    try {
      const res = await api.get('/events/logs')
      if (res.data?.success) setEventLogs(res.data.data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAcademicYears()
    fetchAttendanceDates()
    fetchSubjectData()
    fetchEventLogs()
  }, [fetchAcademicYears, fetchAttendanceDates, fetchSubjectData, fetchEventLogs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClassData()
    setClassPage(1)
  }, [fetchClassData])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDailyData()
  }, [fetchDailyData])

  const exportPDF = (title: string, head: string[][], body: string[][]) => {
    const doc = new jsPDF()

    doc.text(title, 14, 15)

    autoTable(doc, {
      head: head,
      body: body,
      startY: 20,
    })

    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`)
  }

  const exportDailyPDF = () => {
    const doc = new jsPDF()
    const dateStr = format(selectedDate, 'dd MMM yyyy')
    
    // Header
    doc.setFontSize(16)
    doc.text('Laporan Kehadiran Harian', 14, 15)
    doc.setFontSize(12)
    doc.text(`Tanggal: ${dateStr}`, 14, 22)

    // Flat list of all students across all classes for that day
    let allStudentsFlat: any[] = []
    let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpa = 0
    let totalSiswa = 0

    dailyData.forEach(classData => {
      if (classData.allStudents) {
        allStudentsFlat = allStudentsFlat.concat(classData.allStudents)
      }
      totalHadir += classData.hadir
      totalSakit += classData.sakit
      totalIzin += classData.izin
      totalAlpa += classData.alpa
      totalSiswa += classData.total
    })

    const body = allStudentsFlat.map((s, idx) => [
      (idx + 1).toString(),
      s.name,
      s.status === 'HADIR' ? 'v' : '',
      s.status === 'SAKIT' ? 'v' : '',
      s.status === 'IZIN' ? 'v' : '',
      s.status === 'ALPA' ? 'v' : ''
    ])

    autoTable(doc, {
      head: [['No', 'Nama Siswa', 'Hadir (v)', 'Sakit (v)', 'Ijin (v)', 'Alfa (v)']],
      body: body,
      startY: 28,
    })

    const finalY = (doc as any).lastAutoTable.finalY || 28
    
    // Footer
    const percentage = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0
    doc.text(`Rekap Total:`, 14, finalY + 10)
    doc.text(`Total Siswa: ${totalSiswa}`, 14, finalY + 16)
    doc.text(`Hadir: ${totalHadir}, Sakit: ${totalSakit}, Izin: ${totalIzin}, Alpa: ${totalAlpa}`, 14, finalY + 22)
    doc.text(`Persentase Kehadiran: ${percentage}%`, 14, finalY + 28)

    doc.save(`laporan_harian_${dateStr.replace(/\s+/g, '_')}.pdf`)
  }

  const exportDailyExcel = () => {
    const dateStr = format(selectedDate, 'dd MMM yyyy')
    let allStudentsFlat: any[] = []

    dailyData.forEach(classData => {
      if (classData.allStudents) {
        allStudentsFlat = allStudentsFlat.concat(classData.allStudents)
      }
    })

    const worksheetData = allStudentsFlat.map((s, idx) => ({
      'No': idx + 1,
      'Nama Siswa': s.name,
      'Hadir (v)': s.status === 'HADIR' ? 'v' : '',
      'Sakit (v)': s.status === 'SAKIT' ? 'v' : '',
      'Ijin (v)': s.status === 'IZIN' ? 'v' : '',
      'Alfa (v)': s.status === 'ALPA' ? 'v' : ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Harian')
    XLSX.writeFile(workbook, `laporan_harian_${dateStr.replace(/\s+/g, '_')}.xlsx`)
  }

  const exportEventPDF = () => {
    const head = [['No', 'Waktu Tap', 'Nama Siswa', 'NIS', 'Kelas', 'Nama Kegiatan']]
    const body = eventLogs.map((log, idx) => [
      (idx + 1).toString(),
      format(new Date(log.tapTime), "dd/MM/yyyy HH:mm:ss 'WIB'"),
      log.user?.name || '-',
      log.user?.profile?.nomorInduk || '-',
      log.user?.profile?.class?.name || '-',
      log.event?.name || '-',
    ])
    exportPDF('Laporan_Presensi_Kegiatan', head, body)
  }

  const exportEventExcel = () => {
    const worksheetData = eventLogs.map((log, idx) => ({
      No: idx + 1,
      'Waktu Tap': format(new Date(log.tapTime), "dd/MM/yyyy HH:mm:ss 'WIB'"),
      'Nama Siswa': log.user?.name || '-',
      NIS: log.user?.profile?.nomorInduk || '-',
      Kelas: log.user?.profile?.class?.name || '-',
      'Nama Kegiatan': log.event?.name || '-',
    }))
    const worksheet = XLSX.utils.json_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Event')
    XLSX.writeFile(workbook, `laporan_kegiatan_event.xlsx`)
  }

  return (
    <div className='space-y-4 p-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Laporan Kehadiran</h1>
        <p className='text-muted-foreground'>
          Lihat dan unduh laporan kehadiran dalam format PDF dan Excel.
        </p>
      </div>

      <Tabs defaultValue='class' className='w-full'>
        <TabsList className='grid w-full grid-cols-2 md:grid-cols-4'>
          <TabsTrigger value='class'>Per Kelas</TabsTrigger>
          <TabsTrigger value='subject'>Per Mata Pelajaran</TabsTrigger>
          <TabsTrigger value='daily'>Harian</TabsTrigger>
          <TabsTrigger value='event'>Presensi Kegiatan</TabsTrigger>
        </TabsList>
        <TabsContent value='class'>
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4 md:items-center'>
              <div>
                <CardTitle>Laporan Kehadiran Per Kelas</CardTitle>
                <CardDescription>
                  Persentase kehadiran berdasarkan kelas dan bulan.
                </CardDescription>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className='w-35'>
                    <SelectValue placeholder='Pilih Bulan' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua Bulan</SelectItem>
                    <SelectItem value='0'>Januari</SelectItem>
                    <SelectItem value='1'>Februari</SelectItem>
                    <SelectItem value='2'>Maret</SelectItem>
                    <SelectItem value='3'>April</SelectItem>
                    <SelectItem value='4'>Mei</SelectItem>
                    <SelectItem value='5'>Juni</SelectItem>
                    <SelectItem value='6'>Juli</SelectItem>
                    <SelectItem value='7'>Agustus</SelectItem>
                    <SelectItem value='8'>September</SelectItem>
                    <SelectItem value='9'>Oktober</SelectItem>
                    <SelectItem value='10'>November</SelectItem>
                    <SelectItem value='11'>Desember</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className='w-45'>
                    <SelectValue placeholder='Tahun Akademik' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua Tahun</SelectItem>
                    {academicYears.map((ay) => (
                      <SelectItem key={ay.id} value={ay.id.toString()}>
                        {ay.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    exportPDF(
                      'Laporan Kehadiran Kelas',
                      [['Kelas', 'Bulan', 'Persentase (%)']],
                      classData.map((d) => [
                        d.className,
                        d.month,
                        `${d.percentage}%`,
                      ])
                    )
                  }
                >
                  <Download className='mr-2 h-4 w-4' /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {classData.length > 0 ? (
                <div className='space-y-4'>
                  <div className='rounded-md border'>
                    <table className='min-w-full divide-y divide-border'>
                      <thead className='bg-muted/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Kelas
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Bulan
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Persentase (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-border bg-card'>
                        {classData
                          .slice(
                            (classPage - 1) * itemsPerPage,
                            classPage * itemsPerPage
                          )
                          .map((d, i) => (
                            <tr key={i}>
                              <td className='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                                {d.className}
                              </td>
                              <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                                {d.month}
                              </td>
                              <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                                {d.percentage}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='text-sm text-muted-foreground'>
                      Menampilkan {(classPage - 1) * itemsPerPage + 1} -{' '}
                      {Math.min(classPage * itemsPerPage, classData.length)}{' '}
                      dari {classData.length} data
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setClassPage((p) => Math.max(1, p - 1))}
                        disabled={classPage === 1}
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setClassPage((p) => p + 1)}
                        disabled={classPage * itemsPerPage >= classData.length}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='py-4 text-center text-muted-foreground'>
                  Tidak ada data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='subject'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Laporan Kehadiran Per Mata Pelajaran</CardTitle>
                <CardDescription>
                  Persentase kehadiran berdasarkan pertemuan ke-berapa.
                </CardDescription>
              </div>
              <Button
                onClick={() =>
                  exportPDF(
                    'Laporan Kehadiran Mapel',
                    [['Mata Pelajaran', 'Pertemuan Ke-', 'Persentase (%)']],
                    subjectData.map((d) => [
                      d.subjectName,
                      d.period.toString(),
                      `${d.percentage}%`,
                    ])
                  )
                }
              >
                <Download className='mr-2 h-4 w-4' /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              {subjectData.length > 0 ? (
                <div className='rounded-md border'>
                  <table className='min-w-full divide-y divide-border'>
                    <thead className='bg-muted/50'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                          Mata Pelajaran
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                          Pertemuan Ke-
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                          Persentase (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-border bg-card'>
                      {subjectData.map((d, i) => (
                        <tr key={i}>
                          <td className='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                            {d.subjectName}
                          </td>
                          <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                            {d.period}
                          </td>
                          <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                            {d.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='py-4 text-center text-muted-foreground'>
                  Tidak ada data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='daily'>
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-4 md:items-center'>
              <div>
                <CardTitle>Laporan Harian</CardTitle>
                <CardDescription>
                  Total kehadiran siswa per kelas untuk tanggal{' '}
                  {format(selectedDate, 'dd MMM yyyy')}.
                </CardDescription>
              </div>
              <div className='flex gap-2'>
                <Button onClick={exportDailyExcel} variant='outline'>
                  <Download className='mr-2 h-4 w-4' /> Export Excel
                </Button>
                <Button onClick={exportDailyPDF}>
                  <Download className='mr-2 h-4 w-4' /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className='flex flex-col gap-6 md:flex-row'>
              <div className='flex h-fit w-full shrink-0 justify-center rounded-md border bg-card p-2 shadow-sm md:w-auto'>
                <Calendar
                  mode='single'
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={{
                    hasData: (date) =>
                      attendanceDates.includes(format(date, 'yyyy-MM-dd')),
                  }}
                  modifiersClassNames={{
                    hasData:
                      'font-bold bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400 rounded-full relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full',
                  }}
                />
              </div>
              <div className='w-full flex-1 overflow-hidden'>
                {dailyData.length > 0 ? (
                  <div className='overflow-x-auto rounded-md border'>
                    <table className='min-w-full divide-y divide-border'>
                      <thead className='bg-muted/50'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Kelas
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Total
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Persentase (%)
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Hadir
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Sakit
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Izin
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Alpa
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-border bg-card'>
                        {dailyData.map((d, i) => (
                          <tr key={i}>
                            <td className='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                              {d.className}
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                              {d.total}
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-muted-foreground'>
                              {d.percentage}%
                            </td>
                            <td className='px-6 py-4 text-sm font-semibold whitespace-nowrap text-green-600'>
                              {d.hadir}
                            </td>
                            <td className='px-6 py-4 text-sm font-semibold whitespace-nowrap text-yellow-600'>
                              {d.sakit}
                            </td>
                            <td className='px-6 py-4 text-sm font-semibold whitespace-nowrap text-blue-600'>
                              {d.izin}
                            </td>
                            <td className='px-6 py-4 text-sm font-semibold whitespace-nowrap text-red-600'>
                              {d.alpa}
                            </td>
                            <td className='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setSelectedClassDetail(d)}
                              >
                                <Eye className='mr-2 h-4 w-4' /> Detail
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='rounded-md border bg-muted/20 py-10 text-center text-muted-foreground'>
                    Tidak ada data untuk tanggal ini.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='event'>
          <Card>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-4'>
              <div>
                <CardTitle>Laporan Presensi Kegiatan / Event</CardTitle>
                <CardDescription>
                  Daftar riwayat presensi siswa yang mengikuti kegiatan (Sholat Dhuha, Ekstrakurikuler, dll).
                </CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                <Button onClick={exportEventExcel} variant='outline'>
                  <Download className='mr-2 h-4 w-4' /> Export Excel
                </Button>
                <Button onClick={exportEventPDF}>
                  <Download className='mr-2 h-4 w-4' /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventLogs.length > 0 ? (
                <div className='rounded-md border overflow-x-auto'>
                  <table className='min-w-full divide-y divide-border'>
                    <thead className='bg-muted/50'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase w-12'>No</th>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>Waktu Tap</th>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>Nama Siswa</th>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>NIS</th>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>Kelas</th>
                        <th className='px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase'>Kegiatan</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-border bg-card text-xs'>
                      {eventLogs.map((log, i) => (
                        <tr key={log.id || i}>
                          <td className='px-4 py-3 font-mono text-muted-foreground'>{i + 1}</td>
                          <td className='px-4 py-3 font-mono font-semibold'>{format(new Date(log.tapTime), "dd/MM/yyyy HH:mm:ss 'WIB'")}</td>
                          <td className='px-4 py-3 font-bold'>{log.user?.name || '-'}</td>
                          <td className='px-4 py-3 font-mono'>{log.user?.profile?.nomorInduk || '-'}</td>
                          <td className='px-4 py-3'>{log.user?.profile?.class?.name || '-'}</td>
                          <td className='px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400'>{log.event?.name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='rounded-md border bg-muted/20 py-10 text-center text-muted-foreground'>
                  Belum ada log presensi kegiatan / event.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedClassDetail}
        onOpenChange={() => setSelectedClassDetail(null)}
      >
        <DialogContent className='sm:max-w-150'>
          <DialogHeader>
            <DialogTitle>
              Detail Ketidakhadiran - {selectedClassDetail?.className}
            </DialogTitle>
          </DialogHeader>
          <div className='max-h-[60vh] overflow-y-auto pt-4 text-sm leading-relaxed'>
            {selectedClassDetail?.allStudents?.some((s: any) => s.status !== 'HADIR') ? (
              <p className='whitespace-pre-wrap'>
                Berikut rekap kehadiran tanggal {selectedClassDetail.date}:
                <br />
                <br />
                {(() => {
                  const students = selectedClassDetail.allStudents
                  const izin = students.filter(
                    (s: { status: string; name: string }) => s.status === 'IZIN'
                  )
                  const sakit = students.filter(
                    (s: { status: string; name: string }) =>
                      s.status === 'SAKIT'
                  )
                  const alpa = students.filter(
                    (s: { status: string; name: string }) => s.status === 'ALPA'
                  )

                  const parts = []
                  if (izin.length > 0)
                    parts.push(
                      `Izin:\n${izin.map((s: { status: string; name: string }, i: number) => `${i + 1}. ${s.name}`).join('\n')}`
                    )
                  if (sakit.length > 0)
                    parts.push(
                      `Sakit:\n${sakit.map((s: { status: string; name: string }, i: number) => `${i + 1}. ${s.name}`).join('\n')}`
                    )
                  if (alpa.length > 0)
                    parts.push(
                      `Alpa:\n${alpa.map((s: { status: string; name: string }, i: number) => `${i + 1}. ${s.name}`).join('\n')}`
                    )

                  return parts.join('\n\n')
                })()}
              </p>
            ) : (
              <div className='py-6 text-center text-muted-foreground'>
                Semua siswa hadir atau belum ada data.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
