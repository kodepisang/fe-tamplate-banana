import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomDialog } from '@/components/custom-dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import api from '@/lib/api'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { id } from 'date-fns/locale'

type CalendarConfigData = {
  date: string
  isHoliday: boolean
  description: string | null
  attendanceSettingId: number | null
  attendanceSetting: { name: string } | null
  overrides?: Array<{
    id: number
    class?: { name: string }
    isHoliday: boolean
    description?: string
    attendanceSetting?: { name: string }
  }>
}

type AttendanceSetting = {
  id: number
  name: string
}

export function CalendarSettings() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [configs, setConfigs] = useState<CalendarConfigData[]>([])
  const [settings, setSettings] = useState<AttendanceSetting[]>([])
  const [classes, setClasses] = useState<{id: number, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isEditDateOpen, setIsEditDateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // For Edit
  const [editData, setEditData] = useState<{isHoliday: boolean, attendanceSettingId: number | null, description: string}>({ isHoliday: false, attendanceSettingId: null, description: '' })
  const [overrideData, setOverrideData] = useState<{classId: number | null, isHoliday: boolean, attendanceSettingId: number | null, description: string}>({ classId: null, isHoliday: false, attendanceSettingId: null, description: '' })
  
  // For Generate
  const [generatePattern, setGeneratePattern] = useState<Record<string, number | boolean | null>>({
    mondaySettingId: null, tuesdaySettingId: null, wednesdaySettingId: null, 
    thursdaySettingId: null, fridaySettingId: null, 
    saturdayHoliday: true, saturdaySettingId: null,
    sundayHoliday: true, sundaySettingId: null,
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const fetchSettingsAndClasses = async () => {
    try {
      const [resSettings, resClasses] = await Promise.all([
        api.get('/attendance/settings'),
        api.get('/classes')
      ])
      if (resSettings.data.success) {
        setSettings(resSettings.data.data)
      }
      if (resClasses.data.success) {
        setClasses(resClasses.data.data)
      }
    } catch (_err) {
      toast.error('Gagal memuat data pendukung kalender')
    }
  }

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/calendar-configs?year=${year}&month=${month}`)
      if (res.data.success) {
        setConfigs(res.data.data)
      }
    } catch (_error) {
      toast.error('Gagal memuat konfigurasi kalender')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettingsAndClasses()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/calendar-configs/generate', {
        year, month, pattern: generatePattern
      })
      toast.success('Kalender berhasil di-generate')
      setIsGenerateOpen(false)
      fetchConfigs()
    } catch (_err) {
      toast.error('Gagal generate kalender')
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate) return
    try {
      // API expects YYYY-MM-DD
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await api.put(`/calendar-configs/${dateStr}`, editData)
      toast.success('Tanggal berhasil diubah')
      setIsEditDateOpen(false)
      fetchConfigs()
    } catch (_err) {
      toast.error('Gagal mengubah tanggal')
    }
  }

  const prevMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const nextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  // To draw a grid, we need offset
  const startDay = getDay(startOfMonth(currentDate)) // 0 (Sun) to 6 (Sat)
  // Let's just do Sunday start for simplicity
  const emptyDaysSun = Array.from({ length: startDay }, (_, i) => i)

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Konfigurasi Kalender Absensi</h2>
            <p className='text-muted-foreground'>
              Atur jam absensi per hari dan tentukan hari libur.
            </p>
          </div>
          <Button onClick={() => setIsGenerateOpen(true)}>Generate Bulan Ini</Button>
        </div>

        <div className="flex items-center justify-between mb-4 mt-4 bg-white p-4 rounded-lg shadow-sm border">
          <Button variant="outline" onClick={prevMonth}>&lt; Bulan Sebelumnya</Button>
          <h3 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy', { locale: id })}</h3>
          <Button variant="outline" onClick={nextMonth}>Bulan Selanjutnya &gt;</Button>
        </div>

        {loading ? (
          <div className="text-center py-10">Memuat...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
              <div key={d} className="text-center font-semibold p-2 bg-gray-100 rounded">{d}</div>
            ))}
            {emptyDaysSun.map(d => <div key={`empty-${d}`} className="p-2"></div>)}
            {daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd')
              const config = configs.find(c => format(new Date(c.date), 'yyyy-MM-dd') === dateStr)
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

              return (
                <div 
                  key={dateStr} 
                  className={`border rounded p-2 h-24 flex flex-col justify-between cursor-pointer hover:bg-gray-50 transition-colors ${config?.isHoliday ? 'bg-red-50 border-red-200' : ''} ${isToday ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => {
                    setSelectedDate(date)
                    setEditData({
                      isHoliday: config?.isHoliday || false,
                      attendanceSettingId: config?.attendanceSettingId || null,
                      description: config?.description || ''
                    })
                    setIsEditDateOpen(true)
                  }}
                >
                  <div className={`font-bold ${config?.isHoliday ? 'text-red-500' : ''}`}>{format(date, 'd')}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {config?.isHoliday ? (config.description || 'Libur') : (config?.attendanceSetting?.name || 'Belum diatur')}
                  </div>
                  {config?.overrides && config.overrides.length > 0 && (
                    <div className="text-[10px] mt-1 bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded w-fit">
                      Ada {config.overrides.length} Pengecualian
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Main>

      <CustomDialog
        open={isEditDateOpen}
        onOpenChange={setIsEditDateOpen}
        title={`Edit Tanggal ${selectedDate ? format(selectedDate, 'dd MMMM yyyy', { locale: id }) : ''}`}
        description="Atur apakah hari ini libur atau gunakan pengaturan jam tertentu."
      >
        <form onSubmit={handleEditSave} className='space-y-4 max-h-[70vh] overflow-y-auto px-1'>
          <div className="border-b pb-4">
            <h4 className="font-semibold mb-2">Pengaturan Global</h4>
            <div className='flex items-center space-x-2 pt-2 pb-4'>
              <Switch
                id='isHoliday'
                checked={editData.isHoliday}
                onCheckedChange={checked => setEditData({ ...editData, isHoliday: checked })}
              />
              <Label htmlFor='isHoliday'>Tandai sebagai Hari Libur</Label>
            </div>

            {editData.isHoliday ? (
              <div className='grid gap-2'>
                <Label htmlFor='description'>Keterangan Libur</Label>
                <Input 
                  id='description' 
                  placeholder="Misal: Libur Nasional" 
                  value={editData.description} 
                  onChange={e => setEditData({ ...editData, description: e.target.value })} 
                />
              </div>
            ) : (
              <div className='grid gap-2'>
                <Label>Pengaturan Jam Absensi</Label>
                <Select 
                  value={editData.attendanceSettingId?.toString() || ''} 
                  onValueChange={(v) => setEditData({ ...editData, attendanceSettingId: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pengaturan" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className='flex justify-end gap-2 pt-4'>
              <Button type='button' variant='outline' onClick={() => setIsEditDateOpen(false)}>Batal</Button>
              <Button type='submit'>Simpan Global</Button>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-semibold mb-2">Pengecualian Kelas</h4>
            <p className="text-xs text-muted-foreground mb-4">Tambahkan pengaturan khusus atau ijin libur/pulang awal hanya untuk kelas tertentu di hari ini.</p>
            
            <div className="bg-gray-50 p-3 rounded border space-y-3 mb-4">
              <div className="grid gap-2">
                <Label>Pilih Kelas</Label>
                <Select value={overrideData.classId?.toString() || ''} onValueChange={(v) => setOverrideData({...overrideData, classId: parseInt(v)})}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center space-x-2 pt-2'>
                <Switch
                  checked={overrideData.isHoliday}
                  onCheckedChange={checked => setOverrideData({ ...overrideData, isHoliday: checked })}
                />
                <Label>Libur / Tidak ada jam masuk?</Label>
              </div>
              {overrideData.isHoliday ? (
                <div className='grid gap-2'>
                  <Label>Keterangan</Label>
                  <Input value={overrideData.description} onChange={e => setOverrideData({...overrideData, description: e.target.value})} placeholder="Misal: Ijin Pulang Cepat" />
                </div>
              ) : (
                <div className='grid gap-2'>
                  <Label>Pengaturan Jam Khusus</Label>
                  <Select value={overrideData.attendanceSettingId?.toString() || ''} onValueChange={(v) => setOverrideData({...overrideData, attendanceSettingId: parseInt(v)})}>
                    <SelectTrigger><SelectValue placeholder="Pilih Pengaturan" /></SelectTrigger>
                    <SelectContent>
                      {settings.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button 
                type="button" 
                size="sm" 
                className="w-full"
                onClick={async () => {
                  if (!overrideData.classId || (!overrideData.isHoliday && !overrideData.attendanceSettingId)) {
                    return toast.error('Lengkapi data pengecualian kelas')
                  }
                  if (!selectedDate) return
                  const dateStr = format(selectedDate, 'yyyy-MM-dd')
                  try {
                    await api.post(`/calendar-configs/${dateStr}/overrides`, overrideData)
                    toast.success('Pengecualian berhasil ditambahkan')
                    setOverrideData({ classId: null, isHoliday: false, attendanceSettingId: null, description: '' })
                    fetchConfigs()
                  } catch (_e: unknown) {
                    toast.error('Gagal menambah pengecualian')
                  }
                }}
              >
                Tambah Pengecualian
              </Button>
            </div>

            {/* List Overrides */}
            {selectedDate && (() => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd')
              const config = configs.find(c => format(new Date(c.date), 'yyyy-MM-dd') === dateStr)
              const overrides = config?.overrides || []
              if (overrides.length === 0) return <div className="text-sm text-gray-500">Belum ada pengecualian kelas.</div>
              
              return (
                <div className="space-y-2">
                  {overrides.map((o) => (
                    <div key={o.id} className="flex justify-between items-center bg-white p-2 border rounded text-sm">
                      <div>
                        <span className="font-bold">{o.class?.name}</span>:{' '}
                        {o.isHoliday ? <span className="text-red-500">{o.description || 'Libur'}</span> : <span className="text-blue-600">{o.attendanceSetting?.name}</span>}
                      </div>
                      <Button variant="destructive" size="sm" onClick={async () => {
                        try {
                          await api.delete(`/calendar-configs/overrides/${o.id}`)
                          toast.success('Dihapus')
                          fetchConfigs()
                        } catch (_e: unknown) {
                          toast.error('Gagal hapus')
                        }
                      }}>Hapus</Button>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </form>
      </CustomDialog>

      <CustomDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        title={`Generate Konfigurasi ${format(currentDate, 'MMMM yyyy', { locale: id })}`}
        description="Pilih default pengaturan untuk setiap harinya dalam bulan ini."
      >
        <form onSubmit={handleGenerate} className='space-y-4 max-h-[60vh] overflow-y-auto px-1'>
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day, idx) => {
            const keys = ['mondaySettingId', 'tuesdaySettingId', 'wednesdaySettingId', 'thursdaySettingId', 'fridaySettingId']
            const key = keys[idx]
            return (
              <div key={day} className='grid gap-2'>
                <Label>{day}</Label>
                <Select 
                  value={generatePattern[key]?.toString() || ''} 
                  onValueChange={(v) => setGeneratePattern({ ...generatePattern, [key]: parseInt(v) })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Pilih Pengaturan" /></SelectTrigger>
                  <SelectContent>
                    {settings.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
          
          <div className="pt-4 border-t mt-4">
            <h4 className="font-semibold mb-2">Akhir Pekan</h4>
            
            <div className="space-y-4">
              <div className="p-3 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <Label>Sabtu</Label>
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs">Libur?</Label>
                    <Switch 
                      checked={Boolean(generatePattern.saturdayHoliday)} 
                      onCheckedChange={c => setGeneratePattern({ ...generatePattern, saturdayHoliday: c })} 
                    />
                  </div>
                </div>
                {!generatePattern.saturdayHoliday && (
                  <Select 
                    value={generatePattern.saturdaySettingId?.toString() || ''} 
                    onValueChange={(v) => setGeneratePattern({ ...generatePattern, saturdaySettingId: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih Pengaturan (Jika tidak libur)" /></SelectTrigger>
                    <SelectContent>
                      {settings.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="p-3 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <Label>Minggu</Label>
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs">Libur?</Label>
                    <Switch 
                      checked={Boolean(generatePattern.sundayHoliday)} 
                      onCheckedChange={c => setGeneratePattern({ ...generatePattern, sundayHoliday: c })} 
                    />
                  </div>
                </div>
                {!generatePattern.sundayHoliday && (
                  <Select 
                    value={generatePattern.sundaySettingId?.toString() || ''} 
                    onValueChange={(v) => setGeneratePattern({ ...generatePattern, sundaySettingId: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih Pengaturan (Jika tidak libur)" /></SelectTrigger>
                    <SelectContent>
                      {settings.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-4 sticky bottom-0 bg-white py-2'>
            <Button type='button' variant='outline' onClick={() => setIsGenerateOpen(false)}>Batal</Button>
            <Button type='submit'>Generate</Button>
          </div>
        </form>
      </CustomDialog>
    </>
  )
}
