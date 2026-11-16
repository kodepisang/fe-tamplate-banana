import { useState, useEffect } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AttendanceInput() {
  const [classes, setClasses] = useState<Record<string, unknown>[]>([])
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([])
  const [students, setStudents] = useState<Record<string, unknown>[]>([])

  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1')
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [attendanceData, setAttendanceData] = useState<Record<number, string>>(
    {}
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isUpdateMode, setIsUpdateMode] = useState(false)

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [clsRes, subRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
        ])
        if (clsRes.data.success) setClasses(clsRes.data.data)
        if (subRes.data.success) setSubjects(subRes.data.data)
      } catch (_error) {
        toast.error('Gagal mengambil data kelas/mata pelajaran')
      }
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      async function fetchStudents() {
        setIsLoading(true)
        try {
          const res = await api.get('/users', {
            params: { classId: selectedClass, role: 'MURID' },
          })
          if (res.data.success) {
            const studentList = res.data.data
              .filter((u: Record<string, unknown>) => {
                const roles = (u.roles as Record<string, unknown>[]) || []
                const hasRole = roles.some(
                  (r) => r.name === 'SISWA' || r.name === 'MURID'
                )
                const profile = u.profile as Record<string, unknown> | null
                return hasRole && profile?.classId === parseInt(selectedClass)
              })
              .sort(
                (a: Record<string, unknown>, b: Record<string, unknown>) => {
                  const nameA = (a.name as string) || ''
                  const nameB = (b.name as string) || ''
                  return nameA.localeCompare(nameB)
                }
              )
            setStudents(studentList)

            const initialData: Record<number, string> = {}
            studentList.forEach((s: Record<string, unknown>) => {
              initialData[s.id as number] = 'HADIR'
            })
            setAttendanceData(initialData)
          }
        } catch (_error) {
          toast.error('Gagal mengambil data siswa')
        } finally {
          setIsLoading(false)
        }
      }
      fetchStudents()
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStudents([])
    }
  }, [selectedClass])

  // Check for existing attendance whenever filters or students change
  useEffect(() => {
    if (
      selectedClass &&
      selectedSubject &&
      selectedPeriod &&
      date &&
      students.length > 0
    ) {
      async function checkExisting() {
        try {
          const res = await api.get('/attendances/check', {
            params: {
              classId: selectedClass,
              subjectId: selectedSubject,
              period: selectedPeriod,
              date,
            },
          })
          if (res.data.success && res.data.data.length > 0) {
            setIsUpdateMode(true)
            const existingData: Record<number, string> = {}
            res.data.data.forEach((att: { userId: number; status: string }) => {
              existingData[att.userId] = att.status
            })
            setAttendanceData((prev) => ({ ...prev, ...existingData }))
          } else {
            setIsUpdateMode(false)
            const initialData: Record<number, string> = {}
            students.forEach((s: Record<string, unknown>) => {
              initialData[s.id as number] = 'HADIR'
            })
            setAttendanceData(initialData)
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Error checking existing attendance', e)
        }
      }
      checkExisting()
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsUpdateMode(false)
    }
  }, [selectedClass, selectedSubject, selectedPeriod, date, students])

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = async () => {
    if (!selectedClass || !selectedSubject || !date) {
      toast.error('Harap lengkapi semua filter')
      return
    }

    const payload = {
      classId: parseInt(selectedClass),
      subjectId: parseInt(selectedSubject),
      date,
      period: parseInt(selectedPeriod),
      attendances: Object.entries(attendanceData).map(
        ([studentId, status]) => ({
          studentId: parseInt(studentId),
          status,
          notes: '',
        })
      ),
    }

    setIsSubmitting(true)
    try {
      const res = await api.post('/attendances/mass-insert', payload)
      if (res.data.success) {
        toast.success(
          isUpdateMode
            ? 'Berhasil memperbarui data kehadiran'
            : 'Berhasil menyimpan data kehadiran'
        )
        setIsUpdateMode(true) // Switch to update mode after successful insert
      }
    } catch (error) {
      const err = error as Error & {
        response?: { data?: { message?: string } }
      }
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Gagal menyimpan kehadiran'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='p-6'>
      <div className='mb-4 flex items-center space-x-2'>
        <CheckSquare className='h-6 w-6' />
        <h1 className='text-2xl font-bold tracking-tight'>
          Input Kehadiran Mandiri
        </h1>
      </div>
      <p className='mb-6 text-muted-foreground'>
        Pilih kelas, mata pelajaran, dan tanggal untuk mengisi kehadiran siswa.
      </p>

      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Filter Pengaturan</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-4'>
          <div className='space-y-2'>
            <Label>Kelas</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder='Pilih Kelas...' />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem
                    key={c.id as number}
                    value={(c.id as number).toString()}
                  >
                    {c.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Mata Pelajaran</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder='Pilih Mata Pelajaran...' />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem
                    key={s.id as number}
                    value={(s.id as number).toString()}
                  >
                    {s.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Jam Ke-berapa</Label>
            <Input
              type='number'
              min='1'
              max='15'
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label>Tanggal</Label>
            <Input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Siswa</CardTitle>
            <CardDescription>
              Tandai status kehadiran setiap siswa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex justify-center p-4'>
                <Loader2 className='h-6 w-6 animate-spin' />
              </div>
            ) : students.length > 0 ? (
              <div className='space-y-4'>
                {students.map((student) => {
                  const profile = (student.profile as Record<string, unknown> | null)
                  const avatarUrl = profile?.avatarUrl as string | undefined
                  const nomorInduk = profile?.nomorInduk as string | undefined
                  return (
                    <div
                      key={student.id as number}
                      className='flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm last:border-0 sm:flex-row sm:items-center sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:p-0 sm:py-4 sm:shadow-none'
                    >
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10 border border-border shadow-xs'>
                          <AvatarImage src={avatarUrl || ''} className='object-cover' />
                          <AvatarFallback className='text-xs font-bold bg-muted text-muted-foreground'>
                            {((student.name as string) || 'SW').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='text-base leading-tight font-semibold wrap-break-word sm:text-sm sm:font-medium'>
                            {student.name as string}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {nomorInduk ? `NIS: ${nomorInduk}` : '-'}
                          </div>
                        </div>
                      </div>
                      <div className='grid w-full grid-cols-4 gap-1 sm:flex sm:w-auto sm:gap-2'>
                      {['HADIR', 'SAKIT', 'IZIN', 'ALPA'].map((status) => (
                        <Button
                          key={status}
                          size='sm'
                          variant={
                            attendanceData[student.id as number] === status
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() =>
                            handleStatusChange(student.id as number, status)
                          }
                          className={cn(
                            'h-8 w-full px-0 text-[10px] sm:h-9 sm:w-auto sm:px-3 sm:text-sm',
                            attendanceData[student.id as number] === status
                              ? status === 'HADIR'
                                ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                                : status === 'SAKIT'
                                  ? 'border-yellow-600 bg-yellow-600 text-white hover:bg-yellow-700'
                                  : status === 'IZIN'
                                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                    : 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                              : ''
                          )}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                )})}

                <div className='flex justify-end pt-4'>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedSubject}
                    className={cn(
                      isUpdateMode
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : ''
                    )}
                  >
                    {isSubmitting && (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    )}
                    {isUpdateMode ? 'Update Kehadiran' : 'Simpan Kehadiran'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='p-4 text-center text-muted-foreground'>
                Tidak ada siswa di kelas ini.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
