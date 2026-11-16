import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

const formSchema = z.object({
  username: z.string().min(1, 'Harap masukkan username Anda.'),
  password: z
    .string()
    .min(1, 'Harap masukkan password Anda.')
    .min(6, 'Password harus memiliki minimal 6 karakter.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // Import the api instance
      const api = (await import('@/lib/api')).default

      const response = await api.post('/auth/login', {
        username: data.username,
        password: data.password,
      })

      const result = response.data
      if (result.success) {
        // Set user and access token
        auth.setUser(result.data.user)
        auth.setAccessToken(result.data.token)

        toast.success(`Selamat datang kembali, ${result.data.user.name}!`)

        // Redirect to the stored location or default to dashboard
        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
      } else {
        toast.error(result.message || 'Gagal masuk')
      }
    } catch (error) {
      const err = error as Error & {
        response?: { data?: { message?: string } }
      }
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Terjadi kesalahan saat masuk'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem className='space-y-1.5'>
              <FormLabel className='text-xs font-semibold text-foreground/80'>Username</FormLabel>
              <FormControl>
                <Input placeholder='Masukkan username Anda' className='h-10 text-sm bg-background/50 focus-visible:ring-1' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative space-y-1.5'>
              <div className='flex items-center justify-between'>
                <FormLabel className='text-xs font-semibold text-foreground/80'>Password</FormLabel>
                <Link
                  to='/forgot-password'
                  className='text-xs font-medium text-primary hover:underline underline-offset-4'
                >
                  Lupa password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput placeholder='••••••••' className='h-10 text-sm bg-background/50 focus-visible:ring-1' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-3 h-10 w-full font-semibold text-sm shadow-md transition-all duration-200 active:scale-[0.99]' disabled={isLoading}>
          {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <LogIn className='mr-2 h-4 w-4' />}
          {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
        </Button>

        {/* <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background px-2 text-muted-foreground'>
              Atau lanjutkan dengan
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div> */}
      </form>
    </Form>
  )
}
