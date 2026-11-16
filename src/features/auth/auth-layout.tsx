import { GraduationCap } from 'lucide-react'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative container grid min-h-svh max-w-none items-center justify-center overflow-hidden bg-gradient-to-br from-background via-muted/40 to-background px-4 py-8 sm:px-8'>
      {/* Subtle Background Glow Elements */}
      <div className='pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl' />

      <div className='relative z-10 mx-auto flex w-full flex-col justify-center space-y-4 py-4 sm:p-4'>
        <div className='mb-2 flex flex-col items-center justify-center text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 mb-3'>
            <GraduationCap className='h-6 w-6' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            SI-PRESENSI
          </h1>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5'>
            SMK Islam Sultan Agung Kalinyamatan
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
