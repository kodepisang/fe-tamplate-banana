/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AnalyticsChart } from './analytics-chart'
import api from '@/lib/api'
import { Loader2 } from 'lucide-react'

export function Analytics() {
  const [data, setData] = useState<{ daily: any[], monthly: any[], subjects: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/analytics/dashboard')
        if (res.data.success) {
          setData(res.data.data)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch analytics', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!data) return <div>Failed to load analytics</div>

  // Calculate some summary metrics
  const todayStat = data.daily.length > 0 ? data.daily[data.daily.length - 1] : { percentage: 0 };
  const prevDayStat = data.daily.length > 1 ? data.daily[data.daily.length - 2] : { percentage: 0 };
  const todayTrend = todayStat.percentage - prevDayStat.percentage;

  const currentMonthStat = data.monthly.length > 0 ? data.monthly[data.monthly.length - 1] : { percentage: 0 };

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Kehadiran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{todayStat.percentage}%</div>
            <p className='text-xs text-muted-foreground'>
              {todayTrend >= 0 ? '+' : ''}{todayTrend}% vs hari sebelumnya
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Kehadiran Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{currentMonthStat?.percentage || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Tren Kehadiran (7 Hari Terakhir)</CardTitle>
            <CardDescription>Persentase kehadiran harian</CardDescription>
          </CardHeader>
          <CardContent className='px-6'>
            <AnalyticsChart data={data.daily} />
          </CardContent>
        </Card>

        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Berdasarkan Mata Pelajaran</CardTitle>
            <CardDescription>Persentase kehadiran tiap mata pelajaran</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={data.subjects.map(s => ({ name: s.subject, value: s.percentage }))}
              barClass='bg-primary'
              valueFormatter={(n) => `${n}%`}
            />
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Tren Bulanan</CardTitle>
            <CardDescription>Kehadiran rata-rata per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={data.monthly.map(m => ({ name: m.month, value: m.percentage }))}
              barClass='bg-muted-foreground'
              valueFormatter={(n) => `${n}%`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SimpleBarList({
  items,
  valueFormatter,
  barClass,
}: {
  items: { name: string; value: number }[]
  valueFormatter: (n: number) => string
  barClass: string
}) {
  const max = 100 // Since we are dealing with percentages
  return (
    <ul className='space-y-3'>
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 truncate text-xs text-muted-foreground'>
                {i.name}
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{ width }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
