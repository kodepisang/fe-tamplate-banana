import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Send,
  RefreshCw,
  Eye,
  FileDown,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FailureDetailDialog } from './components/failure-detail-dialog'
import { exportFailedWaLogsPdf } from './utils/export-failed-pdf'

export interface WaLog {
  id: number
  studentId: number
  phoneNumber: string
  eventType: string
  status: string
  message: string
  attempt: number
  errorMsg: string | null
  sentAt: string | null
  createdAt: string
  studentName?: string
  studentNis?: string
  className?: string
  guardianName?: string
}

interface MonitorStatus {
  queueLength?: number
  sentToday?: number
  failedToday?: number
  skippedToday?: number
  totalToday?: number
  isProcessing?: boolean
}

export function SettingsWaMonitor() {
  const [status, setStatus] = useState<MonitorStatus | null>(null)
  const [logs, setLogs] = useState<WaLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Detail dialog state
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<WaLog | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Selection & Delete state
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [singleDeleteId, setSingleDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reset Dedup Dialog state
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetStudentId, setResetStudentId] = useState('')
  const [resetEventType, setResetEventType] = useState('CHECKIN')
  const [isRekapDialogOpen, setIsRekapDialogOpen] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status')
      if (res.data.success) {
        setStatus(res.data.data)
      }
    } catch (_err) {
      // silent
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { limit: 50 }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter
      }
      const res = await api.get('/whatsapp/logs', { params })
      if (res.data.success) {
        setLogs(res.data.data)
      }
    } catch (_err) {
      toast.error('Gagal memuat log WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()
    fetchLogs()

    const interval = setInterval(() => {
      fetchStatus()
      fetchLogs()
    }, 15000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleRetry = async (logId: number) => {
    try {
      const res = await api.post(`/whatsapp/retry/${logId}`)
      if (res.data.success) {
        toast.success('Pesan dimasukkan kembali ke antrian')
        fetchLogs()
        fetchStatus()
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal retry pesan')
    }
  }

  const handleSendRekapNow = () => {
    setIsRekapDialogOpen(true)
  }

  const handleSendRekapConfirm = async () => {
    try {
      toast.info('Sedang memproses pengiriman rekap...')
      const res = await api.post('/whatsapp/send-rekap', {})
      if (res.data.success) {
        toast.success(`Rekap berhasil dikirim ke ${res.data.data.recipientsCount} penerima`)
        fetchLogs()
        fetchStatus()
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal mengirim rekap')
    } finally {
      setIsRekapDialogOpen(false)
    }
  }

  const handleResetDedup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetStudentId) return
    try {
      const res = await api.post('/whatsapp/reset-dedup', {
        studentId: Number(resetStudentId),
        eventType: resetEventType,
      })
      if (res.data.success) {
        toast.success(`Deduplikasi untuk siswa #${resetStudentId} berhasil direset`)
        setIsResetOpen(false)
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal reset deduplikasi')
    }
  }

  const handleOpenDetail = (log: WaLog) => {
    setSelectedLogForDetail(log)
    setIsDetailDialogOpen(true)
  }

  const handleOpenResetDedupFromDialog = (studentId: number, eventType: string) => {
    setResetStudentId(String(studentId))
    setResetEventType(eventType || 'CHECKIN')
    setIsResetOpen(true)
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(logs.map((l) => l.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const promptDeleteSingle = (id: number) => {
    setSingleDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const promptDeleteBatch = () => {
    if (selectedIds.length === 0) return
    setSingleDeleteId(null)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      if (singleDeleteId) {
        const res = await api.delete(`/whatsapp/logs/${singleDeleteId}`)
        if (res.data.success) {
          toast.success(`Log #${singleDeleteId} berhasil dihapus`)
          setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId))
        }
      } else if (selectedIds.length > 0) {
        const res = await api.delete('/whatsapp/logs', {
          data: { ids: selectedIds },
        })
        if (res.data.success) {
          toast.success(`${res.data.data?.count || selectedIds.length} log pengiriman berhasil dihapus`)
          setSelectedIds([])
        }
      }
      fetchLogs()
      fetchStatus()
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal menghapus log')
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSingleDeleteId(null)
    }
  }

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true)
      // Ambil data log gagal terbaru hingga 200 items dari backend
      const res = await api.get('/whatsapp/logs', {
        params: { status: 'FAILED', limit: 200 },
      })

      const failedData: WaLog[] =
        res.data?.success && res.data?.data?.length > 0
          ? res.data.data
          : logs.filter((l) => l.status === 'FAILED')

      if (failedData.length === 0) {
        toast.info('Tidak ada riwayat pengiriman gagal untuk diekspor.')
        return
      }

      exportFailedWaLogsPdf(failedData)
      toast.success(`Berhasil mengekspor ${failedData.length} rekap pengiriman gagal ke PDF`)
    } catch (err: unknown) {
      console.error('Export failed PDF error:', err)
      toast.error('Gagal mengekspor PDF rekap pengiriman gagal')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className='w-full space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h3 className='text-lg font-medium'>Monitoring Delivery WhatsApp</h3>
          <p className='text-sm text-muted-foreground'>
            Pantau status antrian dan riwayat pengiriman notifikasi WhatsApp secara real-time.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-300'
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <FileDown className='mr-2 h-4 w-4 text-rose-600' />
            )}
            Export Rekap Gagal (PDF)
          </Button>
          <Button variant='outline' size='sm' onClick={() => { fetchStatus(); fetchLogs(); }}>
            <RefreshCw className='mr-2 h-4 w-4' /> Refresh
          </Button>
          <Button variant='secondary' size='sm' onClick={() => setIsResetOpen(true)}>
            <RotateCcw className='mr-2 h-4 w-4' /> Reset Dedup
          </Button>
          <Button size='sm' onClick={handleSendRekapNow}>
            <Send className='mr-2 h-4 w-4' /> Kirim Rekap Sekarang
          </Button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>Antrian</CardTitle>
            <Clock className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{status?.queueLength ?? 0}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Worker: {status?.isProcessing ? '⚡ Active' : 'Idle'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>Terkirim Hari Ini</CardTitle>
            <CheckCircle2 className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{status?.sentToday ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>Gagal Hari Ini</CardTitle>
            <AlertCircle className='h-4 w-4 text-rose-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{status?.failedToday ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>Di-skip (Dedup)</CardTitle>
            <Badge variant='secondary' className='text-xs'>Dedup</Badge>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{status?.skippedToday ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-medium'>Total Event</CardTitle>
            <span className='text-xs font-mono text-muted-foreground'>Hari Ini</span>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{status?.totalToday ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Log Table */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h4 className='font-semibold text-md'>Log Pengiriman Terbaru (50 Terakhir)</h4>
          <div className='flex items-center gap-2'>
            <Label className='text-xs'>Filter Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[140px] h-8 text-xs'>
                <SelectValue placeholder='Semua Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Semua Status</SelectItem>
                <SelectItem value='SENT'>SENT (Sukses)</SelectItem>
                <SelectItem value='FAILED'>FAILED (Gagal)</SelectItem>
                <SelectItem value='QUEUED'>QUEUED (Antrian)</SelectItem>
                <SelectItem value='SKIPPED'>SKIPPED (Di-skip)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Banner Seleksi / Batch Action */}
        {selectedIds.length > 0 && (
          <div className='flex flex-wrap items-center justify-between gap-3 p-3 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-lg shadow-sm'>
            <div className='flex items-center gap-2.5 text-xs font-semibold text-rose-900 dark:text-rose-100'>
              <span className='flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 dark:bg-rose-800 text-xs font-bold text-rose-900 dark:text-rose-100'>
                {selectedIds.length}
              </span>
              <span>
                {selectedIds.length} data log pengiriman dipilih
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-muted-foreground hover:text-foreground'
                onClick={() => setSelectedIds([])}
              >
                Batal Pilih
              </Button>
              <Button
                variant='destructive'
                size='sm'
                className='h-7 text-xs bg-rose-600 hover:bg-rose-700 font-semibold'
                onClick={promptDeleteBatch}
              >
                <Trash2 className='mr-1.5 h-3.5 w-3.5' /> Hapus ({selectedIds.length}) Log Terpilih
              </Button>
            </div>
          </div>
        )}

        <div className='rounded-md border'>
          <table className='w-full text-xs text-left'>
            <thead className='bg-muted text-muted-foreground uppercase'>
              <tr>
                <th className='p-3 w-10 text-center'>
                  <Checkbox
                    checked={
                      logs.length > 0 && selectedIds.length === logs.length
                        ? true
                        : selectedIds.length > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label='Pilih semua log'
                  />
                </th>
                <th className='p-3'>Waktu</th>
                <th className='p-3'>Penerima / Siswa</th>
                <th className='p-3'>No. WA</th>
                <th className='p-3'>Event</th>
                <th className='p-3'>Status</th>
                <th className='p-3'>Attempt</th>
                <th className='p-3'>Catatan / Error</th>
                <th className='p-3 text-right'>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className='p-4 text-center'>
                    Memuat log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className='p-4 text-center text-muted-foreground'>
                    Belum ada log pengiriman.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let badgeClass = ''
                  if (log.status === 'SENT') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  } else if (log.status === 'FAILED') {
                    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300'
                  } else if (log.status === 'QUEUED') {
                    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
                  } else if (log.status === 'SKIPPED') {
                    badgeClass = 'bg-gray-100 text-gray-800 border-gray-300'
                  }

                  const isChecked = selectedIds.includes(log.id)

                  return (
                    <tr
                      key={log.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        isChecked ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className='p-3 text-center'>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleSelect(log.id)}
                          aria-label={`Pilih log ${log.id}`}
                        />
                      </td>
                      <td className='p-3 font-mono'>
                        {format(new Date(log.createdAt), 'dd/MM HH:mm:ss')}
                      </td>
                      <td className='p-3'>
                        <div className='font-medium text-foreground'>
                          {log.studentName || (log.studentId === 0 ? 'SYSTEM' : `Siswa #${log.studentId}`)}
                        </div>
                        <div className='text-[10px] text-muted-foreground font-mono'>
                          {log.className && log.className !== '-' ? `${log.className} • ` : ''}
                          {log.studentNis && log.studentNis !== '-' ? `NIS: ${log.studentNis}` : `ID: ${log.studentId}`}
                        </div>
                      </td>
                      <td className='p-3 font-mono'>{log.phoneNumber}</td>
                      <td className='p-3 font-semibold'>{log.eventType}</td>
                      <td className='p-3'>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className='p-3'>{log.attempt}</td>
                      <td className='p-3 text-muted-foreground max-w-[200px] truncate' title={log.errorMsg || ''}>
                        {log.errorMsg || '-'}
                      </td>
                      <td className='p-3 text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950/40'
                            onClick={() => handleOpenDetail(log)}
                            title='Lihat Detail & Analisa'
                          >
                            <Eye className='mr-1 h-3.5 w-3.5' /> Detail
                          </Button>
                          {log.status === 'FAILED' && (
                            <Button
                              size='sm'
                              variant='outline'
                              className='h-7 px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900'
                              onClick={() => handleRetry(log.id)}
                              title='Coba Kirim Ulang'
                            >
                              <RotateCcw className='mr-1 h-3 w-3' /> Retry
                            </Button>
                          )}
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 w-7 p-0 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            onClick={() => promptDeleteSingle(log.id)}
                            title='Hapus Log Ini'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Reset Dedup */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Deduplikasi Siswa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetDedup} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>ID Siswa (User ID)</Label>
              <Input
                type='number'
                placeholder='Masukkan User ID Siswa'
                value={resetStudentId}
                onChange={(e) => setResetStudentId(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label>Tipe Event</Label>
              <Select value={resetEventType} onValueChange={setResetEventType}>
                <SelectTrigger>
                  <SelectValue placeholder='Pilih Event' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='CHECKIN'>CHECKIN (Hadir)</SelectItem>
                  <SelectItem value='LATE'>LATE (Terlambat)</SelectItem>
                  <SelectItem value='CHECKOUT'>CHECKOUT (Pulang)</SelectItem>
                  <SelectItem value='ALPHA'>ALPHA (Tidak Hadir)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className='pt-4'>
              <Button type='button' variant='outline' onClick={() => setIsResetOpen(false)}>
                Batal
              </Button>
              <Button type='submit'>Reset Sekarang</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail & Analisa Kegagalan */}
      <FailureDetailDialog
        log={selectedLogForDetail}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onRetry={handleRetry}
        onOpenResetDedup={handleOpenResetDedupFromDialog}
        onDelete={promptDeleteSingle}
      />

      {/* Dialog Konfirmasi Hapus Log */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={handleConfirmDelete}
        destructive
        isLoading={isDeleting}
        title='Konfirmasi Hapus Log Pengiriman'
        desc={
          singleDeleteId
            ? `Apakah Anda yakin ingin menghapus data log pengiriman #${singleDeleteId}? Data yang dihapus tidak dapat dipulihkan.`
            : `Apakah Anda yakin ingin menghapus ${selectedIds.length} data log pengiriman WhatsApp terpilih? Data yang dihapus tidak dapat dipulihkan.`
        }
        confirmText='Hapus Permanen'
        cancelBtnText='Batal'
      />

      <ConfirmDialog
        open={isRekapDialogOpen}
        onOpenChange={setIsRekapDialogOpen}
        handleConfirm={handleSendRekapConfirm}
        title='Konfirmasi Kirim Rekap PDF'
        desc='Apakah Anda yakin ingin memproses dan mengirim laporan rekap PDF ke seluruh penerima sekarang?'
        confirmText='Kirim Rekap'
        cancelBtnText='Batal'
      />
    </div>
  )
}
