import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GenericDataTable } from '@/components/data-table/generic-data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { CustomDialog } from '@/components/custom-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/api'

type TeacherData = {
  id: number
  name: string
  email: string
  roles: string[]
}

const getColumns = (
  handleEdit: (data: TeacherData) => void,
  handleDelete: (id: number) => void
): ColumnDef<TeacherData>[] => [
  {
    id: 'index',
    header: ({ column }) => <DataTableColumnHeader column={column} title='No.' />,
    cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nama Lengkap' />,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) => (
      <div className='flex gap-2'>
        <Button variant='outline' size='sm' onClick={() => handleEdit(row.original)}>
          Edit
        </Button>
        <Button variant='destructive' size='sm' onClick={() => handleDelete(row.original.id)}>
          Hapus
        </Button>
      </div>
    ),
  },
]

export function Teachers() {
  const [teachers, setTeachers] = useState<TeacherData[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '' })

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users?role=GURU_MAPEL') // We can adjust this to fetch GURU_WALI_KELAS etc if needed
      if (res.data.success) {
        setTeachers(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal mengambil data guru')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeachers()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...formData, roles: ['GURU_MAPEL'] } // Default to GURU_MAPEL
      await api.post('/users', payload)
      toast.success('Guru berhasil ditambahkan!')
      setIsAddDialogOpen(false)
      setFormData({ name: '', email: '', password: '' })
      fetchTeachers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menambahkan guru')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    try {
      const payload: Record<string, unknown> = { name: editFormData.name, email: editFormData.email }
      if (editFormData.password) {
        payload.password = editFormData.password
      }
      await api.put(`/users/${editId}`, payload)
      toast.success('Data guru berhasil diperbarui!')
      setIsEditDialogOpen(false)
      fetchTeachers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui guru')
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/users/${deleteId}`)
      toast.success('Data guru berhasil dihapus!')
      setIsDeleteDialogOpen(false)
      fetchTeachers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus guru')
    }
  }

  const onEditClick = (data: TeacherData) => {
    setEditId(data.id)
    setEditFormData({ name: data.name, email: data.email, password: '' })
    setIsEditDialogOpen(true)
  }

  const onDeleteClick = (id: number) => {
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const columns = getColumns(onEditClick, onDeleteClick)

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
            <h2 className='text-2xl font-bold tracking-tight'>Data Guru</h2>
            <p className='text-muted-foreground'>
              Kelola data guru di sini.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={18} className='mr-2' /> Tambah Guru
            </Button>
          </div>
        </div>
        
        <div className='w-full'>
          {loading ? (
            <div className='text-center py-4'>Memuat data...</div>
          ) : (
            <GenericDataTable columns={columns} data={teachers} />
          )}
        </div>
      </Main>

      {/* Add Dialog */}
      <CustomDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title='Tambah Guru'
        description='Masukkan detail guru baru.'
      >
        <form onSubmit={handleAdd} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='add-name'>Nama Lengkap</Label>
            <Input id='add-name' required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='add-email'>Email</Label>
            <Input id='add-email' type='email' required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='add-password'>Password</Label>
            <Input id='add-password' type='password' required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>

      {/* Edit Dialog */}
      <CustomDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title='Edit Guru'
        description='Ubah detail guru di sini.'
      >
        <form onSubmit={handleUpdate} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='edit-name'>Nama Lengkap</Label>
            <Input id='edit-name' required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='edit-email'>Email</Label>
            <Input id='edit-email' type='email' required value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='edit-password'>Password Baru (Opsional)</Label>
            <Input id='edit-password' type='password' value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} placeholder='Biarkan kosong jika tidak ingin mengubah' />
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button type='submit'>Simpan Perubahan</Button>
          </div>
        </form>
      </CustomDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title='Hapus Guru'
        desc='Apakah Anda yakin ingin menghapus data guru ini? Tindakan ini tidak dapat dibatalkan.'
        handleConfirm={confirmDelete}
        confirmText='Hapus'
        cancelBtnText='Batal'
        destructive={true}
      />
    </>
  )
}
