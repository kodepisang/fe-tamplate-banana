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
import { toast } from 'sonner'
import api from '@/lib/api'

type SubjectData = {
  id: number
  name: string
  code?: string
}

const getColumns = (
  handleEdit: (data: SubjectData) => void,
  handleDelete: (id: number) => void
): ColumnDef<SubjectData>[] => [
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
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nama Mata Pelajaran' />,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Kode' />,
    cell: ({ row }) => row.original.code || '-'
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

export function Subjects() {
  const [subjects, setSubjects] = useState<SubjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '' })

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      const res = await api.get('/subjects')
      if (res.data.success) {
        setSubjects(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal memuat data mata pelajaran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await api.put(`/subjects/${editId}`, formData)
        toast.success('Mata Pelajaran berhasil diperbarui!')
      } else {
        await api.post('/subjects', formData)
        toast.success('Mata Pelajaran berhasil ditambahkan!')
      }
      setIsAddDialogOpen(false)
      fetchSubjects()
    } catch (_err: unknown) {
      toast.error('Terjadi kesalahan')
    }
  }

  const handleEdit = (data: SubjectData) => {
    setEditId(data.id)
    setFormData({ name: data.name, code: data.code || '' })
    setIsAddDialogOpen(true)
  }

  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/subjects/${deleteId}`)
      toast.success('Mata Pelajaran berhasil dihapus!')
      fetchSubjects()
    } catch (_err: unknown) {
      toast.error('Gagal menghapus mata pelajaran')
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
            <h2 className='text-2xl font-bold tracking-tight'>Data Mata Pelajaran</h2>
            <p className='text-muted-foreground'>
              Kelola data mata pelajaran di sini.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => {
              setEditId(null)
              setFormData({ name: '', code: '' })
              setIsAddDialogOpen(true)
            }}>
              <Plus size={18} className='mr-2' /> Tambah Pelajaran
            </Button>
          </div>
        </div>
        
        <div className='w-full'>
          {loading ? (
            <div className='text-center py-4'>Memuat data...</div>
          ) : (
            <GenericDataTable columns={getColumns(handleEdit, handleDeleteClick)} data={subjects} />
          )}
        </div>
      </Main>

      <CustomDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={editId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        description='Masukkan informasi mata pelajaran.'
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Nama Mata Pelajaran</Label>
            <Input id='name' required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='code'>Kode (Opsional)</Label>
            <Input id='code' value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
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
