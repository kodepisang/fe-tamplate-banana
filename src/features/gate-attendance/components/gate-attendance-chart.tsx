import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { getServerTime } from '@/lib/server-time'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'

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

export function GateAttendanceChart({ selectedClassId = 'ALL' }: GateAttendanceChartProps) {
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

  // Real Progress Metrics (Nilai Riil & Tren Progres, tanpa rata-rata)
  const metrics = useMemo(() => {
    if (data.length === 0) {
      return {
        latestHadir: 0,
        latestTerlambat: 0,
        latestAlfa: 0,
        latestTotal: 0,
        latestRate: 0,
        sumHadir: 0,
        sumTerlambat: 0,
        sumAlfa: 0,
        sumTotal: 0,
        diffHadir: 0,
        diffTerlambat: 0,
        diffAlfa: 0,
        diffTotal: 0,
        diffRate: 0,
        totalSiswa: 0,
      }
    }

    const firstPoint = data[0]
    const latestPoint = data[data.length - 1]

    const sumHadir = data.reduce((acc, curr) => acc + (curr.kehadiran || 0), 0)
    const sumTerlambat = data.reduce((acc, curr) => acc + (curr.terlambat || 0), 0)
    const sumAlfa = data.reduce((acc, curr) => acc + (curr.alfa || 0), 0)
    const sumTotal = data.reduce((acc, curr) => acc + (curr.totalKehadiran || 0), 0)
    const totalSiswa = latestPoint?.totalSiswa || 0

    const latestHadir = latestPoint?.kehadiran || 0
    const latestTerlambat = latestPoint?.terlambat || 0
    const latestAlfa = latestPoint?.alfa || 0
    const latestTotal = latestPoint?.totalKehadiran || 0
    const latestRate = latestPoint?.attendanceRate || 0

    const diffHadir = latestHadir - (firstPoint?.kehadiran || 0)
    const diffTerlambat = latestTerlambat - (firstPoint?.terlambat || 0)
    const diffAlfa = latestAlfa - (firstPoint?.alfa || 0)
    const diffTotal = latestTotal - (firstPoint?.totalKehadiran || 0)
    const diffRate = Number((latestRate - (firstPoint?.attendanceRate || 0)).toFixed(1))

    return {
      latestHadir,
      latestTerlambat,
      latestAlfa,
      latestTotal,
      latestRate,
      sumHadir,
      sumTerlambat,
      sumAlfa,
      sumTotal,
      diffHadir,
      diffTerlambat,
      diffAlfa,
      diffTotal,
      diffRate,
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
                Analisis Progres Kehadiran Siswa
              </CardTitle>
            </div>
            <CardDescription className='text-xs sm:text-sm mt-0.5'>
              Grafik 4 garis nilai riil: Kehadiran (Tepat), Terlambat, Alfa, dan Total Kehadiran berdasarkan tanggal
            </CardDescription>
          </div>

          {/* Preset Buttons & Custom Toggle */}
          <div className='flex flex-wrap items-center gap-1.5'>
            <div className='inline-flex rounded-lg border bg-muted/60 p-0.5 text-xs'>
              <Button
                variant={!isCustomDate && rangePreset === '7D' ? 'default' : 'ghost'}
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
                variant={!isCustomDate && rangePreset === '14D' ? 'default' : 'ghost'}
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
                variant={!isCustomDate && rangePreset === '30D' ? 'default' : 'ghost'}
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
                variant={!isCustomDate && rangePreset === 'MONTH' ? 'default' : 'ghost'}
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
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
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
              className='h-7 text-xs px-2.5'
              onClick={() => fetchTrendData()}
            >
              Terapkan
            </Button>
          </div>
        )}

        {/* Summary Badges & Line Toggles */}
        <div className='flex flex-wrap items-center justify-between gap-2 pt-3 border-t'>
          {/* Interactive Legend Toggles */}
          <div className='flex flex-wrap items-center gap-2 text-xs'>
            <span className='text-muted-foreground font-medium hidden sm:inline'>Garis:</span>

            {/* Kehadiran Line Toggle */}
            <Badge
              variant='outline'
              onClick={() => toggleLine('kehadiran')}
              className={`cursor-pointer transition-all select-none border-emerald-500/40 ${
                visibleLines.kehadiran
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold shadow-xs'
                  : 'opacity-40 text-muted-foreground line-through'
              }`}
            >
              <span className='h-2 w-2 rounded-full bg-emerald-500 mr-1.5' />
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
              className={`cursor-pointer transition-all select-none border-amber-500/40 ${
                visibleLines.terlambat
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold shadow-xs'
                  : 'opacity-40 text-muted-foreground line-through'
              }`}
            >
              <span className='h-2 w-2 rounded-full bg-amber-500 mr-1.5' />
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
              className={`cursor-pointer transition-all select-none border-rose-500/40 ${
                visibleLines.alfa
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold shadow-xs'
                  : 'opacity-40 text-muted-foreground line-through'
              }`}
            >
              <span className='h-2 w-2 rounded-full bg-rose-500 mr-1.5' />
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
              className={`cursor-pointer transition-all select-none border-blue-500/40 ${
                visibleLines.totalKehadiran
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-xs'
                  : 'opacity-40 text-muted-foreground line-through'
              }`}
            >
              <span className='h-2 w-2 rounded-full bg-blue-500 mr-1.5' />
              Total Kehadiran
              {visibleLines.totalKehadiran ? (
                <Eye className='ml-1.5 h-3 w-3 opacity-70' />
              ) : (
                <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
              )}
            </Badge>
          </div>

          {/* Quick Real Value & Progress Stat */}
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <div className='flex items-center gap-1.5'>
              <span>Presensi Terkini:</span>
              <span className='font-mono font-bold text-foreground'>
                {metrics.latestTotal} Siswa ({metrics.latestRate}%)
              </span>
              {metrics.diffTotal !== 0 && (
                <Badge
                  variant='outline'
                  className={`px-1.5 py-0 text-[10px] font-mono font-semibold ${
                    metrics.diffTotal > 0
                      ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}
                >
                  {metrics.diffTotal > 0 ? `▲ +${metrics.diffTotal}` : `▼ ${metrics.diffTotal}`}
                </Badge>
              )}
            </div>
            <div className='hidden sm:block'>
              Total Siswa: <span className='font-semibold text-foreground'>{metrics.totalSiswa}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && data.length === 0 ? (
          <div className='flex h-[320px] items-center justify-center text-muted-foreground'>
            <RefreshCw className='h-6 w-6 animate-spin text-primary mr-2' />
            <span>Memuat data grafik tren presensi...</span>
          </div>
        ) : data.length === 0 ? (
          <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
            <Calendar className='h-10 w-10 text-muted-foreground/40 mb-2' />
            <p className='font-medium'>Belum ada data presensi pada rentang tanggal ini.</p>
            <p className='text-xs text-muted-foreground/80 mt-1'>
              Pilih tanggal lain atau pastikan siswa telah melakukan tap absensi.
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
                  <CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.3} />
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
                        <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-2 min-w-[210px]'>
                          <div className='font-semibold border-b pb-1.5 flex items-center justify-between'>
                            <span>{label}</span>
                            <Badge variant='outline' className='text-[10px] font-mono'>
                              {row.attendanceRate}% Hadir
                            </Badge>
                          </div>
                          <div className='space-y-1.5 pt-0.5'>
                            <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400'>
                              <div className='flex items-center gap-1.5'>
                                <CheckCircle2 className='h-3 w-3' />
                                <span>Kehadiran (Tepat)</span>
                              </div>
                              <span className='font-mono font-bold'>{row.kehadiran}</span>
                            </div>

                            <div className='flex items-center justify-between text-amber-600 dark:text-amber-400'>
                              <div className='flex items-center gap-1.5'>
                                <Clock className='h-3 w-3' />
                                <span>Terlambat</span>
                              </div>
                              <span className='font-mono font-bold'>{row.terlambat}</span>
                            </div>

                            <div className='flex items-center justify-between text-rose-600 dark:text-rose-400'>
                              <div className='flex items-center gap-1.5'>
                                <XCircle className='h-3 w-3' />
                                <span>Alfa</span>
                              </div>
                              <span className='font-mono font-bold'>{row.alfa}</span>
                            </div>

                            <div className='flex items-center justify-between text-blue-600 dark:text-blue-400 border-t pt-1 font-semibold'>
                              <div className='flex items-center gap-1.5'>
                                <Users className='h-3 w-3' />
                                <span>Total Kehadiran</span>
                              </div>
                              <span className='font-mono font-bold'>{row.totalKehadiran}</span>
                            </div>
                          </div>
                          <div className='text-[10px] text-muted-foreground pt-1 border-t text-right'>
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
                      dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
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
                      dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#ffffff' }}
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
                      dot={{ r: 3.5, fill: '#ef4444', strokeWidth: 1.5, stroke: '#ffffff' }}
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
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, fill: '#3b82f6' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Metric Footer Stat Cards - Real Progression Values */}
            <div className='mt-4 grid grid-cols-2 gap-2.5 border-t pt-3 text-xs sm:grid-cols-4'>
              {/* Card 1: Kehadiran Tepat */}
              <div className='rounded-lg border bg-emerald-50/50 p-2.5 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'>
                <div className='flex items-center justify-between text-[11px] font-medium opacity-80'>
                  <span>Kehadiran Tepat</span>
                  {metrics.diffHadir > 0 ? (
                    <span className='flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                      <TrendingUp className='mr-0.5 h-3 w-3' /> +{metrics.diffHadir}
                    </span>
                  ) : metrics.diffHadir < 0 ? (
                    <span className='flex items-center text-[10px] text-amber-600 dark:text-amber-400 font-semibold'>
                      <TrendingDown className='mr-0.5 h-3 w-3' /> {metrics.diffHadir}
                    </span>
                  ) : (
                    <span className='flex items-center text-[10px] opacity-70'>
                      <Minus className='mr-0.5 h-3 w-3' /> Tetap
                    </span>
                  )}
                </div>
                <div className='mt-1 font-mono text-xl font-bold'>
                  {metrics.latestHadir}{' '}
                  <span className='text-xs font-normal opacity-70'>siswa</span>
                </div>
                <div className='mt-1 text-[11px] opacity-75'>
                  Akumulasi: <span className='font-semibold'>{metrics.sumHadir}</span> presensi
                </div>
              </div>

              {/* Card 2: Terlambat */}
              <div className='rounded-lg border bg-amber-50/50 p-2.5 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'>
                <div className='flex items-center justify-between text-[11px] font-medium opacity-80'>
                  <span>Terlambat</span>
                  {metrics.diffTerlambat < 0 ? (
                    <span className='flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                      <TrendingDown className='mr-0.5 h-3 w-3' /> {metrics.diffTerlambat}
                    </span>
                  ) : metrics.diffTerlambat > 0 ? (
                    <span className='flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-semibold'>
                      <TrendingUp className='mr-0.5 h-3 w-3' /> +{metrics.diffTerlambat}
                    </span>
                  ) : (
                    <span className='flex items-center text-[10px] opacity-70'>
                      <Minus className='mr-0.5 h-3 w-3' /> Tetap
                    </span>
                  )}
                </div>
                <div className='mt-1 font-mono text-xl font-bold'>
                  {metrics.latestTerlambat}{' '}
                  <span className='text-xs font-normal opacity-70'>siswa</span>
                </div>
                <div className='mt-1 text-[11px] opacity-75'>
                  Akumulasi: <span className='font-semibold'>{metrics.sumTerlambat}</span> kejadian
                </div>
              </div>

              {/* Card 3: Alfa */}
              <div className='rounded-lg border bg-rose-50/50 p-2.5 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300'>
                <div className='flex items-center justify-between text-[11px] font-medium opacity-80'>
                  <span>Alfa / Tidak Hadir</span>
                  {metrics.diffAlfa < 0 ? (
                    <span className='flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                      <TrendingDown className='mr-0.5 h-3 w-3' /> {metrics.diffAlfa}
                    </span>
                  ) : metrics.diffAlfa > 0 ? (
                    <span className='flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-semibold'>
                      <TrendingUp className='mr-0.5 h-3 w-3' /> +{metrics.diffAlfa}
                    </span>
                  ) : (
                    <span className='flex items-center text-[10px] opacity-70'>
                      <Minus className='mr-0.5 h-3 w-3' /> Tetap
                    </span>
                  )}
                </div>
                <div className='mt-1 font-mono text-xl font-bold'>
                  {metrics.latestAlfa}{' '}
                  <span className='text-xs font-normal opacity-70'>siswa</span>
                </div>
                <div className='mt-1 text-[11px] opacity-75'>
                  Akumulasi: <span className='font-semibold'>{metrics.sumAlfa}</span> alpa
                </div>
              </div>

              {/* Card 4: Total Kehadiran */}
              <div className='rounded-lg border bg-blue-50/50 p-2.5 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'>
                <div className='flex items-center justify-between text-[11px] font-medium opacity-80'>
                  <span>Total Kehadiran</span>
                  {metrics.diffTotal > 0 ? (
                    <span className='flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                      <TrendingUp className='mr-0.5 h-3 w-3' /> +{metrics.diffTotal} ({metrics.diffRate >= 0 ? `+${metrics.diffRate}` : metrics.diffRate}%)
                    </span>
                  ) : metrics.diffTotal < 0 ? (
                    <span className='flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-semibold'>
                      <TrendingDown className='mr-0.5 h-3 w-3' /> {metrics.diffTotal} ({metrics.diffRate}%)
                    </span>
                  ) : (
                    <span className='flex items-center text-[10px] opacity-70'>
                      <Minus className='mr-0.5 h-3 w-3' /> Tetap
                    </span>
                  )}
                </div>
                <div className='mt-1 font-mono text-xl font-bold'>
                  {metrics.latestTotal}{' '}
                  <span className='text-xs font-normal opacity-70'>/ {metrics.totalSiswa} ({metrics.latestRate}%)</span>
                </div>
                <div className='mt-1 text-[11px] opacity-75'>
                  Akumulasi: <span className='font-semibold'>{metrics.sumTotal}</span> presensi
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
