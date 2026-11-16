import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GenericDataTable } from '@/components/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Plus } from 'lucide-react'
import { CustomDialog } from '@/components/custom-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import api from '@/lib/api';

type RoleData = {
  id: number
  name: string
}

const getColumns = (
  handleEdit: (role: RoleData) => void,
  handleDelete: (id: number) => void
): ColumnDef<RoleData>[] => [
  {
    id: 'index',
    header: ({ column }) => <DataTableColumnHeader column={column} title='No.' />,
    cell: ({ row }) => <div className='ps-2'>{row.index + 1}</div>,
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title='Nama Role' />,
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

export default function RoleManagement() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data);
    } catch (_error) {
      toast.error('Gagal memuat roles');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama role wajib diisi')
      return;
    }
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, { name });
        toast.success('Role berhasil diperbarui!')
      } else {
        await api.post('/roles', { name });
        toast.success('Role berhasil ditambahkan!')
      }
      setName('');
      setEditId(null);
      setIsAddDialogOpen(false);
      fetchRoles();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan role');
    }
  };

  const handleEdit = (role: RoleData) => {
    setEditId(role.id);
    setName(role.name);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setRoleToDelete(id);
    setIsDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/roles/${roleToDelete}`);
      toast.success('Role berhasil dihapus!');
      fetchRoles();
    } catch (_error: unknown) {
      toast.error('Gagal menghapus role');
    } finally {
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manajemen Role Dinamis</CardTitle>
          <Button onClick={() => { setEditId(null); setName(''); setIsAddDialogOpen(true); }}>
            <Plus size={18} className='mr-2' /> Tambah Role
          </Button>
        </CardHeader>
        <CardContent>
          <div className='w-full'>
            <GenericDataTable columns={getColumns(handleEdit, handleDeleteClick)} data={roles} />
          </div>
        </CardContent>
      </Card>

      <CustomDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title={editId ? 'Edit Role' : 'Tambah Role'}
        description='Masukkan nama role yang diinginkan.'
      >
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid gap-2'>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nama Role" 
              required
            />
          </div>
          <div className='flex justify-end gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => { setIsAddDialogOpen(false); setEditId(null); setName(''); }}>Batal</Button>
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
    </div>
  );
}
