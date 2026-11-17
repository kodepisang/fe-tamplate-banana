import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { getServerTime } from '@/lib/server-time'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowUpDown,
  Calendar,
} from 'lucide-react'
import type { GateClassAnalysisItem, GateLogData } from '../index'

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
  startDate?: string
  endDate?: string
  dateFormatted?: string
  classAnalysis?: GateClassAnalysisItem[]
  logs?: GateLogData[]
  totalSiswa?: number
  hadirCount?: number
  terlambatCount?: number
  alphaCount?: number
  totalHadirKeseluruhan?: number
  attendanceRate?: number
  performanceLabel?: string
  onRefresh?: () => void
}

type ChartTab = 'class' | 'donut' | 'timeline' | 'trend'
type ClassMetricMode = 'count' | 'percentage'
type ClassSortMode = 'name' | 'highest' | 'lowest'
type RangePreset = '7D' | '14D' | '30D' | 'MONTH'

const DONUT_COLORS = ['#10b981', '#f59e0b', '#f43f5e'] // Hadir Tepat (Emerald), Terlambat (Amber), Alfa (Rose)

export function GateAttendanceChart({
  selectedClassId = 'ALL',
  startDate,
  endDate,
  dateFormatted,
  classAnalysis = [],
  logs = [],
  totalSiswa = 0,
  hadirCount = 0,
  terlambatCount = 0,
  alphaCount = 0,
  totalHadirKeseluruhan = 0,
  attendanceRate = 0,
  performanceLabel = 'Cukup',
  onRefresh,
}: GateAttendanceChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('class')

  // State for Class Bar Chart
  const [classMetricMode, setClassMetricMode] = useState<ClassMetricMode>('count')
  const [classSortMode, setClassSortMode] = useState<ClassSortMode>('name')

  // State for Trend Multi-Hari
  const [trendData, setTrendData] = useState<GateTrendDataPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [rangePreset, setRangePreset] = useState<RangePreset>('7D')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [isCustomDate, setIsCustomDate] = useState(false)

  // Visible lines toggles for trend chart
  const [visibleTrendLines, setVisibleTrendLines] = useState<{
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

  const toggleTrendLine = (lineKey: keyof typeof visibleTrendLines) => {
    setVisibleTrendLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }

  // Calculate start & end date for trend chart
  const trendDateRange = useMemo(() => {
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
      setTrendLoading(true)
      const params: Record<string, string | number> = {
        startDate: trendDateRange.startDate,
        endDate: trendDateRange.endDate,
      }
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.classId = parseInt(selectedClassId, 10)
      }

      const res = await api.get('/attendances/gate-trend', { params })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTrendData(res.data.data)
      }
    } catch (_error) {
      // ignore
    } finally {
      setTrendLoading(false)
    }
  }, [trendDateRange, selectedClassId])

  useEffect(() => {
    if (activeTab === 'trend') {
      fetchTrendData()
    }
  }, [activeTab, fetchTrendData])

  // Processed Class Data for Bar Chart
  const classChartData = useMemo(() => {
    if (!classAnalysis || classAnalysis.length === 0) return []
    const list = [...classAnalysis]

    if (classSortMode === 'highest') {
      list.sort((a, b) => b.percentage - a.percentage || b.totalHadir - a.totalHadir)
    } else if (classSortMode === 'lowest') {
      list.sort((a, b) => a.percentage - b.percentage || a.totalHadir - b.totalHadir)
    } else {
      list.sort((a, b) => a.className.localeCompare(b.className))
    }

    return list.map((item) => ({
      className: item.className,
      total: item.total,
      hadir: item.hadir,
      terlambat: item.terlambat,
      alpha: item.alpha,
      totalHadir: item.totalHadir,
      percentage: item.percentage,
    }))
  }, [classAnalysis, classSortMode])

  // Donut Chart Data
  const donutData = useMemo(() => {
    return [
      { name: 'Hadir Tepat', value: hadirCount },
      { name: 'Terlambat', value: terlambatCount },
      { name: 'Alfa / Belum Hadir', value: alphaCount },
    ]
  }, [hadirCount, terlambatCount, alphaCount])

  // Timeline / Hourly Distribution of Gate Check-Ins
  const timelineData = useMemo(() => {
    if (!logs || logs.length === 0) return []

    // Group check-ins by 15-minute intervals
    const slotMap = new Map<string, { total: number; tepat: number; terlambat: number }>()

    for (const log of logs) {
      if (!log.checkInTime) continue
      try {
        const timeObj = parseISO(log.checkInTime)
        const minutes = timeObj.getMinutes()
        const roundedMin = Math.floor(minutes / 15) * 15
        const slotKey = `${String(timeObj.getHours()).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`

        if (!slotMap.has(slotKey)) {
          slotMap.set(slotKey, { total: 0, tepat: 0, terlambat: 0 })
        }
        const entry = slotMap.get(slotKey)!
        entry.total += 1
        if (log.status === 'TERLAMBAT') {
          entry.terlambat += 1
        } else {
          entry.tepat += 1
        }
      } catch (_e) {
        // ignore
      }
    }

    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    let runningCumulative = 0
    return sortedSlots.map(([timeSlot, counts]) => {
      runningCumulative += counts.total
      return {
        time: `${timeSlot} WIB`,
        timeRaw: timeSlot,
        count: counts.total,
        tepat: counts.tepat,
        terlambat: counts.terlambat,
        cumulative: runningCumulative,
      }
    })
  }, [logs])

  // Peak timeline stat
  const peakTimelineStat = useMemo(() => {
    if (timelineData.length === 0) return null
    let maxSlot = timelineData[0]
    for (const slot of timelineData) {
      if (slot.count > maxSlot.count) {
        maxSlot = slot
      }
    }
    return maxSlot
  }, [timelineData])

  // Class performance highlights
  const performanceClasses = useMemo(() => {
    if (!classAnalysis || classAnalysis.length === 0) {
      return { best: null, lowest: null }
    }
    const sorted = [...classAnalysis].sort((a, b) => b.percentage - a.percentage)
    return {
      best: sorted[0],
      lowest: sorted[sorted.length - 1],
    }
  }, [classAnalysis])

  // Trend summary metrics
  const trendMetrics = useMemo(() => {
    if (trendData.length === 0) {
      return { latestTotal: 0, latestRate: 0, diffTotal: 0 }
    }
    const firstPoint = trendData[0]
    const latestPoint = trendData[trendData.length - 1]
    const latestTotal = latestPoint?.totalKehadiran || 0
    const latestRate = latestPoint?.attendanceRate || 0
    const diffTotal = latestTotal - (firstPoint?.totalKehadiran || 0)
    return { latestTotal, latestRate, diffTotal }
  }, [trendData])

  const dateLabel = dateFormatted || (startDate && endDate && startDate !== endDate ? `${startDate} s/d ${endDate}` : startDate || 'Hari Ini')

  return (
    <Card className='border shadow-sm'>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold sm:text-lg'>
                Analisis Visual & Grafik Kehadiran Gerbang
              </CardTitle>
              <Badge variant='outline' className='hidden sm:inline-flex text-xs font-normal'>
                {dateLabel}
              </Badge>
            </div>
            <CardDescription className='text-xs sm:text-sm mt-0.5'>
              Eksplorasi visual per kelas, proporsi ketepatan waktu, alur kedatangan gerbang, dan tren harian
            </CardDescription>
          </div>

          {/* Navigation View Switcher */}
          <div className='flex flex-wrap items-center gap-1.5'>
            <div className='inline-flex rounded-lg border bg-muted/60 p-0.5 text-xs'>
              <Button
                variant={activeTab === 'class' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setActiveTab('class')}
              >
                <Layers className='mr-1.5 h-3.5 w-3.5' />
                Per Kelas
              </Button>
              <Button
                variant={activeTab === 'donut' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setActiveTab('donut')}
              >
                <PieChartIcon className='mr-1.5 h-3.5 w-3.5' />
                Komposisi
              </Button>
              <Button
                variant={activeTab === 'timeline' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setActiveTab('timeline')}
              >
                <Clock className='mr-1.5 h-3.5 w-3.5' />
                Waktu Kedatangan
              </Button>
              <Button
                variant={activeTab === 'trend' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setActiveTab('trend')}
              >
                <TrendingUp className='mr-1.5 h-3.5 w-3.5' />
                Tren Harian
              </Button>
            </div>

            {onRefresh && (
              <Button
                variant='outline'
                size='icon'
                className='h-7 w-7'
                onClick={onRefresh}
                title='Segarkan data'
              >
                <RefreshCw className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        </div>

        {/* Sub-controls based on active tab */}
        {activeTab === 'class' && (
          <div className='flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-muted-foreground font-medium'>Tampilan:</span>
              <div className='inline-flex rounded-md border bg-muted/40 p-0.5'>
                <Button
                  variant={classMetricMode === 'count' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => setClassMetricMode('count')}
                >
                  Jumlah Siswa (Tepat, Terlambat, Alfa)
                </Button>
                <Button
                  variant={classMetricMode === 'percentage' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => setClassMetricMode('percentage')}
                >
                  Persentase (%) Kehadiran
                </Button>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <ArrowUpDown className='h-3.5 w-3.5 text-muted-foreground' />
              <span className='text-muted-foreground font-medium'>Urutkan:</span>
              <select
                className='rounded-md border border-input bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring'
                value={classSortMode}
                onChange={(e) => setClassSortMode(e.target.value as ClassSortMode)}
              >
                <option value='name'>Nama Kelas (A-Z)</option>
                <option value='highest'>Partisipasi Tertinggi</option>
                <option value='lowest'>Partisipasi Terendah</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'trend' && (
          <div className='flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs'>
            {/* Presets & Custom Range */}
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-muted-foreground font-medium'>Rentang:</span>
              <div className='inline-flex rounded-md border bg-muted/40 p-0.5'>
                <Button
                  variant={!isCustomDate && rangePreset === '7D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomDate(false)
                    setRangePreset('7D')
                  }}
                >
                  7 Hari
                </Button>
                <Button
                  variant={!isCustomDate && rangePreset === '14D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomDate(false)
                    setRangePreset('14D')
                  }}
                >
                  14 Hari
                </Button>
                <Button
                  variant={!isCustomDate && rangePreset === '30D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomDate(false)
                    setRangePreset('30D')
                  }}
                >
                  30 Hari
                </Button>
                <Button
                  variant={!isCustomDate && rangePreset === 'MONTH' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
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
                className='h-6 px-2 text-xs'
                onClick={() => {
                  if (!isCustomDate) {
                    setCustomStartDate(trendDateRange.startDate)
                    setCustomEndDate(trendDateRange.endDate)
                  }
                  setIsCustomDate(!isCustomDate)
                }}
              >
                <Calendar className='mr-1 h-3 w-3' />
                {isCustomDate ? 'Preset' : 'Kustom'}
              </Button>
            </div>

            {/* Line Toggles */}
            <div className='flex flex-wrap items-center gap-1.5'>
              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('kehadiran')}
                className={`cursor-pointer transition-all select-none border-emerald-500/40 text-[11px] ${
                  visibleTrendLines.kehadiran
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-emerald-500 mr-1' />
                Tepat
                {visibleTrendLines.kehadiran ? <Eye className='ml-1 h-2.5 w-2.5' /> : <EyeOff className='ml-1 h-2.5 w-2.5' />}
              </Badge>

              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('terlambat')}
                className={`cursor-pointer transition-all select-none border-amber-500/40 text-[11px] ${
                  visibleTrendLines.terlambat
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-amber-500 mr-1' />
                Terlambat
                {visibleTrendLines.terlambat ? <Eye className='ml-1 h-2.5 w-2.5' /> : <EyeOff className='ml-1 h-2.5 w-2.5' />}
              </Badge>

              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('alfa')}
                className={`cursor-pointer transition-all select-none border-rose-500/40 text-[11px] ${
                  visibleTrendLines.alfa
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-rose-500 mr-1' />
                Alfa
                {visibleTrendLines.alfa ? <Eye className='ml-1 h-2.5 w-2.5' /> : <EyeOff className='ml-1 h-2.5 w-2.5' />}
              </Badge>

              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('totalKehadiran')}
                className={`cursor-pointer transition-all select-none border-blue-500/40 text-[11px] ${
                  visibleTrendLines.totalKehadiran
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-blue-500 mr-1' />
                Total Hadir
                {visibleTrendLines.totalKehadiran ? <Eye className='ml-1 h-2.5 w-2.5' /> : <EyeOff className='ml-1 h-2.5 w-2.5' />}
              </Badge>
            </div>
          </div>
        )}

        {/* Custom Date Input for Trend */}
        {activeTab === 'trend' && isCustomDate && (
          <div className='flex flex-wrap items-center gap-2 pt-2 text-xs'>
            <span className='font-medium text-muted-foreground'>Rentang Kustom:</span>
            <input
              type='date'
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className='rounded-md border border-input bg-background px-2 py-0.5 text-xs'
            />
            <span className='text-muted-foreground'>s/d</span>
            <input
              type='date'
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className='rounded-md border border-input bg-background px-2 py-0.5 text-xs'
            />
            <Button
              size='sm'
              variant='secondary'
              className='h-6 text-xs px-2'
              onClick={() => fetchTrendData()}
            >
              Terapkan
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* TAB 1: PER KELAS BAR CHART */}
        {activeTab === 'class' && (
          <div className='space-y-4'>
            {classChartData.length === 0 ? (
              <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
                <Layers className='h-10 w-10 text-muted-foreground/40 mb-2' />
                <p className='font-medium'>Belum ada data rombel kelas terdaftar.</p>
              </div>
            ) : (
              <div className='w-full'>
                <div className='h-[340px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={classChartData}
                      margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey='className'
                        stroke='#888888'
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-25}
                        textAnchor='end'
                      />
                      <YAxis
                        stroke='#888888'
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        unit={classMetricMode === 'percentage' ? '%' : ''}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const item = payload[0]?.payload as {
                            className: string
                            total: number
                            hadir: number
                            terlambat: number
                            alpha: number
                            totalHadir: number
                            percentage: number
                          }
                          if (!item) return null

                          return (
                            <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-2 min-w-[210px]'>
                              <div className='font-semibold border-b pb-1.5 flex items-center justify-between'>
                                <span>{item.className}</span>
                                <Badge
                                  variant='outline'
                                  className={
                                    item.percentage >= 85
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : item.percentage >= 70
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                        : item.percentage >= 50
                                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }
                                >
                                  {item.percentage}% Hadir
                                </Badge>
                              </div>
                              <div className='space-y-1 pt-0.5'>
                                <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='h-3 w-3' /> Hadir Tepat
                                  </span>
                                  <span className='font-mono font-bold'>{item.hadir} siswa</span>
                                </div>
                                <div className='flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <Clock className='h-3 w-3' /> Terlambat
                                  </span>
                                  <span className='font-mono font-bold'>{item.terlambat} siswa</span>
                                </div>
                                <div className='flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <XCircle className='h-3 w-3' /> Alfa
                                  </span>
                                  <span className='font-mono font-bold'>{item.alpha} siswa</span>
                                </div>
                                <div className='flex items-center justify-between border-t pt-1 text-muted-foreground'>
                                  <span className='flex items-center gap-1.5'>
                                    <Users className='h-3 w-3' /> Total Rombel
                                  </span>
                                  <span className='font-mono font-semibold'>{item.total} siswa</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      />
                      {classMetricMode === 'count' ? (
                        <>
                          <Bar
                            dataKey='hadir'
                            name='Hadir Tepat'
                            fill='#10b981'
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                          <Bar
                            dataKey='terlambat'
                            name='Terlambat'
                            fill='#f59e0b'
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                          <Bar
                            dataKey='alpha'
                            name='Alfa'
                            fill='#f43f5e'
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                        </>
                      ) : (
                        <Bar
                          dataKey='percentage'
                          name='Persentase Kehadiran'
                          radius={[4, 4, 0, 0]}
                          maxBarSize={45}
                        >
                          {classChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.percentage >= 85
                                  ? '#10b981'
                                  : entry.percentage >= 70
                                    ? '#3b82f6'
                                    : entry.percentage >= 50
                                      ? '#f59e0b'
                                      : '#f43f5e'
                              }
                            />
                          ))}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Class Performance Highlights */}
                <div className='grid gap-3 sm:grid-cols-3 pt-3 border-t text-xs'>
                  {performanceClasses.best && (
                    <div className='flex items-center gap-2 p-2.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'>
                      <Award className='h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <div className='text-[11px] text-muted-foreground'>Partisipasi Tertinggi</div>
                        <div className='font-bold text-emerald-800 dark:text-emerald-300 truncate'>
                          {performanceClasses.best.className} ({performanceClasses.best.percentage}%)
                        </div>
                      </div>
                    </div>
                  )}

                  {performanceClasses.lowest && (
                    <div className='flex items-center gap-2 p-2.5 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'>
                      <XCircle className='h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0' />
                      <div className='min-w-0 flex-1'>
                        <div className='text-[11px] text-muted-foreground'>Perlu Ditingkatkan</div>
                        <div className='font-bold text-rose-800 dark:text-rose-300 truncate'>
                          {performanceClasses.lowest.className} ({performanceClasses.lowest.percentage}%)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className='flex items-center gap-2 p-2.5 rounded-lg border bg-muted/40'>
                    <Layers className='h-4 w-4 text-primary shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <div className='text-[11px] text-muted-foreground'>Total Rombel</div>
                      <div className='font-bold text-foreground'>
                        {classChartData.length} Rombel Teranalisis
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KOMPOSISI & DISTRIBUSI (DONUT CHART) */}
        {activeTab === 'donut' && (
          <div className='grid gap-6 md:grid-cols-12 items-center py-2'>
            {/* Donut Chart */}
            <div className='md:col-span-5 flex flex-col items-center justify-center'>
              <div className='relative h-[260px] w-full max-w-[280px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0]
                        const rate =
                          totalSiswa > 0
                            ? ((Number(data.value) / totalSiswa) * 100).toFixed(1)
                            : 0
                        return (
                          <div className='rounded-lg border bg-background/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[160px]'>
                            <div className='font-semibold'>{data.name}</div>
                            <div className='flex justify-between text-muted-foreground'>
                              <span>Jumlah:</span>
                              <span className='font-mono font-bold text-foreground'>{data.value} siswa</span>
                            </div>
                            <div className='flex justify-between text-muted-foreground'>
                              <span>Proporsi:</span>
                              <span className='font-mono font-bold text-foreground'>{rate}%</span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Pie
                      data={donutData}
                      cx='50%'
                      cy='50%'
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey='value'
                    >
                      {donutData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                          stroke='transparent'
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Percentage Display */}
                <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
                  <span className='text-3xl font-extrabold tracking-tight text-foreground'>
                    {attendanceRate}%
                  </span>
                  <span className='text-[11px] font-medium text-muted-foreground uppercase tracking-wide'>
                    Kehadiran
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className='flex flex-wrap items-center justify-center gap-3 text-xs mt-1'>
                <div className='flex items-center gap-1.5'>
                  <span className='h-3 w-3 rounded-full bg-emerald-500' />
                  <span className='font-medium text-muted-foreground'>Tepat ({hadirCount})</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='h-3 w-3 rounded-full bg-amber-500' />
                  <span className='font-medium text-muted-foreground'>Terlambat ({terlambatCount})</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='h-3 w-3 rounded-full bg-rose-500' />
                  <span className='font-medium text-muted-foreground'>Alfa ({alphaCount})</span>
                </div>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className='md:col-span-7 space-y-4'>
              <div className='rounded-xl border bg-muted/30 p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-sm font-semibold flex items-center gap-1.5'>
                    <Award className='h-4 w-4 text-primary' /> Status Evaluasi Gerbang
                  </h4>
                  <Badge
                    variant='outline'
                    className={
                      attendanceRate >= 90
                        ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : attendanceRate >= 75
                          ? 'border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : attendanceRate >= 60
                            ? 'border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'border-rose-500/50 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }
                  >
                    Kategori: {performanceLabel}
                  </Badge>
                </div>

                <p className='text-xs leading-relaxed text-muted-foreground'>
                  Dari total <strong className='text-foreground'>{totalSiswa} siswa</strong> terdaftar,
                  sebanyak <strong className='text-emerald-600 dark:text-emerald-400'>{totalHadirKeseluruhan} siswa</strong> hadir di gerbang sekolah
                  ({hadirCount} tepat waktu, {terlambatCount} terlambat) dan <strong className='text-rose-600 dark:text-rose-400'>{alphaCount} siswa</strong> tidak hadir/alfa.
                </p>

                {/* Progress Bar Multi-Segment */}
                <div className='space-y-1.5 pt-1'>
                  <div className='flex justify-between text-xs font-semibold'>
                    <span className='text-emerald-600 dark:text-emerald-400'>
                      {attendanceRate}% Total Hadir
                    </span>
                    <span className='text-rose-600 dark:text-rose-400'>
                      {(100 - attendanceRate).toFixed(1)}% Alfa
                    </span>
                  </div>
                  <div className='h-3 w-full rounded-full bg-rose-200 dark:bg-rose-950/60 overflow-hidden flex'>
                    <div
                      className='bg-emerald-500 h-full transition-all duration-500'
                      style={{ width: `${totalSiswa > 0 ? (hadirCount / totalSiswa) * 100 : 0}%` }}
                      title={`Tepat: ${hadirCount}`}
                    />
                    <div
                      className='bg-amber-500 h-full transition-all duration-500'
                      style={{ width: `${totalSiswa > 0 ? (terlambatCount / totalSiswa) * 100 : 0}%` }}
                      title={`Terlambat: ${terlambatCount}`}
                    />
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Total Siswa</div>
                  <div className='text-base font-bold font-mono'>{totalSiswa}</div>
                </div>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Tepat Waktu</div>
                  <div className='text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
                    {hadirCount}
                  </div>
                </div>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Terlambat</div>
                  <div className='text-base font-bold text-amber-600 dark:text-amber-400 font-mono'>
                    {terlambatCount}
                  </div>
                </div>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Alfa</div>
                  <div className='text-base font-bold text-rose-600 dark:text-rose-400 font-mono'>
                    {alphaCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE KEDATANGAN GERBANG */}
        {activeTab === 'timeline' && (
          <div className='space-y-4'>
            {timelineData.length === 0 ? (
              <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
                <Clock className='h-10 w-10 text-muted-foreground/40 mb-2' />
                <p className='font-medium'>Belum ada siswa yang melakukan tap gerbang pada filter ini.</p>
                <p className='text-xs text-muted-foreground/80 mt-1'>
                  Data alur waktu akan otomatis muncul saat siswa melakukan tap kartu RFID atau barcode di gerbang.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <Clock className='h-4 w-4 text-primary' />
                    <span>Distribusi frekuensi kedatangan siswa masuk gerbang per interval 15 menit:</span>
                  </div>

                  {peakTimelineStat && (
                    <Badge variant='outline' className='bg-primary/5 text-primary border-primary/30'>
                      🔥 Puncak Kedatangan Gerbang: {peakTimelineStat.time} ({peakTimelineStat.count} Siswa)
                    </Badge>
                  )}
                </div>

                <div className='h-[300px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart
                      data={timelineData}
                      margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id='colorGateTap' x1='0' y1='0' x2='0' y2='1'>
                          <stop offset='5%' stopColor='#10b981' stopOpacity={0.4} />
                          <stop offset='95%' stopColor='#10b981' stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey='time'
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
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const item = payload[0]?.payload as {
                            time: string
                            count: number
                            tepat: number
                            terlambat: number
                            cumulative: number
                          }
                          if (!item) return null

                          return (
                            <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5 min-w-[190px]'>
                              <div className='font-semibold border-b pb-1'>
                                Waktu: {item.time}
                              </div>
                              <div className='flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium'>
                                <span>Tepat Waktu:</span>
                                <span className='font-mono font-bold'>{item.tepat} siswa</span>
                              </div>
                              <div className='flex justify-between items-center text-amber-600 dark:text-amber-400 font-medium'>
                                <span>Terlambat:</span>
                                <span className='font-mono font-bold'>{item.terlambat} siswa</span>
                              </div>
                              <div className='flex justify-between items-center text-blue-600 dark:text-blue-400 border-t pt-1 font-semibold'>
                                <span>Total Jam Ini:</span>
                                <span className='font-mono font-bold'>{item.count} siswa</span>
                              </div>
                              <div className='flex justify-between items-center text-muted-foreground pt-0.5'>
                                <span>Akumulatif:</span>
                                <span className='font-mono'>{item.cumulative} siswa</span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type='monotone'
                        dataKey='count'
                        name='Jumlah Siswa'
                        stroke='#10b981'
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill='url(#colorGateTap)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t'>
                  <span>
                    Total siswa tercatat di gerbang: <strong className='text-foreground'>{totalHadirKeseluruhan} siswa</strong>
                  </span>
                  <span>
                    Periode: <strong className='text-foreground'>{dateLabel}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TREN HARIAN MULTI-HARI */}
        {activeTab === 'trend' && (
          <div className='space-y-4'>
            {trendLoading && trendData.length === 0 ? (
              <div className='flex h-[320px] items-center justify-center text-muted-foreground text-sm'>
                <RefreshCw className='h-6 w-6 animate-spin text-primary mr-2' />
                <span>Memuat tren kehadiran gerbang...</span>
              </div>
            ) : trendData.length === 0 ? (
              <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
                <Calendar className='h-10 w-10 text-muted-foreground/40 mb-2' />
                <p className='font-medium'>Belum ada data presensi pada rentang tanggal ini.</p>
              </div>
            ) : (
              <div className='w-full'>
                <div className='h-[330px] w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart
                      data={trendData}
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
                              <div className='space-y-1 pt-0.5'>
                                <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='h-3 w-3' /> Kehadiran Tepat
                                  </span>
                                  <span className='font-mono font-bold'>{row.kehadiran}</span>
                                </div>
                                <div className='flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <Clock className='h-3 w-3' /> Terlambat
                                  </span>
                                  <span className='font-mono font-bold'>{row.terlambat}</span>
                                </div>
                                <div className='flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <XCircle className='h-3 w-3' /> Alfa
                                  </span>
                                  <span className='font-mono font-bold'>{row.alfa}</span>
                                </div>
                                <div className='flex items-center justify-between text-blue-600 dark:text-blue-400 border-t pt-1 font-semibold'>
                                  <span className='flex items-center gap-1.5'>
                                    <Users className='h-3 w-3' /> Total Kehadiran
                                  </span>
                                  <span className='font-mono font-bold'>{row.totalKehadiran}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      />
                      {visibleTrendLines.kehadiran && (
                        <Line
                          type='monotone'
                          dataKey='kehadiran'
                          name='Kehadiran Tepat'
                          stroke='#10b981'
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleTrendLines.terlambat && (
                        <Line
                          type='monotone'
                          dataKey='terlambat'
                          name='Terlambat'
                          stroke='#f59e0b'
                          strokeWidth={2}
                          strokeDasharray='4 4'
                          dot={{ r: 3, fill: '#f59e0b' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleTrendLines.alfa && (
                        <Line
                          type='monotone'
                          dataKey='alfa'
                          name='Alfa'
                          stroke='#f43f5e'
                          strokeWidth={2}
                          strokeDasharray='2 2'
                          dot={{ r: 3, fill: '#f43f5e' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleTrendLines.totalKehadiran && (
                        <Line
                          type='monotone'
                          dataKey='totalKehadiran'
                          name='Total Kehadiran'
                          stroke='#3b82f6'
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#3b82f6' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend Footer Stat */}
                <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t'>
                  <span>
                    Presensi Terkini: <strong className='text-foreground'>{trendMetrics.latestTotal} Siswa ({trendMetrics.latestRate}%)</strong>
                  </span>
                  {trendMetrics.diffTotal !== 0 && (
                    <Badge
                      variant='outline'
                      className={`text-[10px] font-mono font-semibold ${
                        trendMetrics.diffTotal > 0
                          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {trendMetrics.diffTotal > 0 ? `▲ +${trendMetrics.diffTotal}` : `▼ ${trendMetrics.diffTotal}`}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
