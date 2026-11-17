import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { analyzeDeliveryFailure } from './failure-analysis'
import type { WaLog } from '../index'

export function exportFailedWaLogsPdf(failedLogs: WaLog[]) {
  if (!failedLogs || failedLogs.length === 0) {
    throw new Error('Tidak ada data log gagal untuk diekspor.')
  }

  // Gunakan orientasi landscape agar kolom muat dengan jelas dan rapi
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.width
  const now = new Date()
  const dateFormatted = format(now, 'dd MMMM yyyy HH:mm:ss', { locale: localeId })

  // 1. KOP SURAT LAPORAN RESMI
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text('SISTEM INFORMASI PRESENSI & NOTIFIKASI WALI MURID', pageWidth / 2, 14, {
    align: 'center',
  })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(
    'LAPORAN REKAPITULASI & ANALISIS KEGAGALAN PENGIRIMAN WHATSAPP',
    pageWidth / 2,
    20,
    { align: 'center' }
  )

  // Double divider line
  doc.setDrawColor(185, 28, 28) // red-700
  doc.setLineWidth(0.8)
  doc.line(14, 24, pageWidth - 14, 24)
  doc.setDrawColor(203, 213, 225) // slate-300
  doc.setLineWidth(0.2)
  doc.line(14, 25.2, pageWidth - 14, 25.2)

  // 2. METADATA & RINGKASAN STATISTIK
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('INFORMASI LAPORAN:', 14, 31)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`Waktu Cetak       : ${dateFormatted}`, 14, 36)
  doc.text(`Total Pesan Gagal : ${failedLogs.length} pesan`, 14, 41)
  doc.text('Status Dokumen    : Rekapitulasi Penanganan Delivery Failure', 14, 46)

  // Klasifikasi ringkasan
  const summaryCategory = {
    phoneIssue: 0,
    gatewayIssue: 0,
    networkIssue: 0,
    otherIssue: 0,
  }

  failedLogs.forEach((l) => {
    const analysis = analyzeDeliveryFailure(l.errorMsg, l.phoneNumber, l.status)
    if (
      analysis.category === 'PHONE_NUMBER_EMPTY' ||
      analysis.category === 'PHONE_NUMBER_FORMAT' ||
      analysis.category === 'NOT_REGISTERED'
    ) {
      summaryCategory.phoneIssue++
    } else if (
      analysis.category === 'GATEWAY_DISCONNECTED' ||
      analysis.category === 'GATEWAY_AUTH_ERROR'
    ) {
      summaryCategory.gatewayIssue++
    } else if (
      analysis.category === 'NETWORK_TIMEOUT' ||
      analysis.category === 'GATEWAY_RATE_LIMIT'
    ) {
      summaryCategory.networkIssue++
    } else {
      summaryCategory.otherIssue++
    }
  })

  // Mini summary card di sebelah kanan
  const cardX = pageWidth - 110
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(cardX, 29, 96, 20, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('RINGKASAN AKAR MASALAH:', cardX + 3, 33)

  doc.setFont('helvetica', 'normal')
  doc.text(`• Masalah Nomor / Kontak: ${summaryCategory.phoneIssue} pesan`, cardX + 3, 38)
  doc.text(`• Gateway WA Terputus: ${summaryCategory.gatewayIssue} pesan`, cardX + 3, 42)
  doc.text(
    `• Timeout Jaringan / Lainnya: ${summaryCategory.networkIssue + summaryCategory.otherIssue} pesan`,
    cardX + 3,
    46
  )

  // 3. TABEL DETAIL KEGAGALAN
  const tableColumns = [
    'No',
    'Waktu Log',
    'Nama Siswa / Penerima',
    'Kelas / NIS',
    'No. WhatsApp',
    'Event',
    'Pesan Galat Sistem',
    'Hasil Analisa & Solusi Penanganan',
  ]

  const tableRows = failedLogs.map((log, index) => {
    const analysis = analyzeDeliveryFailure(log.errorMsg, log.phoneNumber, log.status)
    const logTime = format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')
    const studentInfo = log.studentName
      ? log.studentName
      : log.studentId === 0
      ? 'SYSTEM'
      : `Siswa #${log.studentId}`
    const classNis = `${log.className || '-'}\nNIS: ${log.studentNis || '-'}`
    const rawError = log.errorMsg ? log.errorMsg : '-'
    const analysisText = `[${analysis.title}]\nSolusi: ${analysis.solution.join('; ')}`

    return [
      (index + 1).toString(),
      logTime,
      studentInfo,
      classNis,
      log.phoneNumber || '-',
      log.eventType,
      rawError,
      analysisText,
    ]
  })

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 53,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // No
      1: { cellWidth: 26, halign: 'center' }, // Waktu
      2: { cellWidth: 38 }, // Nama Siswa
      3: { cellWidth: 26 }, // Kelas/NIS
      4: { cellWidth: 28, font: 'courier' }, // No. WA
      5: { cellWidth: 22, halign: 'center' }, // Event
      6: { cellWidth: 48, font: 'courier', textColor: [185, 28, 28] }, // Raw Error
      7: { cellWidth: 'auto' }, // Analisa & Solusi
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242], // red-50 very light
    },
    didDrawPage: (data) => {
      // Footer halaman
      const pageStr = `Halaman ${data.pageNumber}`
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      doc.text(
        'Dicetak secara otomatis dari Sistem Presensi Kehadiran Siswa',
        14,
        doc.internal.pageSize.height - 8
      )
      doc.text(pageStr, pageWidth - 14, doc.internal.pageSize.height - 8, {
        align: 'right',
      })
    },
  })

  // 4. LEMBAR TANDA TANGAN / PENGESAHAN
  const finalY = (doc as any).lastAutoTable?.finalY || 150

  // Pastikan jika mendekati bagian bawah halaman, buat halaman baru
  let signY = finalY + 12
  if (signY > doc.internal.pageSize.height - 40) {
    doc.addPage()
    signY = 25
  }

  const signX = pageWidth - 80
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(`Dicetak pada: ${format(now, 'dd MMMM yyyy', { locale: localeId })}`, signX, signY)
  doc.text('Petugas Operator / Tim IT:', signX, signY + 5)

  doc.setFont('helvetica', 'bold')
  doc.text('( ............................................ )', signX, signY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('NIP / ID Petugas', signX, signY + 28)

  const filename = `Rekap_Gagal_WA_${format(now, 'yyyy-MM-dd_HHmm')}.pdf`
  doc.save(filename)
}
