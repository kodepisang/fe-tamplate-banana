import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import api from '@/lib/api'
import { getServerTime } from '@/lib/server-time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export interface GateTrendDataPoint {
  date: string
  displayDate: string
  kehadiran: number
  terlambat: number
  alfa: number
  totalKehadiran: number
  totalSiswa: number
  attendanceRate: number
}

interface GateAttendanceChartProps {
  selectedClassId?: string
}

type RangePreset = '7D' | '14D' | '30D' | 'MONTH'

export function GateAttendanceChart({
  selectedClassId = 'ALL',
}: GateAttendanceChartProps) {
  const [data, setData] = useState<GateTrendDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [rangePreset, setRangePreset] = useState<RangePreset>('7D')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [isCustomDate, setIsCustomDate] = useState(false)

  // Visible lines toggles
  const [visibleLines, setVisibleLines] = useState<{
    kehadiran: boolean
    terlambat: boolean
    alfa: boolean
    totalKehadiran: boolean
  }>({
    kehadiran: true,
    terlambat: true,
    alfa: true,
    totalKehadiran: true,
  })

  const toggleLine = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }

  // Calculate start & end date based on preset or custom
  const dateRange = useMemo(() => {
    const now = getServerTime()
    if (isCustomDate && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    switch (rangePreset) {
      case '14D':
        return {
          startDate: format(subDays(now, 13), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        }
      case '30D':
        return {
          startDate: format(subDays(now, 29), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        }
      case 'MONTH':
        return {
          startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        }
      case '7D':
      default:
        return {
          startDate: format(subDays(now, 6), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        }
    }
  }, [rangePreset, isCustomDate, customStartDate, customEndDate])

  const fetchTrendData = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.classId = parseInt(selectedClassId, 10)
      }

      const res = await api.get('/attendances/gate-trend', { params })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setData(res.data.data)
      }
    } catch (_error) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedClassId])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        await fetchTrendData()
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [fetchTrendData])

  // Summary Metrics across the selected period
  const metrics = useMemo(() => {
    if (data.length === 0) {
      return {
        avgRate: 0,
        avgHadir: 0,
        avgTerlambat: 0,
        avgAlfa: 0,
        avgTotal: 0,
        totalSiswa: 0,
      }
    }

    const totalDays = data.length
    const sumRate = data.reduce(
      (acc, curr) => acc + (curr.attendanceRate || 0),
      0
    )
    const sumHadir = data.reduce((acc, curr) => acc + (curr.kehadiran || 0), 0)
    const sumTerlambat = data.reduce(
      (acc, curr) => acc + (curr.terlambat || 0),
      0
    )
    const sumAlfa = data.reduce((acc, curr) => acc + (curr.alfa || 0), 0)
    const sumTotal = data.reduce(
      (acc, curr) => acc + (curr.totalKehadiran || 0),
      0
    )
    const totalSiswa = data[data.length - 1]?.totalSiswa || 0

    return {
      avgRate: Number((sumRate / totalDays).toFixed(1)),
      avgHadir: Math.round(sumHadir / totalDays),
      avgTerlambat: Math.round(sumTerlambat / totalDays),
      avgAlfa: Math.round(sumAlfa / totalDays),
      avgTotal: Math.round(sumTotal / totalDays),
      totalSiswa,
    }
  }, [data])

  return (
    <Card className='border shadow-sm'>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <TrendingUp className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold sm:text-lg'>
                Analisis Tren Kehadiran Siswa
              </CardTitle>
            </div>
            <CardDescription className='mt-0.5 text-xs sm:text-sm'>
              Grafik 4 garis: Kehadiran (Tepat Waktu), Terlambat, Alfa, dan
              Total Kehadiran berdasarkan tanggal
            </CardDescription>
          </div>

          {/* Preset Buttons & Custom Toggle */}
          <div className='flex flex-wrap items-center gap-1.5'>
            <div className='inline-flex rounded-lg border bg-muted/60 p-0.5 text-xs'>
              <Button
                variant={
                  !isCustomDate && rangePreset === '7D' ? 'default' : 'ghost'
                }
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => {
                  setIsCustomDate(false)
                  setRangePreset('7D')
                }}
              >
                7 Hari
              </Button>
              <Button
                variant={
                  !isCustomDate && rangePreset === '14D' ? 'default' : 'ghost'
                }
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => {
                  setIsCustomDate(false)
                  setRangePreset('14D')
                }}
              >
                14 Hari
              </Button>
              <Button
                variant={
                  !isCustomDate && rangePreset === '30D' ? 'default' : 'ghost'
                }
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => {
                  setIsCustomDate(false)
                  setRangePreset('30D')
                }}
              >
                30 Hari
              </Button>
              <Button
                variant={
                  !isCustomDate && rangePreset === 'MONTH' ? 'default' : 'ghost'
                }
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => {
                  setIsCustomDate(false)
                  setRangePreset('MONTH')
                }}
              >
                Bulan Ini
              </Button>
            </div>

            <Button
              variant={isCustomDate ? 'default' : 'outline'}
              size='sm'
              className='h-8 px-2.5 text-xs'
              onClick={() => {
                if (!isCustomDate) {
                  setCustomStartDate(dateRange.startDate)
                  setCustomEndDate(dateRange.endDate)
                }
                setIsCustomDate(!isCustomDate)
              }}
            >
              <Calendar className='mr-1.5 h-3.5 w-3.5' />
              {isCustomDate ? 'Preset' : 'Kustom'}
            </Button>

            <Button
              variant='outline'
              size='icon'
              className='h-8 w-8'
              onClick={() => fetchTrendData()}
              disabled={loading}
              title='Muat ulang grafik'
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Custom Date Range Picker Input */}
        {isCustomDate && (
          <div className='flex flex-wrap items-center gap-2 pt-2 text-xs'>
            <span className='font-medium text-muted-foreground'>Rentang:</span>
            <input
              type='date'
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className='rounded-md border border-input bg-background px-2.5 py-1 text-xs'
            />
            <span className='text-muted-foreground'>s/d</span>
            <input
              type='date'
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className='rounded-md border border-input bg-background px-2.5 py-1 text-xs'
            />
            <Button
              size='sm'
              variant='secondary'
              className='h-7 px-2.5 text-xs'
              onClick={() => fetchTrendData()}
            >
              Terapkan
            </Button>
          </div>
        )}

        {/* Summary Badges & Line Toggles */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-3'>
          {/* Interactive Legend Toggles */}
          <div className='flex flex-wrap items-center gap-2 text-xs'>
            <span className='hidden font-medium text-muted-foreground sm:inline'>
              Garis:
            </span>

            {/* Kehadiran Line Toggle */}
            <Badge
              variant='outline'
              onClick={() => toggleLine('kehadiran')}
              className={`cursor-pointer border-emerald-500/40 transition-all select-none ${
                visibleLines.kehadiran
                  ? 'bg-emerald-50 font-semibold text-emerald-700 shadow-xs dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-muted-foreground line-through opacity-40'
              }`}
            >
              <span className='mr-1.5 h-2 w-2 rounded-full bg-emerald-500' />
              Kehadiran Tepat
              {visibleLines.kehadiran ? (
                <Eye className='ml-1.5 h-3 w-3 opacity-70' />
              ) : (
                <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
              )}
            </Badge>

            {/* Terlambat Line Toggle */}
            <Badge
              variant='outline'
              onClick={() => toggleLine('terlambat')}
              className={`cursor-pointer border-amber-500/40 transition-all select-none ${
                visibleLines.terlambat
                  ? 'bg-amber-50 font-semibold text-amber-700 shadow-xs dark:bg-amber-950/40 dark:text-amber-300'
                  : 'text-muted-foreground line-through opacity-40'
              }`}
            >
              <span className='mr-1.5 h-2 w-2 rounded-full bg-amber-500' />
              Terlambat
              {visibleLines.terlambat ? (
                <Eye className='ml-1.5 h-3 w-3 opacity-70' />
              ) : (
                <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
              )}
            </Badge>

            {/* Alfa Line Toggle */}
            <Badge
              variant='outline'
              onClick={() => toggleLine('alfa')}
              className={`cursor-pointer border-rose-500/40 transition-all select-none ${
                visibleLines.alfa
                  ? 'bg-rose-50 font-semibold text-rose-700 shadow-xs dark:bg-rose-950/40 dark:text-rose-300'
                  : 'text-muted-foreground line-through opacity-40'
              }`}
            >
              <span className='mr-1.5 h-2 w-2 rounded-full bg-rose-500' />
              Alfa
              {visibleLines.alfa ? (
                <Eye className='ml-1.5 h-3 w-3 opacity-70' />
              ) : (
                <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
              )}
            </Badge>

            {/* Total Kehadiran Line Toggle */}
            <Badge
              variant='outline'
              onClick={() => toggleLine('totalKehadiran')}
              className={`cursor-pointer border-blue-500/40 transition-all select-none ${
                visibleLines.totalKehadiran
                  ? 'bg-blue-50 font-semibold text-blue-700 shadow-xs dark:bg-blue-950/40 dark:text-blue-300'
                  : 'text-muted-foreground line-through opacity-40'
              }`}
            >
              <span className='mr-1.5 h-2 w-2 rounded-full bg-blue-500' />
              Total Kehadiran
              {visibleLines.totalKehadiran ? (
                <Eye className='ml-1.5 h-3 w-3 opacity-70' />
              ) : (
                <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
              )}
            </Badge>
          </div>

          {/* Quick Average Stat */}
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <div>
              Rata-rata:{' '}
              <span className='font-bold text-foreground'>
                {metrics.avgRate}%
              </span>
            </div>
            <div className='hidden sm:block'>
              Siswa Terdaftar:{' '}
              <span className='font-semibold text-foreground'>
                {metrics.totalSiswa}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && data.length === 0 ? (
          <div className='flex h-[320px] items-center justify-center text-muted-foreground'>
            <RefreshCw className='mr-2 h-6 w-6 animate-spin text-primary' />
            <span>Memuat data grafik tren presensi...</span>
          </div>
        ) : data.length === 0 ? (
          <div className='flex h-[320px] flex-col items-center justify-center text-sm text-muted-foreground'>
            <Calendar className='mb-2 h-10 w-10 text-muted-foreground/40' />
            <p className='font-medium'>
              Belum ada data presensi pada rentang tanggal ini.
            </p>
            <p className='mt-1 text-xs text-muted-foreground/80'>
              Pilih tanggal lain atau pastikan siswa telah melakukan tap
              absensi.
            </p>
          </div>
        ) : (
          <div className='w-full'>
            <div className='h-[330px] w-full'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart
                  data={data}
                  margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey='displayDate'
                    stroke='#888888'
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke='#888888'
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null
                      const row = payload[0]?.payload as GateTrendDataPoint
                      if (!row) return null

                      return (
                        <div className='min-w-[210px] space-y-2 rounded-lg border bg-background/95 p-3 text-xs shadow-lg backdrop-blur-md'>
                          <div className='flex items-center justify-between border-b pb-1.5 font-semibold'>
                            <span>{label}</span>
                            <Badge
                              variant='outline'
                              className='font-mono text-[10px]'
                            >
                              {row.attendanceRate}% Hadir
                            </Badge>
                          </div>
                          <div className='space-y-1.5 pt-0.5'>
                            <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400'>
                              <div className='flex items-center gap-1.5'>
                                <CheckCircle2 className='h-3 w-3' />
                                <span>Kehadiran (Tepat)</span>
                              </div>
                              <span className='font-mono font-bold'>
                                {row.kehadiran}
                              </span>
                            </div>

                            <div className='flex items-center justify-between text-amber-600 dark:text-amber-400'>
                              <div className='flex items-center gap-1.5'>
                                <Clock className='h-3 w-3' />
                                <span>Terlambat</span>
                              </div>
                              <span className='font-mono font-bold'>
                                {row.terlambat}
                              </span>
                            </div>

                            <div className='flex items-center justify-between text-rose-600 dark:text-rose-400'>
                              <div className='flex items-center gap-1.5'>
                                <XCircle className='h-3 w-3' />
                                <span>Alfa</span>
                              </div>
                              <span className='font-mono font-bold'>
                                {row.alfa}
                              </span>
                            </div>

                            <div className='flex items-center justify-between border-t pt-1 font-semibold text-blue-600 dark:text-blue-400'>
                              <div className='flex items-center gap-1.5'>
                                <Users className='h-3 w-3' />
                                <span>Total Kehadiran</span>
                              </div>
                              <span className='font-mono font-bold'>
                                {row.totalKehadiran}
                              </span>
                            </div>
                          </div>
                          <div className='border-t pt-1 text-right text-[10px] text-muted-foreground'>
                            Dari total {row.totalSiswa} siswa
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Legend content={() => null} />

                  {/* 1. Kehadiran Line (Emerald) */}
                  {visibleLines.kehadiran && (
                    <Line
                      type='monotone'
                      dataKey='kehadiran'
                      name='Kehadiran'
                      stroke='#10b981'
                      strokeWidth={2.5}
                      dot={{
                        r: 3.5,
                        fill: '#10b981',
                        strokeWidth: 1.5,
                        stroke: '#ffffff',
                      }}
                      activeDot={{ r: 6, fill: '#10b981' }}
                    />
                  )}

                  {/* 2. Terlambat Line (Amber) */}
                  {visibleLines.terlambat && (
                    <Line
                      type='monotone'
                      dataKey='terlambat'
                      name='Terlambat'
                      stroke='#f59e0b'
                      strokeWidth={2.5}
                      dot={{
                        r: 3.5,
                        fill: '#f59e0b',
                        strokeWidth: 1.5,
                        stroke: '#ffffff',
                      }}
                      activeDot={{ r: 6, fill: '#f59e0b' }}
                    />
                  )}

                  {/* 3. Alfa Line (Rose) */}
                  {visibleLines.alfa && (
                    <Line
                      type='monotone'
                      dataKey='alfa'
                      name='Alfa'
                      stroke='#ef4444'
                      strokeWidth={2.5}
                      dot={{
                        r: 3.5,
                        fill: '#ef4444',
                        strokeWidth: 1.5,
                        stroke: '#ffffff',
                      }}
                      activeDot={{ r: 6, fill: '#ef4444' }}
                    />
                  )}

                  {/* 4. Total Kehadiran Line (Blue) */}
                  {visibleLines.totalKehadiran && (
                    <Line
                      type='monotone'
                      dataKey='totalKehadiran'
                      name='Total Kehadiran'
                      stroke='#3b82f6'
                      strokeWidth={3}
                      strokeDasharray='5 2'
                      dot={{
                        r: 4,
                        fill: '#3b82f6',
                        strokeWidth: 2,
                        stroke: '#ffffff',
                      }}
                      activeDot={{ r: 7, fill: '#3b82f6' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Metric Footer Stat Cards */}
            <div className='mt-4 grid grid-cols-2 gap-2.5 border-t pt-3 text-xs sm:grid-cols-4'>
              <div className='rounded-lg border bg-emerald-50/50 p-2.5 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'>
                <div className='text-[11px] font-medium opacity-80'>
                  Rata-rata Tepat Waktu
                </div>
                <div className='mt-0.5 font-mono text-lg font-bold'>
                  {metrics.avgHadir}{' '}
                  <span className='text-xs font-normal opacity-70'>
                    siswa/hari
                  </span>
                </div>
              </div>

              <div className='rounded-lg border bg-amber-50/50 p-2.5 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'>
                <div className='text-[11px] font-medium opacity-80'>
                  Rata-rata Terlambat
                </div>
                <div className='mt-0.5 font-mono text-lg font-bold'>
                  {metrics.avgTerlambat}{' '}
                  <span className='text-xs font-normal opacity-70'>
                    siswa/hari
                  </span>
                </div>
              </div>

              <div className='rounded-lg border bg-rose-50/50 p-2.5 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300'>
                <div className='text-[11px] font-medium opacity-80'>
                  Rata-rata Alfa
                </div>
                <div className='mt-0.5 font-mono text-lg font-bold'>
                  {metrics.avgAlfa}{' '}
                  <span className='text-xs font-normal opacity-70'>
                    siswa/hari
                  </span>
                </div>
              </div>

              <div className='rounded-lg border bg-blue-50/50 p-2.5 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'>
                <div className='text-[11px] font-medium opacity-80'>
                  Rata-rata Total Hadir
                </div>
                <div className='mt-0.5 font-mono text-lg font-bold'>
                  {metrics.avgTotal}{' '}
                  <span className='text-xs font-normal opacity-70'>
                    siswa/hari
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
