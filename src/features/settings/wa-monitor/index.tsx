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
import { CheckCircle2, AlertCircle, Clock, RotateCcw, Send, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

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

  return (
    <div className='w-full space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-medium'>Monitoring Delivery WhatsApp</h3>
          <p className='text-sm text-muted-foreground'>
            Pantau status antrian dan riwayat pengiriman notifikasi WhatsApp secara real-time.
          </p>
        </div>
        <div className='flex items-center gap-2'>
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

        <div className='rounded-md border'>
          <table className='w-full text-xs text-left'>
            <thead className='bg-muted text-muted-foreground uppercase'>
              <tr>
                <th className='p-3'>Waktu</th>
                <th className='p-3'>ID Siswa</th>
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
                  <td colSpan={8} className='p-4 text-center'>
                    Memuat log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className='p-4 text-center text-muted-foreground'>
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

                  return (
                    <tr key={log.id} className='border-b hover:bg-muted/50'>
                      <td className='p-3 font-mono'>
                        {format(new Date(log.createdAt), 'dd/MM HH:mm:ss')}
                      </td>
                      <td className='p-3 font-mono'>{log.studentId === 0 ? 'SYSTEM' : log.studentId}</td>
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
                        {log.status === 'FAILED' && (
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 text-xs'
                            onClick={() => handleRetry(log.id)}
                          >
                            <RotateCcw className='mr-1 h-3 w-3' /> Retry
                          </Button>
                        )}
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
