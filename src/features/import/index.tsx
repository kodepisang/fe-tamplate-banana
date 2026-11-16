import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react'

export default function ImportData() {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih file terlebih dahulu')
      return
    }
    if (!type) {
      toast.error('Pilih tipe data terlebih dahulu')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    setIsLoading(true)
    try {
      const response = await api.post('/upload/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        toast.success('Data berhasil diimpor')
        setFile(null)
      } else {
        toast.error(response.data.message || 'Gagal mengimpor data')
      }
    } catch (error) {
      const err = error as Error & { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || err.message || 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    if (!type) {
      toast.error('Pilih tipe data terlebih dahulu untuk mendownload template')
      return
    }
    
    try {
      setIsLoading(true)
      const response = await api.get(`/upload/template?type=${type}`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `template_${type}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Template berhasil diunduh')
    } catch (_error) {
      toast.error('Gagal mengunduh template')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='p-6'>
      <div className='mb-4 flex items-center space-x-2'>
        <FileSpreadsheet className='h-6 w-6' />
        <h1 className='text-2xl font-bold tracking-tight'>Upload Data Master</h1>
      </div>
      <p className='mb-6 text-muted-foreground'>
        Upload file Excel (.xlsx) atau CSV untuk memasukkan data secara massal.
      </p>

      <Card className='max-w-md'>
        <CardHeader>
          <CardTitle>Form Upload</CardTitle>
          <CardDescription>Pilih tipe data dan file untuk diunggah.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Tipe Data</Label>
            <div className='flex gap-2'>
              <div className='flex-1'>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder='Pilih Tipe Data...' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='students'>Siswa</SelectItem>
                    <SelectItem value='teachers'>Guru</SelectItem>
                    <SelectItem value='subjects'>Mata Pelajaran</SelectItem>
                    <SelectItem value='classes'>Kelas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant='outline' onClick={handleDownloadTemplate} disabled={!type || isLoading} type='button'>
                Download Template
              </Button>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>File Upload (Excel/CSV)</Label>
            <Input type='file' accept='.xlsx, .xls, .csv' onChange={handleFileChange} />
          </div>

          <Button onClick={handleUpload} disabled={isLoading || !file || !type} className='w-full'>
            {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
            {isLoading ? 'Memproses...' : 'Unggah Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
