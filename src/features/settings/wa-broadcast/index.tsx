import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Paperclip, ShieldCheck, Sparkles, Users, Layers, AlertCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface ClassItem {
  id: number
  name: string
}

export function SettingsWaBroadcast() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [targetType, setTargetType] = useState<string>('ALL_GUARDIANS')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  const [sending, setSending] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes')
        if (res.data.success) {
          setClasses(res.data.data)
        }
      } catch (_err) {
        // silent
      }
    }
    fetchClasses()
  }, [])

  const handleInsertTag = (tag: string) => {
    setMessage((prev) => prev + `{${tag}}`)
  }

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error('Isi pesan pengumuman wajib diisi!')
      return
    }

    if ((targetType === 'CLASS_GUARDIANS' || targetType === 'CLASS_STUDENTS') && !selectedClassId) {
      toast.error('Harap pilih kelas terlebih dahulu!')
      return
    }

    try {
      setSending(true)
      const formData = new FormData()
      formData.append('targetType', targetType)
      if (selectedClassId) {
        formData.append('classId', selectedClassId)
      }
      formData.append('message', message)
      if (file) {
        formData.append('file', file)
      }

      const res = await api.post('/whatsapp/broadcast', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.success) {
        toast.success(res.data.message || 'Pengumuman WhatsApp berhasil dimasukkan ke antrean!')
        setMessage('')
        setFile(null)
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Gagal mengirimkan pengumuman WhatsApp')
    } finally {
      setSending(false)
      setIsConfirmOpen(false)
    }
  }

  const isClassRequired = targetType === 'CLASS_GUARDIANS' || targetType === 'CLASS_STUDENTS'

  return (
    <div className='p-6 space-y-6 max-w-4xl mx-auto'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Pengumuman & Broadcast WhatsApp Massal</h1>
        <p className='text-sm text-muted-foreground'>
          Kirimkan pesan pengumuman/informasi sekolah secara massal ke wali murid, siswa, atau guru dengan fitur Anti-Spam & Lampiran File.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-6'>
        {/* Form Broadcast Column */}
        <Card className='md:col-span-8 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <Send className='h-5 w-5 text-emerald-500' />
              Form Pengirim Pengumuman
            </CardTitle>
            <CardDescription className='text-xs'>Pilih sasaran penerima dan ketikkan isi pesan pengumuman</CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            {/* Target Selector */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold flex items-center gap-1.5'>
                <Users className='h-3.5 w-3.5 text-emerald-500' />
                Sasaran Target Penerima *
              </Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className='h-10 text-xs font-medium'>
                  <SelectValue placeholder='Pilih sasaran penerima...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL_GUARDIANS'>👨‍👩‍👧‍👦 Seluruh Wali Murid Sekolah</SelectItem>
                  <SelectItem value='CLASS_GUARDIANS'>🏫 Wali Murid Kelas Pertentu (Pilih Kelas)</SelectItem>
                  <SelectItem value='ALL_STUDENTS'>🎓 Seluruh Siswa Terdaftar</SelectItem>
                  <SelectItem value='CLASS_STUDENTS'>📚 Siswa Kelas Pertentu (Pilih Kelas)</SelectItem>
                  <SelectItem value='TEACHERS'>👨‍🏫 Guru & Staff Sekolah Saja</SelectItem>
                  <SelectItem value='ALL_CONTACTS'>🌐 Semua Kontak Terdaftar (Siswa + Wali + Guru)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class Selector if needed */}
            {isClassRequired && (
              <div className='space-y-1.5 animate-in fade-in duration-300'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <Layers className='h-3.5 w-3.5 text-emerald-500' />
                  Pilih Kelas *
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className='h-10 text-xs font-medium'>
                    <SelectValue placeholder='-- Pilih Kelas Target --' />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dynamic Tags */}
            <div className='space-y-2 pt-1'>
              <Label className='text-xs font-semibold'>Sisipkan Tag Dinamis (Klik untuk menambah):</Label>
              <div className='flex flex-wrap gap-1.5'>
                {['nama', 'kelas', 'sekolah'].map((tag) => (
                  <Button
                    key={tag}
                    type='button'
                    variant='secondary'
                    size='sm'
                    className='h-7 text-[11px] font-mono gap-1 hover:bg-emerald-500/20 hover:text-emerald-600 transition-colors'
                    onClick={() => handleInsertTag(tag)}
                  >
                    <Sparkles className='h-3 w-3 text-emerald-500' />
                    {`{${tag}}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Isi Pesan Pengumuman *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder='Ketik pesan pengumuman sekolah di sini...'
                className='font-mono text-xs leading-relaxed resize-y'
              />
            </div>

            {/* Attachment File */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold flex items-center gap-1.5'>
                <Paperclip className='h-3.5 w-3.5 text-emerald-500' />
                Lampiran File / Dokumen (Opsional - Gambar, PDF, Excel)
              </Label>
              <div className='flex items-center gap-3'>
                <Input
                  type='file'
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className='text-xs file:text-xs file:font-semibold'
                  accept='image/*,.pdf,.doc,.docx,.xls,.xlsx'
                />
                {file && (
                  <Button variant='ghost' size='sm' onClick={() => setFile(null)} className='text-xs text-rose-500 hover:text-rose-600'>
                    Hapus
                  </Button>
                )}
              </div>
            </div>

            {/* Action Submit */}
            <div className='pt-2 flex justify-end'>
              <Button
                onClick={() => setIsConfirmOpen(true)}
                disabled={sending || !message.trim()}
                className='gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md h-11 px-6'
              >
                <Send className='h-4 w-4' />
                Kirim Pengumuman Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Spam Info Column */}
        <div className='md:col-span-4 space-y-4'>
          <Card className='border-emerald-500/30 bg-linear-to-b from-emerald-500/5 to-transparent shadow-sm'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4' />
                Proteksi Sistem Anti-Spam
              </CardTitle>
            </CardHeader>
            <CardContent className='text-xs space-y-3 text-muted-foreground'>
              <div className='flex items-start gap-2.5'>
                <div className='h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0' />
                <p>
                  <strong className='text-foreground'>Pengiriman Bertahap:</strong> Jeda waktu 2-4 detik secara acak antar pengiriman pesan.
                </p>
              </div>
              <div className='flex items-start gap-2.5'>
                <div className='h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0' />
                <p>
                  <strong className='text-foreground'>Rate Limiting Safe:</strong> Dibatasi maksimal 20 pesan per menit agar nomor WA sekolah aman dari risiko pemblokiran (banned).
                </p>
              </div>
              <div className='flex items-start gap-2.5'>
                <div className='h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0' />
                <p>
                  <strong className='text-foreground'>Background Queue:</strong> Anda dapat melanjutkan pekerjaan lain, antrean pengiriman pesan berjalan otomatis di sistem background.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='shadow-sm'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xs font-bold flex items-center gap-1.5'>
                <AlertCircle className='h-3.5 w-3.5 text-amber-500' />
                Catatan Penting
              </CardTitle>
            </CardHeader>
            <CardContent className='text-[11px] text-muted-foreground space-y-2'>
              <p>
                Pastikan nomor WhatsApp orang tua/siswa terdaftar dengan format internasional Indonesia (`08xxx` atau `628xxx`).
              </p>
              <p>
                Anda dapat memantau status pengiriman broadcast melalui menu <strong className='text-foreground'>Pengaturan &gt; Monitoring WA</strong>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title='Konfirmasi Pengiriman Broadcast'
        desc='Apakah Anda yakin ingin mengirimkan pengumuman WhatsApp ini? Pesan akan dimasukkan ke antrean pengiriman bertahap (Anti-Spam).'
        confirmText='Ya, Kirim Sekarang'
        cancelBtnText='Batal'
        handleConfirm={handleSendBroadcast}
      />
    </div>
  )
}
