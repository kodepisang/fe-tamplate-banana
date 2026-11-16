import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Smartphone, QrCode, RefreshCw, LogOut, Zap, CheckCircle2, AlertCircle, Send, MessageSquare } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface DeviceStatus {
  deviceId?: string
  phone?: string
  status?: string
  isLoggedIn?: boolean
}

export function SettingsWaDevice() {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingQr, setLoadingQr] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [isScanning, setIsScanning] = useState(false)

  // Test send state
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [loadingTest, setLoadingTest] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const qrCardRef = useRef<HTMLDivElement>(null)

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true)
      const res = await api.get('/whatsapp/device/status')
      if (res.data.success) {
        setDeviceStatus(res.data.data)
        if (res.data.data.isLoggedIn) {
          setIsScanning(false)
          setQrCode(null)
        }
      }
    } catch (_err) {
      // silent
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchQr = async () => {
    try {
      setLoadingQr(true)
      const res = await api.get('/whatsapp/device/qr')
      if (res.data.success && res.data.data.qrCode) {
        setQrCode(res.data.data.qrCode)
        setCountdown(res.data.data.duration || 30)
        setIsScanning(true)

        // Smooth scroll to QR Card
        setTimeout(() => {
          qrCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 100)
      } else {
        toast.error(res.data.message || 'Gagal mengambil QR Code')
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal terhubung ke WhatsApp server')
    } finally {
      setLoadingQr(false)
    }
  }

  const handleLogoutConfirm = async () => {
    try {
      const res = await api.get('/whatsapp/device/logout')
      if (res.data.success) {
        toast.success('Koneksi WhatsApp berhasil diputuskan')
        fetchStatus()
      }
    } catch (_err) {
      toast.error('Gagal memutuskan koneksi')
    } finally {
      setIsLogoutDialogOpen(false)
    }
  }

  const handleReconnect = async () => {
    try {
      const res = await api.get('/whatsapp/device/reconnect')
      if (res.data.success) {
        toast.success('Perintah reconnect dikirim')
        fetchStatus()
      }
    } catch (_err) {
      toast.error('Gagal reconnect')
    }
  }

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone.trim()) {
      toast.error('Masukkan nomor WhatsApp tujuan')
      return
    }

    try {
      setLoadingTest(true)
      const res = await api.post('/whatsapp/test-send', {
        phone: testPhone,
        message: testMessage || undefined,
      })
      if (res.data.success) {
        toast.success(res.data.message || 'Pesan tes berhasil dikirim!')
        setTestPhone('')
        setTestMessage('')
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal mengirim pesan tes')
    } finally {
      setLoadingTest(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()

    const statusInterval = setInterval(() => {
      fetchStatus()
    }, 10000)

    return () => clearInterval(statusInterval)
  }, [])

  // QR Countdown Timer logic
  useEffect(() => {
    if (!isScanning || !qrCode) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQr()
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isScanning, qrCode])

  const isLoggedIn = deviceStatus?.isLoggedIn

  return (
    <div className='w-full space-y-6 pb-16 overflow-y-auto max-h-full pr-1'>
      <div>
        <h3 className='text-lg font-medium'>Koneksi Perangkat WhatsApp (QR Code)</h3>
        <p className='text-sm text-muted-foreground'>
          Hubungkan akun WhatsApp sekolah ke sistem gateway GOWA (`go-whatsapp-web-multidevice`).
        </p>
      </div>

      {/* Section 1: Connection Status Banner */}
      <Card className='border-2'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Smartphone className='h-8 w-8 text-primary' />
              <div>
                <CardTitle>Status Perangkat WhatsApp</CardTitle>
                <CardDescription>Device ID: <span className='font-mono font-bold'>{deviceStatus?.deviceId || 'default'}</span></CardDescription>
              </div>
            </div>
            <div>
              {loadingStatus ? (
                <Badge variant='outline'>Checking...</Badge>
              ) : isLoggedIn ? (
                <Badge className='bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-1 px-3 flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full bg-white animate-pulse' />
                  Terhubung
                </Badge>
              ) : isScanning ? (
                <Badge className='bg-amber-500 hover:bg-amber-600 text-white text-sm py-1 px-3 flex items-center gap-1.5'>
                  <span className='h-2 w-2 rounded-full bg-white animate-ping' />
                  Menunggu Scan QR
                </Badge>
              ) : (
                <Badge variant='destructive' className='text-sm py-1 px-3 flex items-center gap-1.5'>
                  <AlertCircle className='h-3.5 w-3.5' />
                  Terputus
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {isLoggedIn ? (
            <div className='rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <CheckCircle2 className='h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0' />
                <div>
                  <p className='font-medium text-emerald-900 dark:text-emerald-200'>
                    Akun WA Terhubung: <span className='font-mono font-bold'>+{deviceStatus?.phone || '628xxx'}</span>
                  </p>
                  <p className='text-xs text-emerald-700 dark:text-emerald-400'>
                    Sistem siap mendelivery pesan notifikasi absensi dan rekap PDF.
                  </p>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' onClick={handleReconnect}>
                  <Zap className='mr-1 h-3.5 w-3.5' /> Reconnect
                </Button>
                <Button size='sm' variant='destructive' onClick={() => setIsLogoutDialogOpen(true)}>
                  <LogOut className='mr-1 h-3.5 w-3.5' /> Putuskan
                </Button>
              </div>
            </div>
          ) : (
            <div className='flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted p-4'>
              <div>
                <p className='font-medium text-sm'>Perangkat Belum Terhubung</p>
                <p className='text-xs text-muted-foreground'>
                  Klik tombol di samping untuk menghasilkan QR Code baru untuk di-scan.
                </p>
              </div>
              <Button onClick={fetchQr} disabled={loadingQr}>
                <QrCode className='mr-2 h-4 w-4' /> {loadingQr ? 'Memuat QR...' : 'Tampilkan QR Code'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: QR Code Panel (Visible during pairing) */}
      {isScanning && qrCode && !isLoggedIn && (
        <div ref={qrCardRef}>
          <Card className='border-amber-400 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 shadow-lg transition-all'>
            <CardHeader className='text-center pb-2'>
              <CardTitle className='text-lg flex items-center justify-center gap-2 text-amber-900 dark:text-amber-200'>
                <QrCode className='h-5 w-5 text-amber-600' /> Scan QR Code WhatsApp
              </CardTitle>
              <CardDescription className='text-amber-800 dark:text-amber-300'>
                QR Code diperbarui otomatis dalam <span className='font-bold font-mono text-amber-700 dark:text-amber-200 text-base'>{countdown}</span> detik
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col items-center gap-6 py-4'>
              {/* High Contrast White QR Container */}
              <div className='p-5 bg-white rounded-2xl shadow-xl border-2 border-amber-200 flex flex-col items-center justify-center min-h-[280px] min-w-[280px]'>
                <img
                  src={qrCode}
                  alt='WhatsApp QR Code'
                  className='w-64 h-64 object-contain rounded-lg'
                />
                <p className='text-[11px] text-gray-500 font-mono mt-2 animate-pulse'>
                  ⚡ Arahkan kamera WhatsApp ke QR Code di atas
                </p>
              </div>

              {/* Instructions */}
              <div className='text-center space-y-2 text-sm text-muted-foreground max-w-md bg-white/80 dark:bg-black/30 p-4 rounded-xl border border-amber-200/50'>
                <p className='font-semibold text-foreground text-xs uppercase tracking-wider'>
                  Langkah-Langkah Scan:
                </p>
                <ol className='list-decimal list-inside text-xs space-y-1 text-left inline-block font-medium'>
                  <li>Buka aplikasi WhatsApp di HP pengirim sekolah.</li>
                  <li>Ketuk menu <span className='font-semibold'>Titik Tiga ⋮</span> (Android) atau <span className='font-semibold'>Pengaturan</span> (iOS).</li>
                  <li>Pilih <span className='font-semibold'>Perangkat Tertaut</span> → <span className='font-semibold'>Tautkan Perangkat</span>.</li>
                  <li>Scan gambar QR Code di atas hingga terhubung.</li>
                </ol>
              </div>

              <div className='flex gap-3'>
                <Button variant='outline' size='sm' onClick={fetchQr} disabled={loadingQr}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingQr ? 'animate-spin' : ''}`} /> Refresh QR Manual
                </Button>
                <Button variant='ghost' size='sm' onClick={() => setIsScanning(false)}>
                  Tutup Panel QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 3: Test Send Message Card */}
      <Card className='border'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <MessageSquare className='h-6 w-6 text-primary' />
            <div>
              <CardTitle className='text-base'>Tes Kirim Pesan WhatsApp</CardTitle>
              <CardDescription>
                Uji coba pengiriman pesan langsung ke nomor HP untuk memastikan device WhatsApp benar-benar siap dan dapat mendelivery pesan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestSend} className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='testPhone'>Nomor WhatsApp Tujuan</Label>
                <Input
                  id='testPhone'
                  placeholder='Contoh: 628123456789 atau 08123456789'
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='testMessage'>Isi Pesan Tes (Opsional)</Label>
                <Textarea
                  id='testMessage'
                  rows={2}
                  placeholder='Pesannya: Halo! Ini adalah pesan uji coba presensi.'
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>
            </div>
            <div className='flex justify-end'>
              <Button type='submit' disabled={loadingTest || !testPhone.trim()}>
                <Send className='mr-2 h-4 w-4' /> {loadingTest ? 'Mengirim Pesan...' : 'Kirim Pesan Tes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        handleConfirm={handleLogoutConfirm}
        title='Konfirmasi Putuskan Koneksi'
        desc='Apakah Anda yakin ingin memutuskan koneksi akun WhatsApp ini? Perangkat harus di-scan ulang untuk terhubung kembali.'
        confirmText='Putuskan'
        cancelBtnText='Batal'
        destructive
      />
    </div>
  )
}
