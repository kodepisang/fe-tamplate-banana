import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CustomDialog } from '@/components/custom-dialog'
import { GenericDataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type ClassData = {
  id: number
  name: string
  academicYearId: number
  createdAt: string
}

const getColumns = (
  handleEdit: (data: ClassData) => void,
  handleDelete: (id: number) => void
): ColumnDef<ClassData>[] => [
  {
    id: 'index',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='No.' />
    ),
    cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Nama Kelas' />
    ),
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='ID Kelas' />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Dibuat Pada' />
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) => (
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => handleEdit(row.original)}
        >
          Edit
        </Button>
        <Button
          variant='destructive'
          size='sm'
          onClick={() => handleDelete(row.original.id)}
        >
          Hapus
        </Button>
      </div>
    ),
  },
]

export function Classes() {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', academicYearId: 1 })
  const [academicYears, setAcademicYears] = useState<
    { label: string; value: string }[]
  >([])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const res = await api.get('/classes')
      if (res.data.success) {
        setClasses(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal memuat data kelas')
    } finally {
      setLoading(false)
    }
  }

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academic-years')
      if (res.data.success) {
        setAcademicYears(
          res.data.data.map((ay: { id: number; name: string }) => ({
            label: ay.name,
            value: ay.id.toString(),
          }))
        )
      }
    } catch (_err) {
      toast.error('Gagal memuat tahun ajaran')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClasses()
    fetchAcademicYears()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editId) {
        await api.put(`/classes/${editId}`, formData)
        toast.success('Kelas berhasil diperbarui!')
      } else {
        await api.post('/classes', formData)
        toast.success('Kelas berhasil ditambahkan!')
      }
      setIsAddDialogOpen(false)
      fetchClasses()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan kelas')
    }
  }

  const handleEdit = (data: ClassData) => {
    setEditId(data.id)
    setFormData({ name: data.name, academicYearId: data.academicYearId })
    setIsAddDialogOpen(true)
  }

  const handleDeleteClick = (id: number) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/classes/${deleteId}`)
      toast.success('Kelas berhasil dihapus!')
      fetchClasses()
    } catch (_err: unknown) {
      toast.error('Gagal menghapus kelas')
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
            <h2 className='text-2xl font-bold tracking-tight'>Daftar Kelas</h2>
            <p className='text-muted-foreground'>Kelola data kelas di sini.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => {
                setEditId(null)
                setFormData({ name: '', academicYearId: 1 })
                setIsAddDialogOpen(true)
              }}
            >
              <Plus size={18} className='mr-2' /> Tambah Kelas
            </Button>
          </div>
        </div>

        <div className='w-full'>
          {loading ? (
            <div className='py-4 text-center'>Memuat data...</div>
          ) : (
            <GenericDataTable
              columns={getColumns(handleEdit, handleDeleteClick)}
              data={classes}
            />
          )}
        </div>
      </Main>

      <CustomDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={editId ? 'Edit Kelas' : 'Tambah Kelas'}
        description='Masukkan informasi kelas.'
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Nama Kelas</Label>
            <Input
              id='name'
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='academicYearId'>Tahun Ajaran</Label>
            <Select
              value={
                formData.academicYearId
                  ? String(formData.academicYearId)
                  : undefined
              }
              onValueChange={(val) =>
                setFormData({ ...formData, academicYearId: Number(val) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Pilih Tahun Ajaran' />
              </SelectTrigger>
              <SelectContent>
                {academicYears?.map((ay) => (
                  <SelectItem key={ay.value} value={ay.value}>
                    {ay.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsAddDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        handleConfirm={handleDeleteConfirm}
        title='Konfirmasi Hapus'
        desc='Apakah Anda yakin ingin menghapus data ini? Aksi ini tidak dapat dibatalkan.'
        confirmText='Hapus'
        cancelBtnText='Batal'
        destructive
      />
    </>
  )
}
