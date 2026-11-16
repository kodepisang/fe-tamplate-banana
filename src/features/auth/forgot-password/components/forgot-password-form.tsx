import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
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

const formSchema = z.object({
  phone: z
    .string()
    .min(1, 'Masukkan nomor WhatsApp terdaftar.')
    .min(8, 'Nomor WhatsApp minimal 8 digit.'),
})

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const api = (await import('@/lib/api')).default
      const response = await api.post('/auth/forgot-password', {
        phone: data.phone,
      })

      if (response.data.success) {
        toast.success(
          response.data.message ||
            'Password baru telah berhasil dikirim ke WhatsApp Anda!'
        )
        form.reset()
        navigate({ to: '/sign-in' })
      } else {
        toast.error(response.data.message || 'Gagal mereset password.')
      }
    } catch (error) {
      const err = error as Error & {
        response?: { data?: { message?: string } }
      }
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Terjadi kesalahan saat memproses reset password.'
      
      if (msg.includes('gangguan')) {
        toast.error('WhatsApp sedang gangguan', {
          description: 'Sistem pengiriman WhatsApp tidak dapat dijangkau. Silakan hubungi pihak sekolah/Admin.',
        })
      } else {
        toast.error(msg)
      }
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
          name='phone'
          render={({ field }) => (
            <FormItem className='space-y-1.5'>
              <FormLabel className='text-xs font-semibold text-foreground/80'>
                Nomor WhatsApp Terdaftar
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='Contoh: 081234567890 atau 628123456789'
                  className='h-10 text-sm bg-background/50 focus-visible:ring-1'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2 h-10 font-semibold text-sm shadow-md' disabled={isLoading}>
          {isLoading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <MessageSquare className='mr-2 h-4 w-4' />
          )}
          {isLoading ? 'Mengirim Password...' : 'Kirim Password via WhatsApp'}
        </Button>
      </form>
    </Form>
  )
}
