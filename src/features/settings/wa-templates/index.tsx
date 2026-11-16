import { useEffect, useState, type ElementType } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Save, Sparkles, CheckCircle2, AlertTriangle, LogOut, Calendar } from 'lucide-react'

export interface WaTemplateItem {
  id: number | null
  type: string
  template: string
  isActive: boolean
}

const TEMPLATE_CONFIGS: Record<string, { label: string; description: string; icon: ElementType; tags: string[] }> = {
  CHECKIN: {
    label: 'Absen Masuk',
    description: 'Format pesan yang dikirimkan saat siswa tap absensi masuk gerbang tepat waktu',
    icon: CheckCircle2,
    tags: ['nama', 'kelas', 'tanggal', 'waktu', 'sekolah'],
  },
  LATE: {
    label: 'Absen Terlambat',
    description: 'Format pesan yang dikirimkan saat siswa tap absensi masuk lewat dari toleransi',
    icon: AlertTriangle,
    tags: ['nama', 'kelas', 'tanggal', 'waktu', 'sekolah'],
  },
  CHECKOUT: {
    label: 'Absen Pulang',
    description: 'Format pesan yang dikirimkan saat siswa tap absensi jam kepulangan',
    icon: LogOut,
    tags: ['nama', 'kelas', 'tanggal', 'waktu', 'sekolah'],
  },
  EVENT: {
    label: 'Presensi Kegiatan / Event',
    description: 'Format pesan yang dikirimkan saat siswa tap di Kiosk Presensi Kegiatan (Sholat Dhuha, Ekstrakurikuler, dll)',
    icon: Calendar,
    tags: ['nama', 'kelas', 'kegiatan', 'tanggal', 'waktu', 'sekolah'],
  },
}

export function SettingsWaTemplates() {
  const [templates, setTemplates] = useState<WaTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('CHECKIN')

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await api.get('/whatsapp/templates')
      if (res.data.success) {
        setTemplates(res.data.data)
      }
    } catch (_err) {
      toast.error('Gagal mengambil template pesan WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates()
  }, [])

  const currentTemplate = templates.find((t) => t.type === activeTab) || {
    id: null,
    type: activeTab,
    template: '',
    isActive: true,
  }

  const handleTemplateChange = (type: string, newText: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.type === type ? { ...t, template: newText } : t))
    )
  }

  const handleToggleActive = (type: string, active: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.type === type ? { ...t, isActive: active } : t))
    )
  }

  const handleInsertTag = (type: string, tag: string) => {
    const currentText = currentTemplate.template
    const tagText = `{${tag}}`
    handleTemplateChange(type, currentText + tagText)
  }

  const handleSave = async (type: string) => {
    const item = templates.find((t) => t.type === type)
    if (!item) return

    try {
      setSavingType(type)
      const res = await api.put('/whatsapp/templates', {
        type: item.type,
        template: item.template,
        isActive: item.isActive,
      })
      if (res.data.success) {
        toast.success(`Template ${TEMPLATE_CONFIGS[type]?.label || type} berhasil disimpan!`)
        fetchTemplates()
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Gagal menyimpan template pesan')
    } finally {
      setSavingType(null)
    }
  }

  // Live preview parser
  const renderPreview = (text: string) => {
    let result = text || ''
    result = result.replace(/\{nama\}/gi, 'Bambang Oktaviah')
    result = result.replace(/\{kelas\}/gi, 'X TKR 1')
    result = result.replace(/\{tanggal\}/gi, 'Senin, 7 September 2026')
    result = result.replace(/\{waktu\}/gi, '07:15 WIB')
    result = result.replace(/\{kegiatan\}/gi, 'Sholat Dhuha Berjamaah')
    result = result.replace(/\{sekolah\}/gi, 'SMK ISLAM SULTAN AGUNG KALINYAMATAN')
    return result
  }

  return (
    <div className='p-6 space-y-6 max-w-5xl mx-auto'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Format Template Pesan WhatsApp</h1>
        <p className='text-sm text-muted-foreground'>
          Atur format pesan notifikasi WhatsApp otomatis yang dikirimkan ke orang tua/wali murid saat siswa tap absensi.
        </p>
      </div>

      {loading ? (
        <div className='text-center py-12 text-sm text-muted-foreground'>Memuat template pesan...</div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
          <TabsList className='grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1 bg-muted/60'>
            {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => {
              const Icon = config.icon
              return (
                <TabsTrigger key={key} value={key} className='py-2.5 text-xs font-semibold gap-2 flex items-center justify-center'>
                  <Icon className='h-3.5 w-3.5' />
                  <span>{config.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => {
            const item = templates.find((t) => t.type === key) || {
              id: null,
              type: key,
              template: '',
              isActive: true,
            }
            return (
              <TabsContent key={key} value={key} className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-12 gap-6'>
                  {/* Editor Column */}
                  <Card className='md:col-span-7 shadow-sm'>
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <div>
                          <CardTitle className='text-lg font-bold flex items-center gap-2'>
                            <MessageSquare className='h-5 w-5 text-emerald-500' />
                            Format Pesan: {config.label}
                          </CardTitle>
                          <CardDescription className='text-xs mt-1'>{config.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='flex items-center justify-between p-3 border rounded-xl bg-muted/20'>
                        <div className='space-y-0.5'>
                          <Label className='text-xs font-bold'>Aktifkan Pengiriman Notifikasi ini</Label>
                          <p className='text-[11px] text-muted-foreground'>Jika non-aktif, WA jenis ini tidak akan dikirim</p>
                        </div>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={(c) => handleToggleActive(key, c)}
                        />
                      </div>

                      <div className='space-y-2'>
                        <Label className='text-xs font-semibold'>Sisipkan Tag Dinamis (Klik untuk menambahkan):</Label>
                        <div className='flex flex-wrap gap-1.5'>
                          {config.tags.map((tag) => (
                            <Button
                              key={tag}
                              type='button'
                              variant='secondary'
                              size='sm'
                              className='h-7 text-[11px] font-mono gap-1 hover:bg-emerald-500/20 hover:text-emerald-600 transition-colors'
                              onClick={() => handleInsertTag(key, tag)}
                            >
                              <Sparkles className='h-3 w-3 text-emerald-500' />
                              {`{${tag}}`}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold'>Teks Pesan WhatsApp *</Label>
                        <Textarea
                          value={item.template}
                          onChange={(e) => handleTemplateChange(key, e.target.value)}
                          rows={8}
                          className='font-mono text-xs leading-relaxed resize-y'
                          placeholder='Masukkan template pesan WA...'
                        />
                      </div>

                      <div className='flex justify-end gap-2 pt-2'>
                        <Button
                          onClick={() => handleSave(key)}
                          disabled={savingType === key}
                          className='gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md'
                        >
                          <Save className='h-4 w-4' />
                          {savingType === key ? 'Menyimpan...' : 'Simpan Format Template'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Column */}
                  <Card className='md:col-span-5 shadow-sm border-emerald-500/20 bg-linear-to-b from-emerald-500/5 to-transparent'>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2'>
                        💬 Pratinjau Tampilan Pesan WA Orang Tua
                      </CardTitle>
                      <CardDescription className='text-xs'>Simulasi pesan yang diterima wali murid di WhatsApp</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='rounded-2xl bg-[#efeae2] dark:bg-[#0b141a] p-4 font-sans text-xs text-[#111b21] dark:text-[#e9edef] shadow-inner space-y-2 border border-slate-300 dark:border-slate-800'>
                        <div className='bg-white dark:bg-[#202c33] p-3.5 rounded-xl shadow-xs space-y-2 whitespace-pre-wrap font-mono leading-normal border-l-4 border-l-emerald-500'>
                          {renderPreview(item.template) || (
                            <span className='italic text-slate-400'>Format pesan masih kosong...</span>
                          )}
                        </div>
                        <div className='text-[10px] text-slate-500 dark:text-slate-400 text-right pr-1'>
                          07:15 • Dikirim via WhatsApp Gateway
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
