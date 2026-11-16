import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GenericDataTable } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { CustomDialog } from '@/components/custom-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import api from '@/lib/api'

type AcademicYearData = {
  id: number
  name: string
  isActive: boolean
  createdAt: string
}

const getColumns = (
  handleEdit: (data: AcademicYearData) => void,
  handleDelete: (id: number) => void
): ColumnDef<AcademicYearData>[] => [
  {
    id: 'index',
    header: ({ column }) => <DataTableColumnHeader column={column} title='No.' />,
    cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title='ID' />,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nama Tahun Akademik' />,
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
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Dibuat Pada' />,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>Edit</Button>
        <Button variant="destructive" size="sm" onClick={() => handleDelete(row.original.id)}>Hapus</Button>
      </div>
    ),
  },
]

export function AcademicYears() {
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', isActive: false })

  const fetchAcademicYears = async () => {
    try {
      setLoading(true)
      const res = await api.get('/academic-years')
      if (res.data.success) {
        setAcademicYears(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal memuat data tahun akademik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAcademicYears()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await api.put(`/academic-years/${editId}`, formData)
        toast.success('Tahun Akademik berhasil diperbarui!')
      } else {
        await api.post('/academic-years', formData)
        toast.success('Tahun Akademik berhasil ditambahkan!')
      }
      setIsAddDialogOpen(false)
      fetchAcademicYears()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan tahun akademik')
    }
  }

  const handleEdit = (data: AcademicYearData) => {
    setEditId(data.id)
    setFormData({ name: data.name, isActive: data.isActive })
    setIsAddDialogOpen(true)
  }

  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/academic-years/${deleteId}`)
      toast.success('Tahun Akademik berhasil dihapus!')
      fetchAcademicYears()
    } catch (_err: unknown) {
      toast.error('Gagal menghapus tahun akademik')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
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
            <h2 className='text-2xl font-bold tracking-tight'>Daftar Tahun Akademik</h2>
            <p className='text-muted-foreground'>
              Kelola data tahun akademik di sini.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => {
              setEditId(null)
              setFormData({ name: '', isActive: false })
              setIsAddDialogOpen(true)
            }}>
              <Plus size={18} className='mr-2' /> Tambah
            </Button>
          </div>
        </div>
        
        <div className='w-full'>
          {loading ? (
            <div className='text-center py-4'>Memuat data...</div>
          ) : (
            <GenericDataTable columns={getColumns(handleEdit, handleDeleteClick)} data={academicYears} />
          )}
        </div>
      </Main>

      <CustomDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={editId ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik'}
        description='Masukkan informasi tahun akademik.'
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Nama (Contoh: 2023/2024)</Label>
            <Input id='name' required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className='flex items-center space-x-2 pt-2'>
            <Switch
              id='isActive'
              checked={formData.isActive}
              onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor='isActive'>Status Aktif</Label>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={handleDeleteConfirm}
        title="Konfirmasi Hapus"
        desc="Apakah Anda yakin ingin menghapus data ini? Aksi ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelBtnText="Batal"
        destructive
      />
    </>
  )
}
