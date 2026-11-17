import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import api from '@/lib/api'
import { useServerTime } from '@/lib/server-time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit2, Trash2, Calendar, CalendarCheck, Users, QrCode, Search, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Link } from '@tanstack/react-router'

export interface EventItem {
  id: number
  name: string
  description?: string | null
  startTime?: string | null
  endTime?: string | null
  isActive: boolean
  createdAt: string
  _count?: { attendances: number }
}

export interface EventLogItem {
  id: number
  tapTime: string
  user: {
    name: string
    profile?: {
      nomorInduk?: string
      class?: { name: string }
    }
  }
}

// Helper to convert "HH:mm" to minutes
const parseTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

const isEventActiveNow = (evt: EventItem, date: Date): boolean => {
  const start = parseTimeToMinutes(evt.startTime)
  const end = parseTimeToMinutes(evt.endTime)
  if (start === null || end === null) return false

  const current = date.getHours() * 60 + date.getMinutes()
  if (start <= end) {
    return current >= start && current <= end
  }
  return current >= start || current <= end
}

export function ManagementEvents() {
  const currentTime = useServerTime(10000)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog Add/Edit state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    isActive: true,
  })

  // Delete Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Logs Modal State
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [eventLogs, setEventLogs] = useState<EventLogItem[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logSearch, setLogSearch] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        setLoading(true)
        const res = await api.get('/events')
        if (res.data.success && isMounted) {
          setEvents(res.data.data)
        }
      } catch (_err) {
        toast.error('Gagal mengambil data kegiatan / event')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleActive = async (evt: EventItem) => {
    try {
      const nextActive = !evt.isActive
      const res = await api.put(`/events/${evt.id}`, { isActive: nextActive })
      if (res.data.success) {
        toast.success(`Kegiatan "${evt.name}" diubah menjadi ${nextActive ? 'Aktif' : 'Non-Aktif'}`)
        setEvents((prev) => prev.map((e) => (e.id === evt.id ? { ...e, isActive: nextActive } : e)))
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Gagal mengubah status kegiatan')
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await api.get('/events')
      if (res.data.success) {
        setEvents(res.data.data)
      }
    } catch (_err) {
      toast.error('Gagal mengambil data kegiatan / event')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingEvent(null)
    setFormData({
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (evt: EventItem) => {
    setEditingEvent(evt)
    setFormData({
      name: evt.name,
      description: evt.description || '',
      startTime: evt.startTime || '',
      endTime: evt.endTime || '',
      isActive: evt.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Nama kegiatan wajib diisi!')
      return
    }

    try {
      if (editingEvent) {
        const res = await api.put(`/events/${editingEvent.id}`, formData)
        if (res.data.success) {
          toast.success('Kegiatan berhasil diperbarui!')
        }
      } else {
        const res = await api.post('/events', formData)
        if (res.data.success) {
          toast.success('Kegiatan baru berhasil ditambahkan!')
        }
      }
      setIsDialogOpen(false)
      fetchEvents()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Gagal menyimpan data kegiatan')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete(`/events/${deleteId}`)
      if (res.data.success) {
        toast.success('Kegiatan berhasil dihapus!')
        fetchEvents()
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Gagal menghapus kegiatan')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
    }
  }

  const handleViewLogs = async (evt: EventItem) => {
    setSelectedEvent(evt)
    setLoadingLogs(true)
    try {
      const res = await api.get(`/events/${evt.id}`)
      if (res.data.success) {
        setEventLogs(res.data.data.attendances || [])
      }
    } catch (_err) {
      toast.error('Gagal mengambil daftar peserta kegiatan')
    } finally {
      setLoadingLogs(false)
    }
  }

  const filteredLogs = eventLogs.filter((log) => {
    const q = logSearch.toLowerCase()
    const name = log.user?.name?.toLowerCase() || ''
    const nis = log.user?.profile?.nomorInduk?.toLowerCase() || ''
    const className = log.user?.profile?.class?.name?.toLowerCase() || ''
    return name.includes(q) || nis.includes(q) || className.includes(q)
  })

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Manajemen Kegiatan & Event</h1>
          <p className='text-sm text-muted-foreground'>
            Kelola konfigurasi kegiatan (Sholat Dhuha, Praktek, Ekstrakurikuler, dll.) & pantau kehadiran siswa.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link to='/event-attendance'>
            <Button variant='outline' className='gap-2 text-primary border-primary/30 hover:bg-primary/5'>
              <CalendarCheck className='h-4 w-4' />
              Log Kehadiran Kegiatan
            </Button>
          </Link>
          <Link to='/event-kiosk'>
            <Button variant='outline' className='gap-2'>
              <QrCode className='h-4 w-4' />
              Kiosk Tap Kegiatan
            </Button>
          </Link>
          <Button onClick={handleOpenCreate} className='gap-2 shadow-md'>
            <Plus className='h-4 w-4' />
            Tambah Kegiatan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='text-center py-12 text-sm text-muted-foreground'>Memuat daftar kegiatan...</div>
      ) : events.length === 0 ? (
        <Card className='p-8 text-center border-dashed'>
          <Calendar className='h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50' />
          <h3 className='font-semibold text-lg'>Belum Ada Kegiatan</h3>
          <p className='text-sm text-muted-foreground mb-4'>
            Silakan buat kegiatan baru untuk mulai mencatat presensi khusus kegiatan/event siswa.
          </p>
          <Button onClick={handleOpenCreate} className='gap-2'>
            <Plus className='h-4 w-4' />
            Buat Kegiatan Pertama
          </Button>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {events.map((evt) => {
            const isOngoingNow = isEventActiveNow(evt, currentTime)

            return (
              <Card key={evt.id} className='relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <CardTitle className='text-base font-bold line-clamp-1'>{evt.name}</CardTitle>
                      {isOngoingNow && evt.isActive && (
                        <span className='inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded mt-1 border border-emerald-500/20'>
                          <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
                          Sedang Berlangsung (Sesuai Jam)
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1.5 shrink-0'>
                      <Switch
                        checked={evt.isActive}
                        onCheckedChange={() => handleToggleActive(evt)}
                        title={evt.isActive ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}
                      />
                      <Badge variant={evt.isActive ? 'default' : 'secondary'} className='text-[10px]'>
                        {evt.isActive ? 'Aktif' : 'Non-Aktif'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className='text-xs line-clamp-2 mt-1'>
                    {evt.description || 'Tidak ada deskripsi kegiatan.'}
                  </CardDescription>
                </CardHeader>
              <CardContent className='space-y-3 pt-0 text-xs'>
                <div className='flex items-center justify-between text-muted-foreground border-y py-2'>
                  <span>Waktu / Jam:</span>
                  <span className='font-semibold font-mono text-foreground'>
                    {evt.startTime || '-'} - {evt.endTime || '-'}
                  </span>
                </div>
                <div className='flex items-center justify-between text-muted-foreground'>
                  <span>Total Peserta Tap:</span>
                  <Badge variant='outline' className='font-mono font-bold text-xs'>
                    {evt._count?.attendances ?? 0} Siswa
                  </Badge>
                </div>
                <div className='pt-2 flex items-center justify-between gap-2'>
                  <Button variant='outline' size='sm' className='h-8 text-xs gap-1 flex-1' onClick={() => handleViewLogs(evt)}>
                    <Users className='h-3.5 w-3.5' />
                    Daftar Peserta
                  </Button>
                  <Button variant='ghost' size='icon' className='h-8 w-8 text-muted-foreground hover:text-foreground' onClick={() => handleOpenEdit(evt)}>
                    <Edit2 className='h-3.5 w-3.5' />
                  </Button>
                  <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive hover:text-destructive' onClick={() => { setDeleteId(evt.id); setIsDeleteDialogOpen(true) }}>
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Nama Kegiatan / Event *</Label>
              <Input
                placeholder='Misal: Sholat Dhuha Berjamaah / Praktek Komputer'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Deskripsi Singkat</Label>
              <Textarea
                placeholder='Keterangan tambahan kegiatan'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Jam Mulai</Label>
                <Input
                  type='time'
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Jam Selesai</Label>
                <Input
                  type='time'
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className='flex items-center justify-between p-3 border rounded-md bg-muted/30'>
              <div className='space-y-0.5'>
                <Label className='text-xs font-semibold'>Status Aktif Kegiatan</Label>
                <p className='text-[11px] text-muted-foreground'>Bisa di-tap oleh siswa jika aktif</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
              />
            </div>
            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type='submit'>Simpan Kegiatan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title='Hapus Kegiatan'
        desc='Apakah Anda yakin ingin menghapus kegiatan ini? Seluruh log presensi kegiatan ini juga akan dihapus.'
        confirmText='Hapus'
        cancelBtnText='Batal'
        destructive
        handleConfirm={handleDelete}
      />

      {/* Detail Modal Logs */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className='max-w-xl max-h-[85vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>Daftar Peserta: {selectedEvent?.name}</DialogTitle>
          </DialogHeader>

          <div className='flex items-center justify-between gap-2 py-2'>
            <div className='relative flex-1'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Cari nama siswa, NIS, atau kelas...'
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className='pl-8 h-9 text-xs'
              />
            </div>
            <Button variant='outline' size='sm' onClick={() => selectedEvent && handleViewLogs(selectedEvent)} className='h-9 gap-1'>
              <RefreshCw className='h-3.5 w-3.5' />
              Refresh
            </Button>
          </div>

          <div className='flex-1 overflow-y-auto pr-1 space-y-2 py-1'>
            {loadingLogs ? (
              <p className='text-xs text-muted-foreground text-center py-6'>Memuat data peserta...</p>
            ) : filteredLogs.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-6 italic'>
                Belum ada siswa yang melakukan tap presensi kegiatan ini.
              </p>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={log.id} className='flex items-center justify-between p-2.5 border rounded-md text-xs hover:bg-muted/40'>
                  <div className='flex items-center gap-3'>
                    <span className='font-mono text-muted-foreground w-5 text-center'>{idx + 1}.</span>
                    <div>
                      <h4 className='font-bold text-sm'>{log.user?.name}</h4>
                      <p className='text-muted-foreground text-[11px]'>
                        NIS: {log.user?.profile?.nomorInduk || '-'} | Kelas: {log.user?.profile?.class?.name || '-'}
                      </p>
                    </div>
                  </div>
                  <Badge variant='outline' className='font-mono text-[10px]'>
                    {format(new Date(log.tapTime), "HH:mm:ss 'WIB'")}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
