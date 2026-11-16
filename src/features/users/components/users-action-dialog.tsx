'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import Select from 'react-select'
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { type User } from '../data/schema'

const formSchema = z
  .object({
    firstName: z.string().min(1, 'Nama Depan wajib diisi.'),
    lastName: z.string().min(1, 'Nama Belakang wajib diisi.'),
    username: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.email({
      message: 'Email wajib diisi.',
    }),
    password: z.string().optional(),
    role: z.array(z.string()).min(1, 'Role wajib diisi.'),
    confirmPassword: z.string().optional(),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit && !data.password) return true
      return !!data.password && data.password.length > 0
    },
    {
      message: 'Password wajib diisi.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return !!password && password.length >= 8
    },
    {
      message: 'Password minimal 8 karakter.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /[a-z]/.test(password || '')
    },
    {
      message: 'Password harus mengandung huruf kecil.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /\d/.test(password || '')
    },
    {
      message: 'Password harus mengandung angka.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password, confirmPassword }) => {
      if (isEdit && !password) return true
      return password === confirmPassword
    },
    {
      message: "Password tidak cocok.",
      path: ['confirmPassword'],
    }
  )
type UserForm = z.infer<typeof formSchema>

interface Props {
  currentRow?: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
  onRefresh,
}: Props) {
  const isEdit = !!currentRow
  const [dynamicRoles, setDynamicRoles] = useState<{label: string, value: string}[]>([])

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await api.get('/roles')
        setDynamicRoles(res.data.data.map((r: { name: string }) => ({ label: r.name, value: r.name })))
      } catch (_err) {
        // console.error('Failed to fetch roles')
      }
    }
    fetchRoles()
  }, [])

  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit && currentRow
      ? {
          firstName: currentRow.firstName,
          lastName: currentRow.lastName,
          username: currentRow.username,
          phoneNumber: currentRow.phoneNumber,
          email: currentRow.email,
          role: currentRow.role ? currentRow.role.split(', ') : [],
          password: '',
          confirmPassword: '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          role: [],
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          isEdit,
        },
  })

  const onSubmit = async (values: UserForm) => {
    try {
      const payload: Record<string, unknown> = {
        name: `${values.firstName} ${values.lastName}`.trim(),
        username: values.username ? values.username.trim().toLowerCase() : values.email.split('@')[0].toLowerCase(),
        email: values.email,
        roles: values.role, // values.role is now an array of strings
      }
      if (values.phoneNumber) {
        payload.profile = { phone: values.phoneNumber.trim() }
      }
      if (values.password) {
        payload.password = values.password
      }
      if (isEdit && currentRow) {
        await api.put(`/users/${currentRow.id}`, payload)
      } else {
        await api.post('/users', payload)
        toast.success('Pengguna berhasil dibuat.')
      }
      if (onRefresh) onRefresh()
      form.reset()
      onOpenChange(false)
      // Ideally, trigger a refresh of the users list here
    } catch (_err) {
      // console.error(err)
      toast.error('Gagal menyimpan pengguna')
    }
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Ubah data pengguna di sini. ' : 'Buat pengguna baru di sini. '}
            Klik simpan jika sudah selesai.
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Nama Depan
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Budi'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Nama Belakang
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Santoso'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john_doe'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='john.doe@gmail.com'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Nomor Telepon
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='+123456789'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>Role</FormLabel>
                    <Select
                      isMulti
                      options={dynamicRoles}
                      value={dynamicRoles.filter(r => field.value?.includes(r.value))}
                      onChange={(selectedOptions) => {
                        field.onChange(selectedOptions.map((opt: { value: string }) => opt.value))
                      }}
                      className='col-span-4'
                      styles={{ menu: (provided) => ({ ...provided, zIndex: 9999 }) }}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      Konfirmasi Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        disabled={!isPasswordTouched}
                        placeholder='e.g., S3cur3P@ssw0rd'
                        className='col-span-4'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form'>
            Simpan perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
