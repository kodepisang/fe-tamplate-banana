import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='w-full max-w-md shadow-xl border-border/80 bg-card/95 backdrop-blur-md rounded-2xl transition-all duration-300 hover:shadow-2xl'>
        <CardHeader className='space-y-1.5 text-center pb-4'>
          <CardTitle className='text-xl font-bold tracking-tight text-foreground'>
            Masuk Akun
          </CardTitle>
          <CardDescription className='text-xs text-muted-foreground'>
            Silakan masukkan username atau email dan password Anda untuk mengakses sistem presensi sekolah.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-2'>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='pt-4 pb-6 flex justify-center border-t border-border/40 mt-2'>
          <p className='text-center text-xs font-medium text-muted-foreground/80 tracking-wide'>
            © {new Date().getFullYear()} SMK Islam Sultan Agung Kalinyamatan Jepara
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
