'use client'

import { AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
  onRefresh?: () => void
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onRefresh,
}: UserDeleteDialogProps) {

  const handleDelete = async () => {

    try {
      await api.delete(`/users/${currentRow.id}`)
      if (onRefresh) onRefresh()
      onOpenChange(false)
    } catch (_err) {
      // console.error(err)
      toast.error('Gagal menghapus pengguna')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='users-delete-form'
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Hapus Pengguna
        </span>
      }
      desc={
        <form
          id='users-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Apakah Anda yakin ingin menghapus{' '}
            <span className='font-bold'>{currentRow.username}</span>?
            <br />
            Tindakan ini akan menghapus pengguna dengan role{' '}
            <span className='font-bold'>
              {currentRow.role.toUpperCase()}
            </span>{' '}
            secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
          </p>



          <Alert variant='destructive'>
            <AlertTitle>Peringatan!</AlertTitle>
            <AlertDescription>
              Harap berhati-hati, tindakan ini tidak dapat dibatalkan.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText='Hapus'
      destructive
    />
  )
}
