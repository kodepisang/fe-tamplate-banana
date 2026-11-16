import { useEffect, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Edit, Trash, Upload, Loader2, Image as ImageIcon, Eye, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CustomDialog } from '@/components/custom-dialog'
import { GenericDataTable } from '@/components/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type StudentData = {
  id: number
  name: string
  firstName?: string
  lastName?: string
  email: string
  roles: { name: string }[]
  profile?: {
    avatarUrl?: string
    nomorInduk?: string
    gender?: string
    classId?: number
    guardianName?: string
    phone?: string
    guardianPhone?: string
    address?: string
    rfidCardId?: string
    class?: {
      name: string
    }
  }
}

type ClassData = {
  id: number
  name: string
}

const defaultFormData = {
  id: null as number | null,
  avatarUrl: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  nomorInduk: '',
  gender: '',
  classId: '',
  guardianName: '',
  phone: '',
  guardianPhone: '',
  address: '',
  rfidCardId: '',
}

export function Students() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<StudentData[]>([])
  const [bulkClassId, setBulkClassId] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all')

  const [formData, setFormData] = useState(defaultFormData)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    isOpen: boolean
    url: string
    title: string
    subtitle?: string
  }>({
    isOpen: false,
    url: '',
    title: '',
    subtitle: '',
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, atau WEBP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB')
      return
    }

    // Instant local preview
    const localUrl = URL.createObjectURL(file)
    setLocalPreviewUrl(localUrl)

    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    try {
      setIsUploading(true)
      const res = await api.post('/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.success && res.data?.data?.url) {
        setFormData((prev) => ({ ...prev, avatarUrl: res.data.data.url }))
        toast.success('Foto berhasil diunggah')
      } else {
        toast.error('Gagal mengunggah foto')
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      toast.error(errorObj.response?.data?.message || 'Gagal mengunggah foto')
    } finally {
      setIsUploading(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resStudents, resClasses] = await Promise.all([
        api.get('/users?role=MURID'),
        api.get('/classes'),
      ])

      if (resStudents.data.success) {
        setStudents(resStudents.data.data)
      }
      if (resClasses.data.success) {
        setClasses(resClasses.data.data)
      }
    } catch (_error) {
      toast.error('Gagal mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

  const renderToolbarActions = (
    table: import('@tanstack/react-table').Table<StudentData>
  ) => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) return null

    return (
      <div className='flex flex-wrap gap-2 sm:ml-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            setSelectedStudents(selectedRows.map((r) => r.original))
            setBulkClassId('')
            setIsBulkEditDialogOpen(true)
          }}
        >
          Edit Kelas ({selectedRows.length})
        </Button>
        <Button
          variant='destructive'
          size='sm'
          onClick={() => {
            setSelectedStudents(selectedRows.map((r) => r.original))
            setIsBulkDeleteDialogOpen(true)
          }}
        >
          <Trash className='mr-1 h-4 w-4' /> Hapus ({selectedRows.length})
        </Button>
      </div>
    )
  }

  const columns: ColumnDef<StudentData>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
      id: 'avatar',
      header: 'Foto',
      cell: ({ row }) => {
        const student = row.original
        const photoUrl = student.profile?.avatarUrl
        return (
          <div
            className='group relative flex items-center justify-center cursor-pointer w-fit'
            onClick={() => {
              if (photoUrl) {
                setPreviewPhotoModal({
                  isOpen: true,
                  url: photoUrl,
                  title: student.name,
                  subtitle: `${student.profile?.class?.name || 'Tanpa Kelas'} • NIS: ${student.profile?.nomorInduk || '-'}`,
                })
              }
            }}
            title={
              photoUrl
                ? 'Klik untuk melihat foto ukuran penuh'
                : 'Belum ada foto profil'
            }
          >
            <Avatar className='h-9 w-9 border border-border shadow-xs transition-transform duration-200 group-hover:scale-110 group-hover:ring-2 group-hover:ring-primary/40'>
              <AvatarImage
                src={photoUrl || ''}
                alt={student.name}
                className='object-cover'
              />
              <AvatarFallback className='text-xs font-bold bg-muted text-muted-foreground'>
                {student.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {photoUrl && (
              <span className='absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
                <Eye className='h-3.5 w-3.5 text-white' />
              </span>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'profile.nomorInduk',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='NIS' />
      ),
      cell: ({ row }) => row.original.profile?.nomorInduk || '-',
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Nama Siswa' />
      ),
    },
    {
      accessorKey: 'profile.gender',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='L/P' />
      ),
      cell: ({ row }) =>
        row.original.profile?.gender === 'LAKI_LAKI'
          ? 'L'
          : row.original.profile?.gender === 'PEREMPUAN'
            ? 'P'
            : '-',
    },
    {
      accessorKey: 'profile.class.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Kelas' />
      ),
      cell: ({ row }) => row.original.profile?.class?.name || '-',
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Email' />
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleEditClick(student)}
            >
              <Edit className='h-4 w-4' />
            </Button>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => {
                setStudentToDelete(student.id)
                setIsDeleteDialogOpen(true)
              }}
            >
              <Trash className='h-4 w-4' />
            </Button>
          </div>
        )
      },
    },
  ]

  const handleEditClick = (student: StudentData) => {
    // Split name to first and last name if not provided
    const nameParts = student.name.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    setFormData({
      id: student.id,
      avatarUrl: student.profile?.avatarUrl || '',
      firstName,
      lastName,
      email: student.email,
      password: '', // blank for edit
      nomorInduk: student.profile?.nomorInduk || '',
      gender: student.profile?.gender || '',
      classId: student.profile?.classId ? String(student.profile.classId) : '',
      guardianName: student.profile?.guardianName || '',
      phone: student.profile?.phone || '',
      guardianPhone: student.profile?.guardianPhone || '',
      address: student.profile?.address || '',
      rfidCardId: student.profile?.rfidCardId || '',
    })
    setLocalPreviewUrl(null)
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleAddClick = () => {
    setFormData(defaultFormData)
    setLocalPreviewUrl(null)
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roles: ['MURID'],
        profile: {
          avatarUrl: formData.avatarUrl || null,
          nomorInduk: formData.nomorInduk || undefined,
          gender: formData.gender || undefined,
          classId: formData.classId ? parseInt(formData.classId) : undefined,
          guardianName: formData.guardianName || undefined,
          phone: formData.phone || undefined,
          guardianPhone: formData.guardianPhone || undefined,
          address: formData.address || undefined,
          rfidCardId: formData.rfidCardId || undefined,
        },
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (isEditing && formData.id) {
        await api.put(`/users/${formData.id}`, payload)
        toast.success('Data siswa berhasil diperbarui!')
      } else {
        await api.post('/users', payload)
        toast.success('Siswa berhasil ditambahkan!')
      }

      setIsDialogOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Terjadi kesalahan'
      )
    }
  }

  const handleDelete = async () => {
    if (!studentToDelete) return
    try {
      await api.delete(`/users/${studentToDelete}`)
      toast.success('Siswa berhasil dihapus')
      setIsDeleteDialogOpen(false)
      fetchData()
    } catch (_err: unknown) {
      toast.error('Gagal menghapus siswa')
    }
  }

  const handleBulkDelete = async () => {
    try {
      setLoading(true)
      await Promise.all(
        selectedStudents.map((s) => api.delete(`/users/${s.id}`))
      )
      toast.success('Berhasil menghapus data siswa yang dipilih')
      setIsBulkDeleteDialogOpen(false)
      fetchData()
    } catch (_error) {
      toast.error('Gagal menghapus sebagian atau seluruh data')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkClassId) return
    try {
      setLoading(true)
      await Promise.all(
        selectedStudents.map((s) =>
          api.put(`/users/${s.id}`, {
            email: s.email,
            roles: ['MURID'],
            profile: {
              classId: parseInt(bulkClassId),
            },
          })
        )
      )
      toast.success('Berhasil memperbarui kelas siswa yang dipilih')
      setIsBulkEditDialogOpen(false)
      fetchData()
    } catch (_error) {
      toast.error('Gagal memperbarui kelas')
    } finally {
      setLoading(false)
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
            <h2 className='text-2xl font-bold tracking-tight'>Data Siswa</h2>
            <p className='text-muted-foreground'>Kelola data siswa di sini.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Select
              value={selectedClassFilter}
              onValueChange={setSelectedClassFilter}
            >
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='Semua Kelas' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Kelas</SelectItem>
                <SelectItem value='none'>Tidak ada kelas (-)</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddClick}>
              <Plus size={18} className='mr-2' /> Tambah Siswa
            </Button>
          </div>
        </div>

        <div className='w-full'>
          {loading ? (
            <div className='py-4 text-center'>Memuat data...</div>
          ) : (
            <GenericDataTable
              columns={columns}
              data={
                selectedClassFilter === 'all'
                  ? students
                  : selectedClassFilter === 'none'
                    ? students.filter((s) => !s.profile?.classId)
                    : students.filter(
                        (s) => String(s.profile?.classId) === selectedClassFilter
                      )
              }
              renderToolbarActions={renderToolbarActions}
            />
          )}
        </div>
      </Main>

      <CustomDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={isEditing ? 'Edit Siswa' : 'Tambah Siswa'}
        description={
          isEditing ? 'Perbarui data siswa.' : 'Masukkan detail siswa baru.'
        }
      >
        <form
          onSubmit={handleSubmit}
          className='max-h-[70vh] space-y-4 overflow-y-auto px-1'
        >
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {/* Foto Profil Preview & Upload */}
            <div className='col-span-1 sm:col-span-2 p-4 border rounded-xl bg-card/60 shadow-xs space-y-3'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='studentPhoto' className='font-semibold text-sm flex items-center gap-2'>
                  <ImageIcon className='h-4 w-4 text-primary' />
                  Foto Profil Siswa
                </Label>
                {(localPreviewUrl || formData.avatarUrl) && (
                  <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'>
                    Foto Terpasang
                  </span>
                )}
              </div>

              <div className='flex flex-col sm:flex-row items-center gap-5'>
                {/* Frame Preview Foto (Rasio Pas Foto) */}
                <div className='relative group shrink-0'>
                  <div className='w-28 h-36 rounded-xl border-2 border-dashed border-primary/30 overflow-hidden bg-muted/40 flex items-center justify-center shadow-xs transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-md'>
                    {localPreviewUrl || formData.avatarUrl ? (
                      <img
                        src={localPreviewUrl || formData.avatarUrl}
                        alt='Pratinjau Foto Siswa'
                        className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
                      />
                    ) : (
                      <div className='flex flex-col items-center justify-center p-2 text-center text-muted-foreground'>
                        <ImageIcon className='h-8 w-8 mb-1.5 opacity-40' />
                        <span className='text-[10px] font-medium leading-tight'>
                          Belum ada foto
                        </span>
                        <span className='text-[9px] text-muted-foreground/70'>
                          (Pas Foto 3x4)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tombol Zoom Foto Penuh di atas Preview */}
                  {(localPreviewUrl || formData.avatarUrl) && (
                    <button
                      type='button'
                      onClick={() =>
                        setPreviewPhotoModal({
                          isOpen: true,
                          url: localPreviewUrl || formData.avatarUrl,
                          title: formData.firstName
                            ? `${formData.firstName} ${formData.lastName}`.trim()
                            : 'Pratinjau Foto Siswa',
                          subtitle: formData.nomorInduk
                            ? `NIS: ${formData.nomorInduk}`
                            : 'Foto Profil Siswa',
                        })
                      }
                      className='absolute inset-0 bg-black/40 text-white rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer'
                      title='Klik untuk melihat foto ukuran penuh'
                    >
                      <ZoomIn className='h-6 w-6 mb-1' />
                      <span className='text-[10px] font-semibold tracking-wide'>
                        Lihat Penuh
                      </span>
                    </button>
                  )}
                </div>

                {/* Deskripsi & Tombol Aksi Upload */}
                <div className='flex-1 space-y-2 text-center sm:text-left'>
                  <p className='text-xs text-muted-foreground leading-relaxed'>
                    Disarankan pas foto resmi siswa (latar polos). Format yang didukung: <span className='font-semibold text-foreground'>JPG, PNG, atau WEBP</span> (Maksimal 5MB). Foto ini akan digunakan saat absensi gerbang RFID dan rekap kehadiran.
                  </p>

                  <div className='flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start'>
                    <label
                      htmlFor='studentPhoto'
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-xs hover:bg-primary hover:text-primary-foreground cursor-pointer transition-all active:scale-95 ${
                        isUploading ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className='h-3.5 w-3.5 animate-spin' />
                          Mengunggah Foto...
                        </>
                      ) : (
                        <>
                          <Upload className='h-3.5 w-3.5' />
                          {formData.avatarUrl || localPreviewUrl ? 'Ganti Foto' : 'Unggah Foto'}
                        </>
                      )}
                    </label>

                    <input
                      id='studentPhoto'
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      className='hidden'
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />

                    {(formData.avatarUrl || localPreviewUrl) && (
                      <>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 text-xs'
                          onClick={() =>
                            setPreviewPhotoModal({
                              isOpen: true,
                              url: localPreviewUrl || formData.avatarUrl,
                              title: formData.firstName
                                ? `${formData.firstName} ${formData.lastName}`.trim()
                                : 'Pratinjau Foto Siswa',
                              subtitle: formData.nomorInduk
                                ? `NIS: ${formData.nomorInduk}`
                                : 'Foto Profil Siswa',
                            })
                          }
                        >
                          <Eye className='mr-1 h-3.5 w-3.5' />
                          Lihat Penuh
                        </Button>

                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10'
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, avatarUrl: '' }))
                            setLocalPreviewUrl(null)
                          }}
                        >
                          <Trash className='mr-1 h-3.5 w-3.5' />
                          Hapus Foto
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='nomorInduk'>NIS</Label>
              <Input
                id='nomorInduk'
                value={formData.nomorInduk}
                onChange={(e) =>
                  setFormData({ ...formData, nomorInduk: e.target.value })
                }
                placeholder='Nomor Induk Siswa'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='rfidCardId'>RFID Card ID (Opsional)</Label>
              <Input
                id='rfidCardId'
                value={formData.rfidCardId}
                onChange={(e) =>
                  setFormData({ ...formData, rfidCardId: e.target.value })
                }
                placeholder='Tap kartu atau ketik ID'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='firstName'>Nama Depan</Label>
              <Input
                id='firstName'
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='lastName'>Nama Belakang (Opsional)</Label>
              <Input
                id='lastName'
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='gender'>Jenis Kelamin (Opsional)</Label>
              <Select
                value={formData.gender}
                onValueChange={(val) =>
                  setFormData({ ...formData, gender: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Pilih Jenis Kelamin' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='LAKI_LAKI'>Laki-Laki (L)</SelectItem>
                  <SelectItem value='PEREMPUAN'>Perempuan (P)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='classId'>Kelas (Opsional)</Label>
              <Select
                value={formData.classId}
                onValueChange={(val) =>
                  setFormData({ ...formData, classId: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Pilih Kelas' />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='phone'>No HP Siswa (Opsional)</Label>
              <Input
                id='phone'
                type='tel'
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='guardianName'>Nama Walimurid (Opsional)</Label>
              <Input
                id='guardianName'
                value={formData.guardianName}
                onChange={(e) =>
                  setFormData({ ...formData, guardianName: e.target.value })
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='guardianPhone'>No HP Walimurid (Opsional)</Label>
              <Input
                id='guardianPhone'
                type='tel'
                value={formData.guardianPhone}
                onChange={(e) =>
                  setFormData({ ...formData, guardianPhone: e.target.value })
                }
              />
            </div>
            <div className='col-span-2 grid gap-2'>
              <Label htmlFor='address'>Alamat (Opsional)</Label>
              <Textarea
                id='address'
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className='col-span-2 grid gap-2'>
              <Label htmlFor='email'>Email Login</Label>
              <Input
                id='email'
                type='email'
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className='col-span-2 grid gap-2'>
              <Label htmlFor='password'>
                Password{' '}
                {isEditing ? '(Kosongkan jika tidak ingin diubah)' : ''}
              </Label>
              <Input
                id='password'
                type='password'
                required={!isEditing}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>

      <CustomDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title='Konfirmasi Hapus'
        description='Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan.'
      >
        <div className='flex justify-end gap-2 pt-4'>
          <Button
            variant='outline'
            onClick={() => setIsDeleteDialogOpen(false)}
          >
            Batal
          </Button>
          <Button variant='destructive' onClick={handleDelete}>
            Hapus
          </Button>
        </div>
      </CustomDialog>

      <CustomDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title='Konfirmasi Hapus Massal'
        description={`Apakah Anda yakin ingin menghapus ${selectedStudents.length} data siswa terpilih? Tindakan ini tidak dapat dibatalkan.`}
      >
        <div className='flex justify-end gap-2 pt-4'>
          <Button
            variant='outline'
            onClick={() => setIsBulkDeleteDialogOpen(false)}
          >
            Batal
          </Button>
          <Button variant='destructive' onClick={handleBulkDelete}>
            Hapus Semua
          </Button>
        </div>
      </CustomDialog>

      <CustomDialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        title='Edit Kelas Massal'
        description={`Pilih kelas baru untuk ${selectedStudents.length} siswa terpilih.`}
      >
        <form onSubmit={handleBulkEditClass} className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='bulkClassId'>Kelas Baru</Label>
            <Select value={bulkClassId} onValueChange={setBulkClassId} required>
              <SelectTrigger>
                <SelectValue placeholder='Pilih Kelas' />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsBulkEditDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type='submit'>Simpan</Button>
          </div>
        </form>
      </CustomDialog>

      {/* Modal Pratinjau Foto Siswa Ukuran Penuh */}
      <Dialog
        open={previewPhotoModal.isOpen}
        onOpenChange={(open) =>
          setPreviewPhotoModal((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className='max-w-md p-6 text-center'>
          <DialogHeader className='text-center pb-2'>
            <DialogTitle className='text-lg font-bold'>
              {previewPhotoModal.title}
            </DialogTitle>
            {previewPhotoModal.subtitle && (
              <DialogDescription className='text-xs text-muted-foreground'>
                {previewPhotoModal.subtitle}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className='my-3 flex items-center justify-center'>
            <div className='relative max-h-[60vh] max-w-full overflow-hidden rounded-2xl border-2 border-border shadow-2xl bg-black/5 dark:bg-white/5'>
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className='max-h-[55vh] w-auto object-contain mx-auto'
              />
            </div>
          </div>

          <div className='flex justify-center pt-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                setPreviewPhotoModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Tutup Pratinjau
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
