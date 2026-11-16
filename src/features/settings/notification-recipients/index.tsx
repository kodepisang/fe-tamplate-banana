import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

export interface Recipient {
  id: number
  name: string
  phoneNumber: string
  role: string
  isActive: boolean
  receiveDaily: boolean
  createdAt?: string
}

interface WaStatus {
  sentToday?: number
  failedToday?: number
  queueLength?: number
}

export function SettingsNotificationRecipients() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [waStatus, setWaStatus] = useState<WaStatus | null>(null)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    role: 'KEPSEK',
    isActive: true,
    receiveDaily: true,
  })

  const fetchRecipients = async () => {
    try {
      setLoading(true)
      const res = await api.get('/notification-recipients')
      if (res.data.success) {
        setRecipients(res.data.data)
      }
    } catch (_err) {
      toast.error('Gagal mengambil data penerima')
    } finally {
      setLoading(false)
    }
  }

  const fetchWaStatus = async () => {
    try {
      const res = await api.get('/whatsapp/device/status')
      if (res.data.success) {
        setWaStatus(res.data.data)
      }
    } catch (_err) {
      // silent
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipients()
    fetchWaStatus()
  }, [])

  const handleOpenCreate = () => {
    setEditingRecipient(null)
    setFormData({
      name: '',
      phoneNumber: '',
      role: 'KEPSEK',
      isActive: true,
      receiveDaily: true,
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient)
    setFormData({
      name: recipient.name,
      phoneNumber: recipient.phoneNumber,
      role: recipient.role,
      isActive: recipient.isActive,
      receiveDaily: recipient.receiveDaily,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phoneNumber.trim()) {
      toast.error('Nama dan Nomor WA wajib diisi')
      return
    }

    try {
      if (editingRecipient) {
        const res = await api.put(`/notification-recipients/${editingRecipient.id}`, formData)
        if (res.data.success) {
          toast.success('Penerima berhasil diperbarui')
        }
      } else {
        const res = await api.post('/notification-recipients', formData)
        if (res.data.success) {
          toast.success('Penerima berhasil ditambahkan')
        }
      }
      setIsDialogOpen(false)
      fetchRecipients()
    } catch (error: unknown) {
      const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Terjadi kesalahan')
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const res = await api.delete(`/notification-recipients/${deleteId}`)
      if (res.data.success) {
        toast.success('Penerima berhasil dihapus')
        fetchRecipients()
      }
    } catch (_err) {
      toast.error('Gagal menghapus penerima')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (recipient: Recipient) => {
    try {
      await api.put(`/notification-recipients/${recipient.id}`, {
        isActive: !recipient.isActive,
      })
      toast.success(`Status ${recipient.name} diperbarui`)
      fetchRecipients()
    } catch (_err) {
      toast.error('Gagal memperbarui status')
    }
  }

  const handleToggleDaily = async (recipient: Recipient) => {
    try {
      await api.put(`/notification-recipients/${recipient.id}`, {
        receiveDaily: !recipient.receiveDaily,
      })
      toast.success(`Pengaturan rekap harian ${recipient.name} diperbarui`)
      fetchRecipients()
    } catch (_err) {
      toast.error('Gagal memperbarui pengaturan')
    }
  }

  return (
    <div className='w-full space-y-6'>
      <div>
        <h3 className='text-lg font-medium'>Penerima Notifikasi WA & Rekap Harian</h3>
        <p className='text-sm text-muted-foreground'>
          Kelola nomor penerima (Kepala Sekolah, Wakasek, Guru BK) yang menerima laporan rekap harian absensi via WhatsApp.
        </p>
      </div>

      {/* Mini Monitoring Widget */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>WA Terkirim Hari Ini</CardTitle>
            <CheckCircle2 className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{waStatus?.sentToday ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>WA Gagal Hari Ini</CardTitle>
            <AlertCircle className='h-4 w-4 text-rose-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{waStatus?.failedToday ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Dalam Antrian</CardTitle>
            <Clock className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{waStatus?.queueLength ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className='flex items-center justify-between'>
        <h4 className='font-semibold text-md'>Daftar Penerima Rekap</h4>
        <Button onClick={handleOpenCreate}>
          <Plus className='mr-2 h-4 w-4' /> Tambah Penerima
        </Button>
      </div>

      <div className='rounded-md border'>
        <table className='w-full text-sm text-left'>
          <thead className='bg-muted text-muted-foreground uppercase text-xs'>
            <tr>
              <th className='p-3'>Nama</th>
              <th className='p-3'>No. WhatsApp</th>
              <th className='p-3'>Role / Jabatan</th>
              <th className='p-3'>Aktif</th>
              <th className='p-3'>Terima Rekap Harian</th>
              <th className='p-3 text-right'>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className='p-4 text-center'>
                  Memuat data...
                </td>
              </tr>
            ) : recipients.length === 0 ? (
              <tr>
                <td colSpan={6} className='p-4 text-center text-muted-foreground'>
                  Belum ada penerima notifikasi terdaftar.
                </td>
              </tr>
            ) : (
              recipients.map((r) => (
                <tr key={r.id} className='border-b hover:bg-muted/50'>
                  <td className='p-3 font-medium'>{r.name}</td>
                  <td className='p-3 font-mono'>{r.phoneNumber}</td>
                  <td className='p-3'>
                    <Badge variant='outline'>{r.role}</Badge>
                  </td>
                  <td className='p-3'>
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={() => handleToggleActive(r)}
                    />
                  </td>
                  <td className='p-3'>
                    <Switch
                      checked={r.receiveDaily}
                      onCheckedChange={() => handleToggleDaily(r)}
                    />
                  </td>
                  <td className='p-3 text-right space-x-2'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleOpenEdit(r)}
                    >
                      <Edit2 className='h-4 w-4' />
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-rose-500 hover:text-rose-700'
                      onClick={() => handleDeleteClick(r.id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Create / Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? 'Edit Penerima Notifikasi' : 'Tambah Penerima Notifikasi'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Nama Lengkap / Jabatan</Label>
              <Input
                placeholder='Contoh: Dra. Hj. Siti (Kepala Sekolah)'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label>Nomor WhatsApp (Format 628xxx)</Label>
              <Input
                placeholder='628123456789'
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label>Role / Jabatan</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Pilih Role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='KEPSEK'>Kepala Sekolah</SelectItem>
                  <SelectItem value='WAKASEK'>Wakasek Kesiswaan</SelectItem>
                  <SelectItem value='GURU_BK'>Guru BK</SelectItem>
                  <SelectItem value='CUSTOM'>Lainnya / Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center justify-between pt-2'>
              <Label>Status Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
              />
            </div>
            <div className='flex items-center justify-between'>
              <Label>Kirim Rekap PDF Harian (Setiap 14:00 WIB)</Label>
              <Switch
                checked={formData.receiveDaily}
                onCheckedChange={(val) => setFormData({ ...formData, receiveDaily: val })}
              />
            </div>
            <DialogFooter className='pt-4'>
              <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type='submit'>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={handleDeleteConfirm}
        title='Konfirmasi Hapus Penerima'
        desc='Apakah Anda yakin ingin menghapus penerima notifikasi ini? Aksi ini tidak dapat dibatalkan.'
        confirmText='Hapus'
        cancelBtnText='Batal'
        destructive
      />
    </div>
  )
}
