/**
 * Profil Resmi Institusi Berdasarkan Data Pokok Pendidikan Kemendikdasmen
 * NPSN: 40304087
 */

export interface SchoolProfile {
  npsn: string;
  namaSekolah: string;
  bentukPendidikan: string;
  statusSekolah: 'Negeri' | 'Swasta';
  kurikulum: string;
  alamat: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodePos: string;
  email: string;
  telepon: string;
  kepalaSekolah: {
    nama: string;
    nip: string;
    pangkat: string;
  };
  akreditasi: string;
  semesterAktif: string;
  tahunAjaran: string;
}

export const SD_LONRONG_PROFILE: SchoolProfile = {
  npsn: '40304087',
  namaSekolah: 'SD INPRES LONRONG',
  bentukPendidikan: 'Sekolah Dasar (SD)',
  statusSekolah: 'Negeri',
  kurikulum: 'Kurikulum Merdeka',
  alamat: 'Jl. Dongkokang, Desa Lonrong',
  desaKelurahan: 'Lonrong',
  kecamatan: 'Kecamatan Eremerasa',
  kabupatenKota: 'Kabupaten Bantaeng',
  provinsi: 'Sulawesi Selatan',
  kodePos: '92415',
  email: 'sdinpreslonrong.bantaeng@gmail.com',
  telepon: '(0413) 21908',
  kepalaSekolah: {
    nama: 'Drs. H. Syamsuddin, M.Pd.',
    nip: '19680512 199307 1 002',
    pangkat: 'Pembina Tk. I, IV/b',
  },
  akreditasi: 'A (Unggul)',
  semesterAktif: 'Semester Ganjil',
  tahunAjaran: '2025/2026',
};
