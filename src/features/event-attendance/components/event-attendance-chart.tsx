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
import type { EventDashboardData } from '../index'

interface EventAttendanceChartProps {
  dashboardData: EventDashboardData | null
  selectedEventId: number | null
  startDate?: string
  endDate?: string
  selectedDate?: string
  selectedClassId: string
  onRefresh?: () => void
}

interface EventTrendPoint {
  date: string
  displayDate: string
  hadir: number
  tidakHadir: number
  totalSiswa: number
  attendanceRate: number
}

type ChartTab = 'class' | 'donut' | 'timeline' | 'trend'
type ClassMetricMode = 'count' | 'percentage'
type ClassSortMode = 'name' | 'highest' | 'lowest'
type RangePreset = '7D' | '14D' | '30D' | 'MONTH'

const DONUT_COLORS = ['#10b981', '#f43f5e'] // Emerald for Hadir, Rose for Tidak Hadir

export function EventAttendanceChart({
  dashboardData,
  selectedEventId,
  startDate,
  endDate,
  selectedDate,
  selectedClassId,
  onRefresh,
}: EventAttendanceChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('class')

  // State for Class Bar Chart
  const [classMetricMode, setClassMetricMode] = useState<ClassMetricMode>('count')
  const [classSortMode, setClassSortMode] = useState<ClassSortMode>('name')

  // State for Trend Multi-Hari
  const [trendRangePreset, setTrendRangePreset] = useState<RangePreset>('7D')
  const [customTrendStart, setCustomTrendStart] = useState<string>('')
  const [customTrendEnd, setCustomTrendEnd] = useState<string>('')
  const [isCustomTrend, setIsCustomTrend] = useState(false)
  const [trendData, setTrendData] = useState<EventTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [visibleTrendLines, setVisibleTrendLines] = useState({
    hadir: true,
    tidakHadir: true,
    rate: true,
  })

  const toggleTrendLine = (key: keyof typeof visibleTrendLines) => {
    setVisibleTrendLines((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Calculate trend date range
  const trendDateRange = useMemo(() => {
    const now = getServerTime()
    if (isCustomTrend && customTrendStart && customTrendEnd) {
      return {
        start: customTrendStart,
        end: customTrendEnd,
      }
    }

    switch (trendRangePreset) {
      case '14D':
        return {
          start: format(subDays(now, 13), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd'),
        }
      case '30D':
        return {
          start: format(subDays(now, 29), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd'),
        }
      case 'MONTH':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd'),
        }
      case '7D':
      default:
        return {
          start: format(subDays(now, 6), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd'),
        }
    }
  }, [trendRangePreset, isCustomTrend, customTrendStart, customTrendEnd])

  // Fetch multi-day trend when on 'trend' tab
  const fetchTrend = useCallback(async () => {
    if (!selectedEventId) return
    try {
      setTrendLoading(true)

      const params: Record<string, string | number> = {
        eventId: selectedEventId,
        startDate: trendDateRange.start,
        endDate: trendDateRange.end,
      }
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.classId = parseInt(selectedClassId, 10)
      }

      const res = await api.get('/events/trend', { params })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTrendData(res.data.data)
      }
    } catch (_err) {
      // ignore
    } finally {
      setTrendLoading(false)
    }
  }, [selectedEventId, trendDateRange, selectedClassId])

  useEffect(() => {
    if (activeTab === 'trend') {
      fetchTrend()
    }
  }, [activeTab, fetchTrend])

  // Processed Class Data for Bar Chart
  const classChartData = useMemo(() => {
    if (!dashboardData?.classAnalysis) return []
    const list = [...dashboardData.classAnalysis]

    if (classSortMode === 'highest') {
      list.sort((a, b) => b.percentage - a.percentage || b.attended - a.attended)
    } else if (classSortMode === 'lowest') {
      list.sort((a, b) => a.percentage - b.percentage || a.attended - b.attended)
    } else {
      list.sort((a, b) => a.className.localeCompare(b.className))
    }

    return list.map((item) => ({
      className: item.className,
      total: item.total,
      hadir: item.attended,
      tidakHadir: item.unattended,
      percentage: item.percentage,
    }))
  }, [dashboardData?.classAnalysis, classSortMode])

  // Donut Chart Data
  const donutData = useMemo(() => {
    if (!dashboardData) return []
    return [
      { name: 'Hadir', value: dashboardData.attendedCount },
      { name: 'Belum Hadir / Absen', value: dashboardData.unattendedCount },
    ]
  }, [dashboardData])

  // Timeline / Hourly Distribution of Tap Times
  const timelineData = useMemo(() => {
    if (!dashboardData?.studentsWithStatus) return []

    // Filter attended students with valid tapTime
    const tapped = dashboardData.studentsWithStatus.filter(
      (s) => s.status === 'HADIR' && s.tapTime
    )

    if (tapped.length === 0) return []

    // Group by 15-minute intervals (HH:mm)
    const slotMap = new Map<string, number>()

    for (const s of tapped) {
      try {
        const timeObj = parseISO(s.tapTime!)
        const minutes = timeObj.getMinutes()
        const roundedMin = Math.floor(minutes / 15) * 15
        const slotKey = `${String(timeObj.getHours()).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`
        slotMap.set(slotKey, (slotMap.get(slotKey) || 0) + 1)
      } catch (_e) {
        // ignore invalid date
      }
    }

    const sortedSlots = Array.from(slotMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    let runningCumulative = 0
    return sortedSlots.map(([timeSlot, count]) => {
      runningCumulative += count
      return {
        time: `${timeSlot} WIB`,
        timeRaw: timeSlot,
        count,
        cumulative: runningCumulative,
      }
    })
  }, [dashboardData?.studentsWithStatus])

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

  // Best & lowest performing classes
  const performanceClasses = useMemo(() => {
    if (!dashboardData?.classAnalysis || dashboardData.classAnalysis.length === 0)
      return { best: null, lowest: null }

    const sorted = [...dashboardData.classAnalysis].sort(
      (a, b) => b.percentage - a.percentage
    )
    return {
      best: sorted[0],
      lowest: sorted[sorted.length - 1],
    }
  }, [dashboardData?.classAnalysis])

  if (!dashboardData) return null

  const dateLabel =
    dashboardData.dateFormatted ||
    (startDate && endDate && startDate !== endDate
      ? `${startDate} s/d ${endDate}`
      : startDate || selectedDate || 'Hari Ini')

  return (
    <Card className='border shadow-sm'>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold sm:text-lg'>
                Analisis Visual & Grafik Kehadiran Kegiatan
              </CardTitle>
              <Badge variant='outline' className='hidden sm:inline-flex text-xs font-normal'>
                {dashboardData.currentEvent?.name || 'Kegiatan'} • {dateLabel}
              </Badge>
            </div>
            <CardDescription className='text-xs sm:text-sm mt-0.5'>
              Eksplorasi visual per kelas, komposisi partisipasi, alur waktu presensi, dan tren kegiatan
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
                  Jumlah Siswa (Hadir vs Absen)
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
            {/* Range Presets */}
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-muted-foreground font-medium'>Rentang:</span>
              <div className='inline-flex rounded-md border bg-muted/40 p-0.5'>
                <Button
                  variant={!isCustomTrend && trendRangePreset === '7D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomTrend(false)
                    setTrendRangePreset('7D')
                  }}
                >
                  7 Hari
                </Button>
                <Button
                  variant={!isCustomTrend && trendRangePreset === '14D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomTrend(false)
                    setTrendRangePreset('14D')
                  }}
                >
                  14 Hari
                </Button>
                <Button
                  variant={!isCustomTrend && trendRangePreset === '30D' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomTrend(false)
                    setTrendRangePreset('30D')
                  }}
                >
                  30 Hari
                </Button>
                <Button
                  variant={!isCustomTrend && trendRangePreset === 'MONTH' ? 'secondary' : 'ghost'}
                  size='sm'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    setIsCustomTrend(false)
                    setTrendRangePreset('MONTH')
                  }}
                >
                  Bulan Ini
                </Button>
              </div>

              <Button
                variant={isCustomTrend ? 'default' : 'outline'}
                size='sm'
                className='h-6 px-2 text-xs'
                onClick={() => {
                  if (!isCustomTrend) {
                    setCustomTrendStart(trendDateRange.start)
                    setCustomTrendEnd(trendDateRange.end)
                  }
                  setIsCustomTrend(!isCustomTrend)
                }}
              >
                <Calendar className='mr-1 h-3 w-3' />
                {isCustomTrend ? 'Preset' : 'Kustom'}
              </Button>
            </div>

            {/* Line Toggles */}
            <div className='flex flex-wrap items-center gap-2'>
              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('hadir')}
                className={`cursor-pointer transition-all select-none border-emerald-500/40 ${
                  visibleTrendLines.hadir
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-emerald-500 mr-1.5' />
                Hadir
                {visibleTrendLines.hadir ? (
                  <Eye className='ml-1.5 h-3 w-3 opacity-70' />
                ) : (
                  <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
                )}
              </Badge>

              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('tidakHadir')}
                className={`cursor-pointer transition-all select-none border-rose-500/40 ${
                  visibleTrendLines.tidakHadir
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-rose-500 mr-1.5' />
                Tidak Hadir
                {visibleTrendLines.tidakHadir ? (
                  <Eye className='ml-1.5 h-3 w-3 opacity-70' />
                ) : (
                  <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
                )}
              </Badge>

              <Badge
                variant='outline'
                onClick={() => toggleTrendLine('rate')}
                className={`cursor-pointer transition-all select-none border-blue-500/40 ${
                  visibleTrendLines.rate
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
                    : 'opacity-40 text-muted-foreground line-through'
                }`}
              >
                <span className='h-2 w-2 rounded-full bg-blue-500 mr-1.5' />
                Tingkat Partisipasi (%)
                {visibleTrendLines.rate ? (
                  <Eye className='ml-1.5 h-3 w-3 opacity-70' />
                ) : (
                  <EyeOff className='ml-1.5 h-3 w-3 opacity-70' />
                )}
              </Badge>
            </div>
          </div>
        )}

        {/* Custom Date Input for Trend */}
        {activeTab === 'trend' && isCustomTrend && (
          <div className='flex flex-wrap items-center gap-2 pt-2 text-xs'>
            <span className='font-medium text-muted-foreground'>Rentang Kustom:</span>
            <input
              type='date'
              value={customTrendStart}
              onChange={(e) => setCustomTrendStart(e.target.value)}
              className='rounded-md border border-input bg-background px-2 py-0.5 text-xs'
            />
            <span className='text-muted-foreground'>s/d</span>
            <input
              type='date'
              value={customTrendEnd}
              onChange={(e) => setCustomTrendEnd(e.target.value)}
              className='rounded-md border border-input bg-background px-2 py-0.5 text-xs'
            />
            <Button
              size='sm'
              variant='secondary'
              className='h-6 text-xs px-2'
              onClick={() => fetchTrend()}
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
                <p className='font-medium'>Belum ada data kelas untuk kegiatan ini.</p>
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
                            tidakHadir: number
                            percentage: number
                          }
                          if (!item) return null

                          return (
                            <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-2 min-w-[200px]'>
                              <div className='font-semibold border-b pb-1.5 flex items-center justify-between'>
                                <span>{item.className}</span>
                                <Badge
                                  variant='outline'
                                  className={
                                    item.percentage >= 80
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : item.percentage >= 60
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
                                    <CheckCircle2 className='h-3 w-3' /> Hadir
                                  </span>
                                  <span className='font-mono font-bold'>{item.hadir} siswa</span>
                                </div>
                                <div className='flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <XCircle className='h-3 w-3' /> Belum Hadir
                                  </span>
                                  <span className='font-mono font-bold'>{item.tidakHadir} siswa</span>
                                </div>
                                <div className='flex items-center justify-between border-t pt-1 text-muted-foreground'>
                                  <span className='flex items-center gap-1.5'>
                                    <Users className='h-3 w-3' /> Total Siswa
                                  </span>
                                  <span className='font-mono font-semibold'>{item.total}</span>
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
                            name='Hadir'
                            fill='#10b981'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                          />
                          <Bar
                            dataKey='tidakHadir'
                            name='Belum Hadir'
                            fill='#f43f5e'
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
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
                                entry.percentage >= 80
                                  ? '#10b981'
                                  : entry.percentage >= 60
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
                      <div className='text-[11px] text-muted-foreground'>Total Kelas</div>
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
                          dashboardData.totalStudents > 0
                            ? ((Number(data.value) / dashboardData.totalStudents) * 100).toFixed(1)
                            : 0
                        return (
                          <div className='rounded-lg border bg-background/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[150px]'>
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
                    {dashboardData.attendanceRate}%
                  </span>
                  <span className='text-[11px] font-medium text-muted-foreground uppercase tracking-wide'>
                    Kehadiran
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className='flex items-center gap-4 text-xs mt-1'>
                <div className='flex items-center gap-1.5'>
                  <span className='h-3 w-3 rounded-full bg-emerald-500' />
                  <span className='font-medium text-muted-foreground'>Hadir ({dashboardData.attendedCount})</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='h-3 w-3 rounded-full bg-rose-500' />
                  <span className='font-medium text-muted-foreground'>Tidak Hadir ({dashboardData.unattendedCount})</span>
                </div>
              </div>
            </div>

            {/* Breakdown Information Details */}
            <div className='md:col-span-7 space-y-4'>
              <div className='rounded-xl border bg-muted/30 p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-sm font-semibold flex items-center gap-1.5'>
                    <Award className='h-4 w-4 text-primary' /> Status Evaluasi Partisipasi
                  </h4>
                  <Badge
                    variant='outline'
                    className={
                      dashboardData.attendanceRate >= 85
                        ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : dashboardData.attendanceRate >= 70
                          ? 'border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : dashboardData.attendanceRate >= 50
                            ? 'border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'border-rose-500/50 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }
                  >
                    Kategori: {dashboardData.performanceLabel}
                  </Badge>
                </div>

                <p className='text-xs leading-relaxed text-muted-foreground'>
                  Dari total <strong className='text-foreground'>{dashboardData.totalStudents} siswa</strong> terdaftar
                  pada kegiatan <strong className='text-foreground'>{dashboardData.currentEvent?.name}</strong>,
                  sebanyak <strong className='text-emerald-600 dark:text-emerald-400'>{dashboardData.attendedCount} siswa</strong> telah
                  melakukan presensi dan <strong className='text-rose-600 dark:text-rose-400'>{dashboardData.unattendedCount} siswa</strong> belum
                  tercatat hadir.
                </p>

                {/* Progress Bar */}
                <div className='space-y-1.5 pt-1'>
                  <div className='flex justify-between text-xs font-semibold'>
                    <span className='text-emerald-600 dark:text-emerald-400'>
                      {dashboardData.attendanceRate}% Tercapai
                    </span>
                    <span className='text-rose-600 dark:text-rose-400'>
                      {(100 - dashboardData.attendanceRate).toFixed(1)}% Belum
                    </span>
                  </div>
                  <div className='h-3 w-full rounded-full bg-rose-200 dark:bg-rose-950/60 overflow-hidden flex'>
                    <div
                      className='bg-emerald-500 h-full transition-all duration-500 rounded-l-full'
                      style={{ width: `${dashboardData.attendanceRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Key Metrics Grid */}
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs'>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Total Terdaftar</div>
                  <div className='text-base font-bold font-mono'>{dashboardData.totalStudents} Siswa</div>
                </div>
                <div className='p-2.5 rounded-lg border bg-background space-y-1'>
                  <div className='text-muted-foreground text-[11px]'>Hadir Terkonfirmasi</div>
                  <div className='text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono'>
                    {dashboardData.attendedCount} Siswa
                  </div>
                </div>
                <div className='p-2.5 rounded-lg border bg-background space-y-1 col-span-2 sm:col-span-1'>
                  <div className='text-muted-foreground text-[11px]'>Belum Presensi</div>
                  <div className='text-base font-bold text-rose-600 dark:text-rose-400 font-mono'>
                    {dashboardData.unattendedCount} Siswa
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIMELINE KEDATANGAN (HOUR/TIME BRACKET DISTRIBUTION) */}
        {activeTab === 'timeline' && (
          <div className='space-y-4'>
            {timelineData.length === 0 ? (
              <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
                <Clock className='h-10 w-10 text-muted-foreground/40 mb-2' />
                <p className='font-medium'>Belum ada siswa yang melakukan presensi tap untuk kegiatan ini.</p>
                <p className='text-xs text-muted-foreground/80 mt-1'>
                  Data waktu kedatangan akan muncul otomatis seiring siswa melakukan tap kartu RFID atau barcode di kiosk.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <Clock className='h-4 w-4 text-primary' />
                    <span>Distribusi frekuensi kedatangan siswa per interval waktu 15 menit:</span>
                  </div>

                  {peakTimelineStat && (
                    <Badge variant='outline' className='bg-primary/5 text-primary border-primary/30'>
                      🔥 Puncak Kedatangan: {peakTimelineStat.time} ({peakTimelineStat.count} Siswa)
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
                        <linearGradient id='colorTapCount' x1='0' y1='0' x2='0' y2='1'>
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
                            cumulative: number
                          }
                          if (!item) return null

                          return (
                            <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5 min-w-[180px]'>
                              <div className='font-semibold border-b pb-1'>
                                Waktu: {item.time}
                              </div>
                              <div className='flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium'>
                                <span>Presensi di Jam Ini:</span>
                                <span className='font-mono font-bold'>{item.count} siswa</span>
                              </div>
                              <div className='flex justify-between items-center text-muted-foreground pt-1 border-t'>
                                <span>Total Akumulatif:</span>
                                <span className='font-mono font-bold text-foreground'>{item.cumulative} siswa</span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type='monotone'
                        dataKey='count'
                        name='Jumlah Tap'
                        stroke='#10b981'
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill='url(#colorTapCount)'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t'>
                  <span>
                    Total presensi tercatat: <strong className='text-foreground'>{dashboardData.attendedCount} siswa</strong>
                  </span>
                  <span>
                    Tanggal Kegiatan: <strong className='text-foreground'>{dashboardData.dateFormatted}</strong>
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
                <span>Memuat tren kegiatan...</span>
              </div>
            ) : trendData.length === 0 ? (
              <div className='flex h-[320px] flex-col items-center justify-center text-muted-foreground text-sm'>
                <Calendar className='h-10 w-10 text-muted-foreground/40 mb-2' />
                <p className='font-medium'>Belum ada riwayat presensi multi-hari untuk kegiatan ini.</p>
                <p className='text-xs text-muted-foreground/80 mt-1'>
                  Riwayat tren akan otomatis tercatat setiap kegiatan ini diselenggarakan.
                </p>
              </div>
            ) : (
              <div className='w-full'>
                <div className='h-[320px] w-full'>
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
                          const row = payload[0]?.payload as EventTrendPoint
                          if (!row) return null

                          return (
                            <div className='rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-2 min-w-[200px]'>
                              <div className='font-semibold border-b pb-1.5 flex items-center justify-between'>
                                <span>{label}</span>
                                <Badge variant='outline' className='text-[10px] font-mono'>
                                  {row.attendanceRate}% Partisipasi
                                </Badge>
                              </div>
                              <div className='space-y-1 pt-0.5'>
                                <div className='flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='h-3 w-3' /> Hadir
                                  </span>
                                  <span className='font-mono font-bold'>{row.hadir}</span>
                                </div>
                                <div className='flex items-center justify-between text-rose-600 dark:text-rose-400 font-medium'>
                                  <span className='flex items-center gap-1.5'>
                                    <XCircle className='h-3 w-3' /> Tidak Hadir
                                  </span>
                                  <span className='font-mono font-bold'>{row.tidakHadir}</span>
                                </div>
                                <div className='flex items-center justify-between border-t pt-1 text-muted-foreground'>
                                  <span className='flex items-center gap-1.5'>
                                    <Users className='h-3 w-3' /> Total Terdaftar
                                  </span>
                                  <span className='font-mono font-semibold'>{row.totalSiswa}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      />
                      {visibleTrendLines.hadir && (
                        <Line
                          type='monotone'
                          dataKey='hadir'
                          name='Hadir'
                          stroke='#10b981'
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleTrendLines.tidakHadir && (
                        <Line
                          type='monotone'
                          dataKey='tidakHadir'
                          name='Tidak Hadir'
                          stroke='#f43f5e'
                          strokeWidth={2}
                          strokeDasharray='4 4'
                          dot={{ r: 3, fill: '#f43f5e' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleTrendLines.rate && (
                        <Line
                          type='monotone'
                          dataKey='attendanceRate'
                          name='Tingkat Partisipasi (%)'
                          stroke='#3b82f6'
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#3b82f6' }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
