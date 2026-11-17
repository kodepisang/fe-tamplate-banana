import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { CheckCircle2, XCircle, AlertTriangle, Maximize, Minimize } from 'lucide-react'
import api from '@/lib/api'
import { useServerTime } from '@/lib/server-time'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import schoolLogo from '@/assets/logo.png'

interface StudentData {
  studentName: string
  nomorInduk?: string
  className?: string
  status: string
  checkInTime?: string
  checkOutTime?: string
  avatarUrl?: string
}

export function RfidGate() {
  // Synchronized real-time clock strictly following server time (Asia/Jakarta)
  const time = useServerTime(1000)
  const [inputValue, setInputValue] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<
    'idle' | 'success' | 'warning' | 'error' | 'info'
  >('idle')
  const [message, setMessage] = useState('Silakan Tap Kartu Pelajar Anda')
  const [studentData, setStudentData] = useState<StudentData | null>(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  useEffect(() => {
    // Keep focus on input
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
    focusInput()
    document.addEventListener('click', focusInput)
    return () => document.removeEventListener('click', focusInput)
  }, [])

  const playAudio = (type: 'success' | 'error') => {
    const audio = new Audio(
      type === 'success' ? '/mp3/success-well-done.mp3' : '/mp3/failed.mp3'
    )
    audio.play().catch(() => {})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const rfid = inputValue.trim()
    setInputValue('')
    setStatus('idle')
    setMessage('Memproses...')
    setStudentData(null)

    try {
      const res = await api.post('/attendance/rfid/tap', { rfidCardId: rfid })
      if (res.data?.success) {
        const data = res.data.data
        setStudentData(data)
        setMessage(res.data.message || 'Berhasil')
        playAudio('success')

        if (data.status === 'HADIR') {
          setStatus('success')
        } else if (data.status === 'TERLAMBAT') {
          setStatus('warning')
        } else if (data.status === 'PULANG') {
          setStatus('info')
        } else {
          setStatus('success')
        }
      }
    } catch (error: unknown) {
      setStatus('error')
      playAudio('error')
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setMessage(
        err.response?.data?.message || err.message || 'Terjadi kesalahan sistem'
      )
    }

    // Auto reset after 5 seconds
    setTimeout(() => {
      setStatus('idle')
      setMessage('Silakan Tap Kartu Pelajar Anda')
      setStudentData(null)
    }, 5000)
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: (
            <CheckCircle2 className='h-24 w-24 animate-in text-emerald-500 zoom-in' />
          ),
          ring: 'ring-emerald-500/50 shadow-emerald-500/20',
        }
      case 'warning':
        return {
          icon: (
            <AlertTriangle className='h-24 w-24 animate-in text-amber-500 zoom-in' />
          ),
          ring: 'ring-amber-500/50 shadow-amber-500/20',
        }
      case 'info':
        return {
          icon: (
            <CheckCircle2 className='h-24 w-24 animate-in text-blue-500 zoom-in' />
          ),
          ring: 'ring-blue-500/50 shadow-blue-500/20',
        }
      case 'error':
        return {
          icon: (
            <XCircle className='h-24 w-24 animate-in text-rose-500 zoom-in' />
          ),
          ring: 'ring-rose-500/50 shadow-rose-500/20',
        }
      default:
        return {
          icon: (
            <img
              src={schoolLogo}
              alt='Logo Sekolah'
              className='h-24 w-24 object-contain rounded-full drop-shadow-sm'
            />
          ),
          ring: 'ring-slate-200 dark:ring-slate-800',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className='relative flex min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100'>
      {/* Fullscreen Toggle Button */}
      <button
        type='button'
        onClick={toggleFullscreen}
        className='absolute top-4 right-4 z-50 p-3 rounded-full bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-800 transition-all hover:scale-105 active:scale-95'
        title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
      >
        {isFullscreen ? <Minimize className='h-5 w-5' /> : <Maximize className='h-5 w-5' />}
      </button>

      {/* Background Decorative Blobs */}
      <div className='pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden opacity-40 dark:opacity-20'>
        <div className='absolute top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-blue-400 blur-[120px]' />
        <div className='absolute top-[60%] right-[-10%] h-[50%] w-[40%] rounded-full bg-indigo-500 blur-[120px]' />
      </div>

      {/* Hidden Form for RFID Scanner */}
      <form onSubmit={handleSubmit} className='absolute -z-10 opacity-0'>
        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => e.target.focus()}
          autoFocus
        />
        <button type='submit'>Submit</button>
      </form>

      <div className='z-10 flex h-screen w-full flex-col md:flex-row'>
        {/* Left Side: Time & Info */}
        <div className='flex flex-1 flex-col items-center justify-center border-b border-slate-200 bg-white/30 p-8 backdrop-blur-xl md:items-start md:border-r md:border-b-0 md:p-24 dark:border-slate-800 dark:bg-slate-900/30'>
          <div className='space-y-4 text-center md:text-left'>
            <h1 className='mb-2 bg-linear-to-br from-yellow-500 to-amber-500 bg-clip-text text-xl font-bold tracking-widest text-transparent uppercase md:text-2xl dark:from-yellow-400 dark:to-amber-400'>
              Sistem Kehadiran Pintar
            </h1>
            <h1 className='mb-6 bg-linear-to-br from-cyan-500 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-tighter text-transparent md:text-5xl dark:from-cyan-400 dark:to-blue-400'>
              SMK ISLAM SULTAN AGUNG KALINYAMATAN
            </h1>
            <h1 className='bg-linear-to-br from-cyan-500 to-blue-500 bg-clip-text text-7xl font-extrabold tracking-tighter text-transparent tabular-nums md:text-9xl dark:from-cyan-400 dark:to-blue-400'>
              {format(time, 'HH:mm')}
              <span className='ml-2 text-4xl font-normal text-slate-400 md:text-6xl dark:text-slate-600'>
                {format(time, 'ss')}
              </span>
            </h1>
            <p className='text-2xl font-semibold text-slate-700 capitalize md:text-4xl dark:text-slate-300'>
              {format(time, 'EEEE, d MMMM yyyy', { locale: id })}
            </p>
          </div>
        </div>

        {/* Right Side: Scan Status */}
        <div className='flex flex-1 items-center justify-center bg-transparent p-8'>
          <Card
            className={`flex w-full max-w-lg flex-col items-center rounded-3xl border-0 bg-white/80 p-10 text-center shadow-2xl ring-1 backdrop-blur-2xl transition-all duration-500 md:p-14 dark:bg-slate-900/80 ${config.ring}`}
          >
            {studentData ? (
              <div className='relative mb-6 flex items-center justify-center animate-in zoom-in-75 duration-300'>
                <Avatar
                  className={`h-32 w-32 md:h-36 md:w-36 border-4 shadow-xl ring-4 ${
                    status === 'warning'
                      ? 'border-amber-500 ring-amber-500/20'
                      : status === 'info'
                        ? 'border-blue-500 ring-blue-500/20'
                        : 'border-emerald-500 ring-emerald-500/20'
                  }`}
                >
                  <AvatarImage
                    src={studentData.avatarUrl || ''}
                    alt={studentData.studentName}
                    className='object-cover'
                  />
                  <AvatarFallback className='text-3xl font-black bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100'>
                    {studentData.studentName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='absolute -bottom-2 right-2 rounded-full bg-white p-1 shadow-md dark:bg-slate-900'>
                  {status === 'warning' ? (
                    <AlertTriangle className='h-7 w-7 text-amber-500' />
                  ) : status === 'info' ? (
                    <CheckCircle2 className='h-7 w-7 text-blue-500' />
                  ) : (
                    <CheckCircle2 className='h-7 w-7 text-emerald-500' />
                  )}
                </div>
              </div>
            ) : (
              <div className='mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 shadow-inner dark:bg-slate-800 overflow-hidden'>
                {config.icon}
              </div>
            )}

            <h2
              className={`mb-8 text-2xl font-bold transition-colors md:text-3xl ${
                status === 'error'
                  ? 'text-rose-600 dark:text-rose-400'
                  : status === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : status === 'info'
                      ? 'text-blue-600 dark:text-blue-400'
                      : status === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {message}
            </h2>

            {studentData ? (
              <div className='w-full animate-in space-y-6 duration-700 fade-in slide-in-from-bottom-8'>
                <div className='space-y-1 rounded-2xl bg-slate-100/50 p-6 ring-1 ring-slate-200/50 dark:bg-slate-950/50 dark:ring-slate-800/50'>
                  <p className='mb-1 text-xs font-semibold tracking-widest text-slate-500 uppercase'>
                    Nama Siswa
                  </p>
                  <p className='text-2xl font-extrabold text-slate-800 md:text-3xl dark:text-slate-100'>
                    {studentData.studentName}
                  </p>
                  <p className='text-md font-medium text-slate-500'>
                    {studentData.className || 'Tidak Ada Kelas'} •{' '}
                    {studentData.nomorInduk || 'Tidak Ada NIS'}
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  {studentData.checkInTime && (
                    <div className='rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50'>
                      <p className='mb-1 text-xs font-semibold text-slate-500 uppercase'>
                        Masuk
                      </p>
                      <p className='text-xl font-bold'>
                        {format(new Date(studentData.checkInTime), 'HH:mm')}
                      </p>
                    </div>
                  )}
                  {studentData.checkOutTime && (
                    <div className='rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50'>
                      <p className='mb-1 text-xs font-semibold text-slate-500 uppercase'>
                        Pulang
                      </p>
                      <p className='text-xl font-bold'>
                        {format(new Date(studentData.checkOutTime), 'HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='mt-4 animate-pulse text-slate-400 dark:text-slate-500'>
                <p>Tempelkan kartu pada scanner RFID</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
