'use client'

import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import api from '@/lib/api'
import { type Task } from '../data/schema'

type TaskMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
  onRefresh?: () => void
}

export function TasksMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
  onRefresh,
}: TaskMultiDeleteDialogProps<TData>) {

  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleDelete = async () => {
    try {
      await Promise.all(
        selectedRows.map((row) => api.delete(`/tasks/${(row.original as Task).dbId}`))
      )
      toast.success(`Berhasil menghapus ${selectedRows.length} task.`)
      table.resetRowSelection()
      if (onRefresh) onRefresh()
      onOpenChange(false)
    } catch (_err) {
      toast.error('Gagal menghapus beberapa task.')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='tasks-multi-delete-form'
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete {selectedRows.length}{' '}
          {selectedRows.length > 1 ? 'tasks' : 'task'}
        </span>
      }
      desc={
        <form
          id='tasks-multi-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Are you sure you want to delete the selected tasks? <br />
            This action cannot be undone.
          </p>



          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText='Delete'
      destructive
    />
  )
}
