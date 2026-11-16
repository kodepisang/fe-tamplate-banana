import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { GenericDataTable } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { CustomDialog } from '@/components/custom-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Edit } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

type AttendanceSettingData = {
  id: number
  name: string
  checkInStart: string
  checkInEnd: string
  lateTolerance: string
  checkOutStart: string
  checkOutEnd: string
  isActive: boolean
}

const getColumns = (
  handleEdit: (data: AttendanceSettingData) => void
): ColumnDef<AttendanceSettingData>[] => [
  {
    id: 'index',
    header: ({ column }) => <DataTableColumnHeader column={column} title='No.' />,
    cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nama Pengaturan' />,
  },
  {
    accessorKey: 'checkIn',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Jam Masuk' />,
    cell: ({ row }) => `${row.original.checkInStart} - ${row.original.checkInEnd}`
  },
  {
    accessorKey: 'lateTolerance',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Batas Terlambat' />,
  },
  {
    accessorKey: 'checkOut',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Jam Pulang' />,
    cell: ({ row }) => `${row.original.checkOutStart} - ${row.original.checkOutEnd}`
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${row.original.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.original.isActive ? 'Aktif' : 'Tidak Aktif'}
      </span>
    )
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) => (
      <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>
        <Edit className="w-4 h-4 mr-2" /> Edit
      </Button>
    ),
  },
]

export function AttendanceSettings() {
  const [settings, setSettings] = useState<AttendanceSettingData[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<AttendanceSettingData>>({})

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/attendance/settings')
      if (res.data.success) {
        setSettings(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal memuat pengaturan absensi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings()
  }, [])

  const handleEdit = (data: AttendanceSettingData) => {
    setFormData(data)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formData.id) {
        await api.put(`/attendance/settings/${formData.id}`, formData)
        toast.success('Pengaturan berhasil diperbarui!')
      } else {
        await api.post('/attendance/settings', formData)
        toast.success('Pengaturan berhasil ditambahkan!')
      }
      setIsDialogOpen(false)
      fetchSettings()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMsg || 'Gagal menyimpan pengaturan')
    }
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Konfigurasi Jam Masuk & Pulang</h2>
            <p className='text-muted-foreground'>
              Mengatur jadwal absensi untuk mesin tap RFID (Gerbang).
            </p>
          </div>
          <Button onClick={() => {
            setFormData({ isActive: true })
            setIsDialogOpen(true)
          }}>Tambah Pengaturan</Button>
        </div>
        
        <div className='w-full'>
          {loading ? (
            <div className='text-center py-4'>Memuat data...</div>
          ) : (
            <GenericDataTable columns={getColumns(handleEdit)} data={settings} />
          )}
        </div>
      </Main>

      <CustomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={formData.id ? 'Edit Pengaturan Absensi' : 'Tambah Pengaturan Absensi'}
        description='Tentukan jam mulai dan akhir untuk setiap sesi.'
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Nama Pengaturan</Label>
            <Input id='name' required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Misal: Jam Reguler" />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='checkInStart'>Mulai Masuk</Label>
              <Input id='checkInStart' type="time" required value={formData.checkInStart || ''} onChange={e => setFormData({ ...formData, checkInStart: e.target.value })} />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='checkInEnd'>Batas Akhir Masuk</Label>
              <Input id='checkInEnd' type="time" required value={formData.checkInEnd || ''} onChange={e => setFormData({ ...formData, checkInEnd: e.target.value })} />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='lateTolerance'>Batas Toleransi Terlambat (Setel setelah jam ini dianggap bolos/tidak diizinkan)</Label>
            <Input id='lateTolerance' type="time" required value={formData.lateTolerance || ''} onChange={e => setFormData({ ...formData, lateTolerance: e.target.value })} />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='checkOutStart'>Mulai Pulang</Label>
              <Input id='checkOutStart' type="time" required value={formData.checkOutStart || ''} onChange={e => setFormData({ ...formData, checkOutStart: e.target.value })} />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='checkOutEnd'>Batas Akhir Pulang</Label>
              <Input id='checkOutEnd' type="time" required value={formData.checkOutEnd || ''} onChange={e => setFormData({ ...formData, checkOutEnd: e.target.value })} />
            </div>
          </div>
          <div className='flex items-center space-x-2 pt-2'>
            <Switch
              id='isActive'
              checked={formData.isActive || false}
              onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor='isActive'>Status Aktif</Label>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>
    </>
  )
}
