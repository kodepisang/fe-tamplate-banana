export interface FailureAnalysisResult {
  category: 
    | 'PHONE_NUMBER_EMPTY'
    | 'PHONE_NUMBER_FORMAT'
    | 'NOT_REGISTERED'
    | 'GATEWAY_DISCONNECTED'
    | 'GATEWAY_AUTH_ERROR'
    | 'GATEWAY_RATE_LIMIT'
    | 'NETWORK_TIMEOUT'
    | 'DEDUPLICATION'
    | 'UNKNOWN_ERROR';
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  solution: string[];
  actionType: 'RETRY' | 'UPDATE_PHONE' | 'CHECK_DEVICE' | 'RESET_DEDUP' | 'NONE';
}

export function analyzeDeliveryFailure(
  errorMsg: string | null | undefined,
  phoneNumber: string | undefined,
  status: string
): FailureAnalysisResult {
  if (status === 'SENT') {
    return {
      category: 'UNKNOWN_ERROR',
      title: 'Pesan Berhasil Terkirim',
      severity: 'low',
      description: 'Pesan telah berhasil disampaikan ke gateway WhatsApp dan diterima oleh server WhatsApp.',
      solution: ['Tidak ada tindakan diperlukan. Pesan telah sukses terkirim.'],
      actionType: 'NONE',
    };
  }

  if (status === 'QUEUED') {
    return {
      category: 'UNKNOWN_ERROR',
      title: 'Dalam Antrian Pengiriman',
      severity: 'low',
      description: 'Pesan sedang berada dalam antrian pemrosesan worker background untuk dikirimkan secara bertahap.',
      solution: ['Tunggu beberapa saat hingga worker memproses antrian pesan sesuai batas laju (rate limit).'],
      actionType: 'NONE',
    };
  }

  const err = (errorMsg || '').toLowerCase();
  const phone = (phoneNumber || '').trim();

  // 1. Nomor telepon kosong
  if (!phone || phone === '-' || err.includes('nomor wa tidak tersedia') || err.includes('phone number not provided')) {
    return {
      category: 'PHONE_NUMBER_EMPTY',
      title: 'Nomor WhatsApp Belum Terdaftar',
      severity: 'high',
      description: 'Nomor telepon siswa atau nomor kontak orang tua/wali murid belum diinput pada profil database pengguna.',
      solution: [
        'Buka menu Data Master > Pengguna / Siswa.',
        'Cari profil siswa bersangkutan dan perbarui kolom Nomor Telepon / No. HP Wali.',
        'Pastikan format diawali 08xx atau 628xx.',
      ],
      actionType: 'UPDATE_PHONE',
    };
  }

  // 2. Format nomor tidak valid
  if (
    err.includes('invalid phone') ||
    err.includes('invalid number') ||
    err.includes('format') ||
    phone.length < 9 ||
    !/^[0-9+]+$/.test(phone)
  ) {
    return {
      category: 'PHONE_NUMBER_FORMAT',
      title: 'Format Nomor Telepon Tidak Valid',
      severity: 'high',
      description: `Format nomor "${phone}" tidak sesuai dengan standar penomoran WhatsApp (panjang digit kurang atau mengandung simbol/karakter tidak valid).`,
      solution: [
        'Periksa kembali nomor telepon wali/siswa di menu Master Siswa.',
        'Gunakan format baku seluler Indonesia: contoh 08123456789 atau 628123456789 (10-14 digit).',
        'Pastikan tidak ada spasi, tanda strip (-) atau tanda kurung dalam input.',
      ],
      actionType: 'UPDATE_PHONE',
    };
  }

  // 3. Nomor tidak terdaftar di WhatsApp
  if (
    err.includes('not registered') ||
    err.includes('recipient not found') ||
    err.includes('not on whatsapp') ||
    err.includes('400')
  ) {
    return {
      category: 'NOT_REGISTERED',
      title: 'Nomor Tidak Aktif di WhatsApp',
      severity: 'high',
      description: 'Nomor tujuan valid secara digit GSM, tetapi belum pernah mendaftar atau saat ini tidak aktif di layanan WhatsApp.',
      solution: [
        'Konfirmasikan ke orang tua/wali murid apakah nomor tersebut aktif digunakan untuk aplikasi WhatsApp.',
        'Minta nomor alternatif WhatsApp aktif dari orang tua murid.',
        'Perbarui nomor di profil siswa.',
      ],
      actionType: 'UPDATE_PHONE',
    };
  }

  // 4. Gateway terputus / Session logout
  if (
    err.includes('disconnected') ||
    err.includes('logged out') ||
    err.includes('unlinked') ||
    err.includes('500') ||
    err.includes('502') ||
    err.includes('503') ||
    err.includes('session closed') ||
    err.includes('qr')
  ) {
    return {
      category: 'GATEWAY_DISCONNECTED',
      title: 'Gateway WhatsApp Terputus / Sesi Berakhir',
      severity: 'high',
      description: 'Koneksi perangkat WhatsApp gateway (Gowa / Baileys) ke server WhatsApp terputus atau sesi login telah dikeluarkan (unlinked/logout).',
      solution: [
        'Buka menu Pengaturan > Device WhatsApp (/settings/wa-device).',
        'Cek status koneksi perangkat gateway.',
        'Lakukan scan ulang QR Code WhatsApp Web jika status unlinked.',
        'Setelah terhubung kembali, tekan tombol "Retry" untuk mengirim ulang pesan yang gagal.',
      ],
      actionType: 'CHECK_DEVICE',
    };
  }

  // 5. Auth error / unauthorized
  if (err.includes('401') || err.includes('403') || err.includes('unauthorized') || err.includes('api key')) {
    return {
      category: 'GATEWAY_AUTH_ERROR',
      title: 'Kunci Otorisasi Gateway Salah',
      severity: 'high',
      description: 'Token otentikasi / API Key ke server WhatsApp Gateway ditolak atau tidak cocok.',
      solution: [
        'Periksa pengaturan API Key WhatsApp Gateway di file konfigurasi .env backend.',
        'Pastikan parameter Authorization Header sesuai dengan konfigurasi gateway.',
      ],
      actionType: 'CHECK_DEVICE',
    };
  }

  // 6. Rate Limit / Terblokir sementara
  if (err.includes('rate limit') || err.includes('too many') || err.includes('429')) {
    return {
      category: 'GATEWAY_RATE_LIMIT',
      title: 'Batas Kecepatan Pengiriman (Rate Limit)',
      severity: 'medium',
      description: 'Server WhatsApp membatasi sementara kecepatan pengiriman pesan untuk menghindari deteksi spam.',
      solution: [
        'Tunggu 5 - 10 menit agar batas jeda pengiriman dari WhatsApp mereda.',
        'Sistem otomatis mengatur jeda acak 2-5 detik antar pesan.',
        'Tekan tombol "Retry" setelah masa jeda.',
      ],
      actionType: 'RETRY',
    };
  }

  // 7. Timeout / Gangguan Jaringan
  if (
    err.includes('timeout') ||
    err.includes('econnrefused') ||
    err.includes('enotfound') ||
    err.includes('network') ||
    err.includes('fetch failed')
  ) {
    return {
      category: 'NETWORK_TIMEOUT',
      title: 'Koneksi Jaringan Gateway Timeout',
      severity: 'medium',
      description: 'Server sistem presensi tidak dapat terhubung ke server WhatsApp Gateway (koneksi terputus atau server gateway sedang restart).',
      solution: [
        'Pastikan service WhatsApp Gateway (Gowa / container WA) berjalan normal di server.',
        'Periksa koneksi internet pada server.',
        'Setelah jaringan normal, gunakan tombol "Retry" untuk mengirim ulang pesan.',
      ],
      actionType: 'RETRY',
    };
  }

  // 8. Deduplikasi
  if (err.includes('deduplikasi') || status === 'SKIPPED') {
    return {
      category: 'DEDUPLICATION',
      title: 'Dilewati: Sudah Pernah Dikirim Hari Ini',
      severity: 'low',
      description: 'Sistem mencegah pengiriman pesan berulang (spamming) karena notifikasi event yang sama sudah sukses dikirimkan hari ini.',
      solution: [
        'Jika ingin mengirim ulang secara paksa, gunakan tombol "Reset Dedup" di atas untuk siswa ini.',
      ],
      actionType: 'RESET_DEDUP',
    };
  }

  // 9. Error Umum / Lainnya
  return {
    category: 'UNKNOWN_ERROR',
    title: 'Kendala Pengiriman Pesan',
    severity: 'medium',
    description: errorMsg
      ? `Terjadi kendala saat menghubungi API WhatsApp: "${errorMsg}"`
      : 'Pengiriman pesan tidak berhasil diselesaikan setelah batas percobaan maksimum.',
    solution: [
      'Periksa apakah nomor penerima aktif dan dapat menerima pesan.',
      'Periksa status server gateway WhatsApp.',
      'Coba kirim ulang dengan tombol "Retry".',
    ],
    actionType: 'RETRY',
  };
}
