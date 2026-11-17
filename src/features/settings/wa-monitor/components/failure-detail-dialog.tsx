import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  Copy,
  Smartphone,
  User,
  Info,
  ShieldAlert,
  Calendar,
  Send,
  MessageSquare,
  AlertCircle,
  Hash,
  Activity,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { analyzeDeliveryFailure } from '../utils/failure-analysis'
import type { WaLog } from '../index'

interface FailureDetailDialogProps {
  log: WaLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: (logId: number) => void
  onOpenResetDedup?: (studentId: number, eventType: string) => void
  onDelete?: (logId: number) => void
}

export function FailureDetailDialog({
  log,
  open,
  onOpenChange,
  onRetry,
  onOpenResetDedup,
  onDelete,
}: FailureDetailDialogProps) {
  const navigate = useNavigate()

  if (!log) return null

  const analysis = analyzeDeliveryFailure(log.errorMsg, log.phoneNumber, log.status)

  const copyToClipboard = (text: string, label = 'Teks') => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard`)
  }

  const cleanPhone = (log.phoneNumber || '').replace(/\D/g, '')
  const waWebUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 border rounded-xl shadow-2xl'>
        {/* Modern Header Banner */}
        <DialogHeader className='border-b bg-muted/40 px-6 py-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2.5'>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    log.status === 'SENT'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : log.status === 'FAILED'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {log.status === 'SENT' ? (
                    <CheckCircle2 className='h-4 w-4' />
                  ) : log.status === 'FAILED' ? (
                    <AlertCircle className='h-4 w-4' />
                  ) : (
                    <Clock className='h-4 w-4' />
                  )}
                </div>
                <DialogTitle className='text-lg font-bold text-foreground tracking-tight'>
                  Detail Log Pengiriman WhatsApp
                </DialogTitle>
                <span className='font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border'>
                  #{log.id}
                </span>
              </div>
              <DialogDescription className='text-xs text-muted-foreground flex items-center gap-2'>
                <Calendar className='h-3.5 w-3.5' />
                <span>
                  Dicatat pada{' '}
                  <strong className='font-medium text-foreground'>
                    {format(new Date(log.createdAt), 'EEEE, dd MMMM yyyy HH:mm:ss')}
                  </strong>
                </span>
              </DialogDescription>
            </div>

            {/* Badges Status */}
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='font-semibold px-2.5 py-1 text-xs uppercase tracking-wide bg-background'
              >
                Event: {log.eventType}
              </Badge>
              <Badge
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  log.status === 'SENT'
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                    : log.status === 'FAILED'
                    ? 'bg-rose-600 hover:bg-rose-600 text-white'
                    : log.status === 'QUEUED'
                    ? 'bg-amber-600 hover:bg-amber-600 text-white'
                    : 'bg-slate-600 hover:bg-slate-600 text-white'
                }`}
              >
                {log.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Main Content Area */}
        <div className='p-6 space-y-6'>
          {/* Card Analisis Kegagalan (Jika Status FAILED atau ada Catatan Masalah) */}
          {(log.status === 'FAILED' || log.errorMsg) && (
            <div
              className={`rounded-xl border p-5 transition-all ${
                analysis.severity === 'high'
                  ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20'
                  : analysis.severity === 'medium'
                  ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20'
                  : 'border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20'
              }`}
            >
              {/* Header Box Analisis */}
              <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-4 border-rose-200/60 dark:border-rose-900/40'>
                <div className='flex items-center gap-2.5'>
                  {analysis.severity === 'high' ? (
                    <ShieldAlert className='h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0' />
                  ) : analysis.severity === 'medium' ? (
                    <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0' />
                  ) : (
                    <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0' />
                  )}
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        analysis.severity === 'high'
                          ? 'text-rose-900 dark:text-rose-200'
                          : analysis.severity === 'medium'
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-blue-900 dark:text-blue-200'
                      }`}
                    >
                      Analisa Akar Masalah: {analysis.title}
                    </h4>
                    <p className='text-xs text-muted-foreground'>
                      Diagnosa otomatis sistem berdasarkan kode respons dan kondisi data pesan
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full ${
                    analysis.severity === 'high'
                      ? 'bg-rose-200 text-rose-900 dark:bg-rose-900/70 dark:text-rose-100'
                      : analysis.severity === 'medium'
                      ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-100'
                      : 'bg-blue-200 text-blue-900 dark:bg-blue-900/70 dark:text-blue-100'
                  }`}
                >
                  Prioritas {analysis.severity}
                </span>
              </div>

              {/* Grid 2 Kolom: Penjelasan Masalah & Rekomendasi Solusi */}
              <div className='grid gap-4 md:grid-cols-2'>
                {/* Kolom Kiri: Penjelasan Akar Masalah */}
                <div className='space-y-2 rounded-lg bg-background/80 p-3.5 border'>
                  <div className='flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider'>
                    <AlertCircle className='h-4 w-4 text-rose-500' />
                    Penyebab Masalah (Root Cause)
                  </div>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    {analysis.description}
                  </p>
                </div>

                {/* Kolom Kanan: Rekomendasi Tindakan Solutif */}
                <div className='space-y-2 rounded-lg bg-background/80 p-3.5 border'>
                  <div className='flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider'>
                    <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                    Rekomendasi Tindakan Solutif
                  </div>
                  <ul className='space-y-1.5 text-xs text-muted-foreground'>
                    {analysis.solution.map((sol, idx) => (
                      <li key={idx} className='flex items-start gap-2'>
                        <span className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mt-0.5'>
                          {idx + 1}
                        </span>
                        <span>{sol}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pesan Galat Raw Error Box */}
              {log.errorMsg && (
                <div className='mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 space-y-1.5'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='font-semibold text-muted-foreground flex items-center gap-1.5'>
                      <Hash className='h-3.5 w-3.5 text-rose-500' /> Pesan Galat Sistem (Raw Error Log):
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground'
                      onClick={() => copyToClipboard(log.errorMsg || '', 'Pesan Error')}
                    >
                      <Copy className='mr-1 h-3 w-3' /> Salin Error
                    </Button>
                  </div>
                  <div className='bg-zinc-900 text-zinc-100 dark:bg-black rounded-lg p-3 text-xs font-mono border border-zinc-800 break-all leading-relaxed select-text shadow-inner'>
                    {log.errorMsg}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grid Informasi Penerima & Detail Teknis Pengiriman */}
          <div className='grid gap-4 md:grid-cols-2'>
            {/* Box 1: Informasi Penerima */}
            <div className='rounded-xl border bg-card p-4 space-y-3.5 shadow-sm'>
              <div className='flex items-center gap-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2.5'>
                <User className='h-4 w-4 text-primary' /> Profil Penerima Pesan
              </div>

              <div className='space-y-2.5 text-xs'>
                <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                  <span className='text-muted-foreground'>Nama Siswa</span>
                  <span className='font-semibold text-foreground text-sm'>
                    {log.studentName || (log.studentId === 0 ? 'SYSTEM / BROADCAST' : `Siswa #${log.studentId}`)}
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 py-1 border-b border-muted/50'>
                  <div>
                    <span className='text-muted-foreground block text-[11px]'>NIS / Nomor Induk</span>
                    <span className='font-mono font-medium text-foreground'>
                      {log.studentNis || '-'}
                    </span>
                  </div>
                  <div>
                    <span className='text-muted-foreground block text-[11px]'>Kelas</span>
                    <span className='font-medium text-foreground'>{log.className || '-'}</span>
                  </div>
                </div>

                {log.guardianName && log.guardianName !== '-' && (
                  <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                    <span className='text-muted-foreground'>Nama Orang Tua / Wali</span>
                    <span className='font-medium text-foreground'>{log.guardianName}</span>
                  </div>
                )}

                {/* Highlight Nomor WhatsApp */}
                <div className='pt-1.5'>
                  <span className='text-muted-foreground block text-[11px] mb-1.5'>
                    Nomor WhatsApp Tujuan:
                  </span>
                  <div className='flex items-center justify-between rounded-lg bg-muted/60 p-2.5 border'>
                    <div className='flex items-center gap-2'>
                      <Smartphone className='h-4 w-4 text-emerald-600' />
                      <span className='font-mono font-bold text-sm tracking-wide text-foreground'>
                        {log.phoneNumber || '-'}
                      </span>
                    </div>

                    <div className='flex items-center gap-1'>
                      {log.phoneNumber && log.phoneNumber !== '-' && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 px-2 text-[11px]'
                          onClick={() => copyToClipboard(log.phoneNumber, 'Nomor WhatsApp')}
                          title='Salin Nomor'
                        >
                          <Copy className='h-3.5 w-3.5 mr-1' /> Salin
                        </Button>
                      )}
                      {waWebUrl && (
                        <a
                          href={waWebUrl}
                          target='_blank'
                          rel='noreferrer'
                          className='inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors'
                          title='Buka di WhatsApp Web'
                        >
                          <ExternalLink className='h-3.5 w-3.5' /> Chat WA
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Rincian Pengiriman Teknis */}
            <div className='rounded-xl border bg-card p-4 space-y-3.5 shadow-sm'>
              <div className='flex items-center gap-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-2.5'>
                <Activity className='h-4 w-4 text-primary' /> Rincian Log Teknis & Antrian
              </div>

              <div className='space-y-2.5 text-xs'>
                <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                  <span className='text-muted-foreground'>Tipe Notifikasi / Event</span>
                  <Badge variant='secondary' className='font-mono text-xs font-bold'>
                    {log.eventType}
                  </Badge>
                </div>

                <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                  <span className='text-muted-foreground'>Jumlah Percobaan (Attempts)</span>
                  <span className='font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded'>
                    {log.attempt} kali
                  </span>
                </div>

                <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                  <span className='text-muted-foreground'>Waktu Masuk Antrian</span>
                  <span className='font-mono text-foreground'>
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                  </span>
                </div>

                <div className='flex items-center justify-between py-1 border-b border-muted/50'>
                  <span className='text-muted-foreground'>Waktu Terakhir Diproses</span>
                  <span className='font-mono text-foreground'>
                    {log.sentAt
                      ? format(new Date(log.sentAt), 'dd/MM/yyyy HH:mm:ss')
                      : 'Belum berhasil terkirim'}
                  </span>
                </div>

                <div className='flex items-center justify-between pt-1'>
                  <span className='text-muted-foreground'>Status Penanganan</span>
                  <span
                    className={`font-semibold text-xs ${
                      log.status === 'SENT'
                        ? 'text-emerald-600'
                        : log.status === 'FAILED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {log.status === 'SENT'
                      ? '✓ Berhasil Tersampaikan'
                      : log.status === 'FAILED'
                      ? '✕ Perlu Ditindaklanjuti'
                      : '⏳ Sedang Diproses'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Konten Pesan WhatsApp (Realistis Chat Bubble Mockup) */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-semibold text-foreground flex items-center gap-1.5'>
                <MessageSquare className='h-4 w-4 text-emerald-600' /> Pratinjau Teks Pesan WhatsApp:
              </span>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs px-2.5'
                onClick={() => copyToClipboard(log.message, 'Isi Pesan WhatsApp')}
              >
                <Copy className='mr-1.5 h-3.5 w-3.5' /> Salin Seluruh Pesan
              </Button>
            </div>

            {/* Chat Bubble Container */}
            <div className='rounded-xl border bg-slate-100/70 dark:bg-zinc-950 p-4 relative overflow-hidden'>
              <div className='max-w-xl rounded-2xl rounded-tl-sm bg-white dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 p-4 shadow-sm space-y-2'>
                <div className='flex items-center justify-between pb-1.5 border-b border-muted/60 text-[11px] text-muted-foreground'>
                  <span className='font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'>
                    <Send className='h-3 w-3' /> Notifikasi Presensi Sekolah
                  </span>
                  <span className='font-mono'>
                    {format(new Date(log.createdAt), 'HH:mm')}
                  </span>
                </div>

                <pre className='whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground select-text'>
                  {log.message || '(Pesan kosong)'}
                </pre>

                <div className='flex items-center justify-end gap-1 pt-1 text-[10px] text-muted-foreground'>
                  <span>
                    {log.sentAt
                      ? format(new Date(log.sentAt), 'HH:mm')
                      : format(new Date(log.createdAt), 'HH:mm')}
                  </span>
                  {log.status === 'SENT' ? (
                    <span className='text-emerald-600 font-bold'>✓✓</span>
                  ) : log.status === 'FAILED' ? (
                    <span className='text-rose-600 font-bold'>✕ Gagal</span>
                  ) : (
                    <Clock className='h-3 w-3 text-amber-500' />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer with Clear Visual Hierarchy */}
        <div className='border-t bg-muted/30 px-6 py-4'>
          <div className='flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3'>
            {/* Quick Actions (Kiri) */}
            <div className='flex flex-wrap items-center gap-2'>
              {analysis.actionType === 'CHECK_DEVICE' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-9 text-xs'
                  onClick={() => {
                    onOpenChange(false)
                    navigate({ to: '/settings/wa-device' })
                  }}
                >
                  <Smartphone className='mr-1.5 h-3.5 w-3.5' /> Buka Pengaturan Device WA
                </Button>
              )}
              {analysis.actionType === 'RESET_DEDUP' && onOpenResetDedup && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-9 text-xs'
                  onClick={() => {
                    onOpenChange(false)
                    onOpenResetDedup(log.studentId, log.eventType)
                  }}
                >
                  <RotateCcw className='mr-1.5 h-3.5 w-3.5' /> Reset Deduplikasi Siswa
                </Button>
              )}
              {onDelete && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(log.id)
                  }}
                >
                  <Trash2 className='mr-1.5 h-3.5 w-3.5' /> Hapus Log Ini
                </Button>
              )}
            </div>

            {/* Main Action Buttons (Kanan) */}
            <div className='flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-9 px-4 text-xs'
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>

              {log.status === 'FAILED' && (
                <Button
                  type='button'
                  size='sm'
                  className='h-9 px-4 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm'
                  onClick={() => {
                    onRetry(log.id)
                    onOpenChange(false)
                  }}
                >
                  <RotateCcw className='mr-1.5 h-3.5 w-3.5' /> Coba Kirim Ulang (Retry)
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
