import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { CheckCircle2, ScanLine, AlertCircle, Sparkles, RefreshCw, Maximize, Minimize, Calendar, Clock } from 'lucide-react'
import api from '@/lib/api'
import { useServerTime } from '@/lib/server-time'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from '@tanstack/react-router'

interface EventOption {
  id: number
  name: string
  description?: string
  startTime?: string
  endTime?: string
}

interface TapResultData {
  studentName: string
  nomorInduk?: string
  className?: string
  avatarUrl?: string
  eventName: string
  tapTime: string
}

// Helper to convert "HH:mm" to total minutes from start of day
const parseTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

// Check if current date/time is within event's scheduled window
const isEventActiveNow = (evt: EventOption, date: Date): boolean => {
  const start = parseTimeToMinutes(evt.startTime)
  const end = parseTimeToMinutes(evt.endTime)
  if (start === null || end === null) return false

  const current = date.getHours() * 60 + date.getMinutes()
  if (start <= end) {
    return current >= start && current <= end
  }
  // Overnight event support (e.g. 23:00 to 01:00)
  return current >= start || current <= end
}

// Format status label & badge
const getEventScheduleStatus = (evt: EventOption, date: Date) => {
  const start = parseTimeToMinutes(evt.startTime)
  const end = parseTimeToMinutes(evt.endTime)
  if (start === null || end === null) {
    return {
      isActiveNow: false,
      status: 'none' as const,
      label: 'Waktu Bebas',
    }
  }

  const current = date.getHours() * 60 + date.getMinutes()
  const isNow = start <= end ? current >= start && current <= end : current >= start || current <= end

  if (isNow) {
    return {
      isActiveNow: true,
      status: 'active' as const,
      label: 'Sedang Berlangsung',
    }
  }

  if (start <= end) {
    if (current < start) {
      return {
        isActiveNow: false,
        status: 'upcoming' as const,
        label: `Mulai ${evt.startTime}`,
      }
    }
    return {
      isActiveNow: false,
      status: 'ended' as const,
      label: `Selesai (${evt.endTime})`,
    }
  }

  return {
    isActiveNow: false,
    status: 'upcoming' as const,
    label: `Mulai ${evt.startTime}`,
  }
}

export function EventKiosk() {
  // Synchronized real-time clock strictly following server time (Asia/Jakarta)
  const time = useServerTime(1000)
  const [events, setEvents] = useState<EventOption[]>([])
  // Manual selection override by user (null = Auto Schedule Mode according to clock)
  const [manualSelectedEventId, setManualSelectedEventId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle')
  const [message, setMessage] = useState('Pilih Kegiatan & Tap Kartu Pelajar Anda')
  const [tapResult, setTapResult] = useState<TapResultData | null>(null)
  const [recentLogs, setRecentLogs] = useState<TapResultData[]>([])

  // Sort events chronologically by start time
  const sortEvents = useCallback((list: EventOption[]) => {
    return [...list].sort((a, b) => {
      const aStart = parseTimeToMinutes(a.startTime) ?? 9999
      const bStart = parseTimeToMinutes(b.startTime) ?? 9999
      return aStart - bStart
    })
  }, [])

  // Current active event automatically evaluated against the real-time clock
  const scheduledActiveEvent = useMemo(() => {
    return events.find((evt) => isEventActiveNow(evt, time))
  }, [events, time])

  // Active selected event: manual override if set, or auto scheduled event
  const selectedEventId = useMemo(() => {
    if (manualSelectedEventId !== null) {
      return manualSelectedEventId
    }
    return scheduledActiveEvent ? scheduledActiveEvent.id.toString() : ''
  }, [manualSelectedEventId, scheduledActiveEvent])

  const isManualOverride = manualSelectedEventId !== null

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

  const fetchActiveEvents = useCallback(async () => {
    try {
      const res = await api.get('/events?active=true')
      if (res.data.success) {
        setEvents(sortEvents(res.data.data))
      }
    } catch (_err) {
      // silent
    }
  }, [sortEvents])

  useEffect(() => {
    let isMounted = true
    const loadEvents = async () => {
      try {
        const res = await api.get('/events?active=true')
        if (res.data.success && isMounted) {
          setEvents(sortEvents(res.data.data))
        }
      } catch (_err) {
        // silent
      }
    }
    loadEvents()
    return () => {
      isMounted = false
    }
  }, [sortEvents])

  // Periodic background refresh every 30 seconds to keep events updated
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchActiveEvents()
    }, 30000)
    return () => clearInterval(pollInterval)
  }, [fetchActiveEvents])

  useEffect(() => {
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
    const audio = new Audio(type === 'success' ? '/mp3/success-well-done.mp3' : '/mp3/failed.mp3')
    audio.play().catch(() => {})
  }

  // Toggle event manual override / click
  const handleToggleEvent = (evtId: number) => {
    const idStr = evtId.toString()
    if (selectedEventId === idStr) {
      // Turn off this event
      setManualSelectedEventId('')
    } else {
      // Turn on this event
      setManualSelectedEventId(idStr)
    }
  }

  // Reset to auto schedule mode based on current time
  const handleResetToAuto = () => {
    setManualSelectedEventId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    if (!selectedEventId) {
      setStatus('warning')
      playAudio('error')
      setMessage('Tidak ada kegiatan aktif saat ini! Harap tunggu jam kegiatan atau aktifkan kegiatan secara manual.')
      setInputValue('')
      return
    }

    const rfid = inputValue.trim()
    setInputValue('')
    setStatus('idle')
    setMessage('Memproses Tap Kegiatan...')
    setTapResult(null)

    try {
      const res = await api.post('/events/tap', {
        eventId: parseInt(selectedEventId),
        rfidCardId: rfid,
      })

      if (res.data?.success) {
        const data: TapResultData = res.data.data
        setTapResult(data)
        setMessage(res.data.message || 'Presensi Kegiatan Berhasil!')
        setStatus('success')
        playAudio('success')

        setRecentLogs((prev) => [data, ...prev.slice(0, 4)])
      }
    } catch (error: unknown) {
      setStatus('error')
      playAudio('error')
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setMessage(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem')
    }

    // Auto reset state after 5s
    setTimeout(() => {
      setStatus('idle')
      setMessage('Silakan Tap Kartu Pelajar Anda')
      setTapResult(null)
    }, 5000)
  }

  const activeEventObj = useMemo(
    () => events.find((e) => e.id.toString() === selectedEventId),
    [events, selectedEventId]
  )

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle2 className='h-24 w-24 animate-in text-emerald-500 zoom-in' />,
          ring: 'ring-emerald-500/50 shadow-emerald-500/20',
        }
      case 'warning':
        return {
          icon: <AlertCircle className='h-24 w-24 animate-in text-amber-500 zoom-in' />,
          ring: 'ring-amber-500/50 shadow-amber-500/20',
        }
      case 'error':
        return {
          icon: <AlertCircle className='h-24 w-24 animate-in text-rose-500 zoom-in' />,
          ring: 'ring-rose-500/50 shadow-rose-500/20',
        }
      default:
        return {
          icon: <ScanLine className='h-24 w-24 animate-pulse text-indigo-500/50' />,
          ring: 'ring-slate-200 dark:ring-slate-800',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className='relative flex min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100 select-none'>
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
        <div className='absolute top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-emerald-400 blur-[120px]' />
        <div className='absolute top-[60%] right-[-10%] h-[50%] w-[40%] rounded-full bg-indigo-500 blur-[120px]' />
      </div>

      {/* Hidden Form for RFID Scanner */}
      <form onSubmit={handleSubmit} className='absolute -z-10 opacity-0 pointer-events-none'>
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
        {/* Left Side: School Branding, Event Selector & Digital Clock */}
        <div className='flex flex-1 flex-col items-center justify-center border-b border-slate-200 bg-white/30 p-8 backdrop-blur-xl md:items-start md:border-r md:border-b-0 md:p-16 lg:p-24 dark:border-slate-800 dark:bg-slate-900/30 space-y-6'>
          <div className='space-y-3 text-center md:text-left w-full'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-1'>
              <Sparkles className='h-3.5 w-3.5' />
              Kiosk Presensi Kegiatan
            </div>
            <h1 className='bg-linear-to-br from-cyan-500 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-tighter text-transparent md:text-5xl dark:from-cyan-400 dark:to-blue-400'>
              SMK ISLAM SULTAN AGUNG KALINYAMATAN
            </h1>

            {/* Event Selector Box with Button Toggle */}
            <div className='w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm space-y-2.5 mt-4'>
              <div className='flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-1'>
                <span className='flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300'>
                  <Calendar className='h-3.5 w-3.5 text-emerald-500' />
                  Pilih Kegiatan yang Diaktifkan:
                </span>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={fetchActiveEvents}
                    className='p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                    title='Refresh daftar kegiatan'
                  >
                    <RefreshCw className='h-3.5 w-3.5' />
                  </button>
                  <Link to='/events' className='text-primary hover:underline text-[11px] font-semibold'>
                    Kelola Events
                  </Link>
                </div>
              </div>

              {/* Mode Status Pill */}
              <div className='flex items-center justify-between px-1 text-xs'>
                {!isManualOverride ? (
                  <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full'>
                    <span className='relative flex h-2 w-2'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
                    </span>
                    Otomatis Sesuai Jam
                  </span>
                ) : (
                  <button
                    type='button'
                    onClick={handleResetToAuto}
                    className='inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full cursor-pointer transition-colors'
                    title='Kembali ke pemilihan otomatis sesuai jam saat ini'
                  >
                    <Clock className='h-3 w-3' />
                    Mode Manual • Klik untuk Otomatis Jam
                  </button>
                )}
                <span className='text-[10px] text-slate-400 font-mono'>
                  {format(time, 'HH:mm:ss')} WIB
                </span>
              </div>

              {/* Button Toggle Selector */}
              {events.length === 0 ? (
                <div className='p-3 text-center rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500'>
                  Tidak ada kegiatan aktif saat ini.{' '}
                  <Link to='/events' className='text-primary underline font-medium'>
                    Kelola Events
                  </Link>
                </div>
              ) : (
                <div className='flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5'>
                  {events.map((evt) => {
                    const isSelected = selectedEventId === evt.id.toString()
                    const schedule = getEventScheduleStatus(evt, time)

                    return (
                      <button
                        key={evt.id}
                        type='button'
                        onClick={() => handleToggleEvent(evt.id)}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all duration-200 cursor-pointer select-none',
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white shadow-xs ring-1 ring-emerald-500/30'
                            : 'bg-white/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                        )}
                      >
                        <div className='flex flex-col min-w-0 flex-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className={cn('text-sm font-bold truncate', isSelected && 'text-emerald-700 dark:text-emerald-300')}>
                              {evt.name}
                            </span>
                            {/* Schedule Status Badge */}
                            {schedule.status === 'active' && (
                              <span className='inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'>
                                Sesuai Jam
                              </span>
                            )}
                            {schedule.status === 'upcoming' && (
                              <span className='inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'>
                                {schedule.label}
                              </span>
                            )}
                            {schedule.status === 'ended' && (
                              <span className='inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 line-through'>
                                {schedule.label}
                              </span>
                            )}
                          </div>
                          {evt.startTime && (
                            <span className='text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5'>
                              {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''} WIB
                            </span>
                          )}
                        </div>

                        {/* Button Toggle Switch */}
                        <div className='flex items-center gap-2 shrink-0'>
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider',
                              isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            )}
                          >
                            {isSelected ? 'Aktif' : 'Off'}
                          </span>
                          <div
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out',
                              isSelected ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out',
                                isSelected ? 'translate-x-4.5' : 'translate-x-1'
                              )}
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Helper text on current active state */}
              {activeEventObj ? (
                <div className='pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between px-1'>
                  <span className='truncate'>
                    Kegiatan: <strong>{activeEventObj.name}</strong>
                  </span>
                  <span className='shrink-0 text-[10px] font-semibold text-slate-400'>
                    {isManualOverride ? '(Manual)' : '(Otomatis Jam)'}
                  </span>
                </div>
              ) : (
                <div className='pt-1 text-[11px] text-amber-600 dark:text-amber-400 italic px-1'>
                  Tidak ada kegiatan aktif sesuai jam saat ini ({format(time, 'HH:mm')} WIB).
                </div>
              )}
            </div>

            {/* Giant Clock */}
            <div className='pt-2'>
              <h1 className='bg-linear-to-br from-emerald-500 to-teal-500 bg-clip-text text-6xl font-extrabold tracking-tighter text-transparent tabular-nums md:text-8xl dark:from-emerald-400 dark:to-teal-400'>
                {format(time, 'HH:mm')}
                <span className='ml-2 text-3xl font-normal text-slate-400 md:text-5xl dark:text-slate-600'>
                  {format(time, 'ss')}
                </span>
              </h1>
              <p className='text-xl font-semibold text-slate-700 capitalize md:text-3xl dark:text-slate-300 mt-2'>
                {format(time, 'EEEE, d MMMM yyyy', { locale: id })}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Scan Status Card & Recent Taps */}
        <div className='flex flex-1 flex-col items-center justify-center bg-transparent p-6 md:p-12 overflow-y-auto space-y-6'>
          <Card
            className={`flex w-full max-w-lg flex-col items-center rounded-3xl border-0 bg-white/80 p-8 text-center shadow-2xl ring-1 backdrop-blur-2xl transition-all duration-500 md:p-12 dark:bg-slate-900/80 ${config.ring}`}
          >
            <div className='mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-slate-50 shadow-inner dark:bg-slate-800'>
              {config.icon}
            </div>

            <h2
              className={`mb-6 text-xl font-bold transition-colors md:text-2xl ${
                status === 'error'
                  ? 'text-rose-600 dark:text-rose-400'
                  : status === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : status === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {message}
            </h2>

            {tapResult ? (
              <div className='w-full animate-in space-y-5 duration-500 fade-in slide-in-from-bottom-6'>
                <Avatar className='h-32 w-32 md:h-36 md:w-36 border-4 border-emerald-500 mx-auto shadow-xl ring-4 ring-emerald-500/20'>
                  <AvatarImage src={tapResult.avatarUrl || ''} className='object-cover' />
                  <AvatarFallback className='bg-emerald-800 text-emerald-100 text-3xl font-black'>
                    {tapResult.studentName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className='space-y-1 rounded-2xl bg-slate-100/50 p-5 ring-1 ring-slate-200/50 dark:bg-slate-950/50 dark:ring-slate-800/50'>
                  <p className='text-xs font-semibold tracking-widest text-slate-500 uppercase'>
                    Nama Siswa
                  </p>
                  <p className='text-2xl font-extrabold text-slate-800 md:text-3xl dark:text-slate-100'>
                    {tapResult.studentName}
                  </p>
                  <p className='text-sm font-medium text-slate-500'>
                    {tapResult.className || 'Tidak Ada Kelas'} • {tapResult.nomorInduk || 'Tidak Ada NIS'}
                  </p>
                </div>

                <Badge className='bg-emerald-500 text-slate-950 font-extrabold px-4 py-1.5 text-xs uppercase tracking-wider shadow-md'>
                  Presensi {tapResult.eventName} Sukses
                </Badge>
              </div>
            ) : (
              <div className='mt-2 space-y-2 text-slate-400 dark:text-slate-500'>
                <p className='text-sm'>Tempelkan kartu RFID siswa pada scanner</p>
                {activeEventObj ? (
                  <div className='space-y-0.5'>
                    <p className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold'>
                      Kegiatan Aktif: {activeEventObj.name}
                    </p>
                    {activeEventObj.startTime && (
                      <p className='text-[11px] text-slate-500 font-mono'>
                        Jadwal: {activeEventObj.startTime}{activeEventObj.endTime ? ` - ${activeEventObj.endTime}` : ''} WIB {isManualOverride ? '(Override Manual)' : '(Sesuai Jam)'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className='space-y-0.5'>
                    <p className='text-xs text-amber-500 dark:text-amber-400 font-semibold'>
                      Belum ada kegiatan aktif pada jam ini ({format(time, 'HH:mm')} WIB)
                    </p>
                    <p className='text-[11px] text-slate-400 dark:text-slate-500'>
                      Toggle aktif otomatis saat jam kegiatan dimulai, atau aktifkan manual kegiatan di sebelah kiri
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Recent Taps Log */}
          {recentLogs.length > 0 && (
            <div className='w-full max-w-lg rounded-2xl bg-white/60 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 backdrop-blur-md space-y-2 text-xs'>
              <p className='text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider text-center'>
                Tap Terakhir Kegiatan Hari Ini
              </p>
              <div className='space-y-1.5'>
                {recentLogs.map((log, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60'
                  >
                    <span className='font-bold text-slate-800 dark:text-slate-200'>
                      {log.studentName} <span className='text-slate-500 font-normal'>({log.className})</span>
                    </span>
                    <span className='font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]'>
                      {format(new Date(log.tapTime), "HH:mm:ss 'WIB'")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
