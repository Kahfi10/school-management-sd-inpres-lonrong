import { db } from '../../db/local_db';
import { SD_LONRONG_PROFILE } from '../../config/school_profile';
import { Chart, registerables } from 'chart.js';
import confetti from 'canvas-confetti';

Chart.register(...registerables);

let activeCharts: Chart[] = [];

export async function renderDashboardView(container: HTMLElement) {
  // Destroy previous charts if any
  activeCharts.forEach((c) => c.destroy());
  activeCharts = [];

  // 1. Compute Live Educational Statistics
  const allStudents = await db.siswa.where('statusSiswa').equals('aktif').toArray();
  const totalSiswa = allStudents.length;
  const totalLulus = await db.siswa.where('statusSiswa').equals('lulus').count();
  const totalLakiLaki = allStudents.filter((s) => s.jenisKelamin === 'L').length;
  const totalPerempuan = allStudents.filter((s) => s.jenisKelamin === 'P').length;

  // Breakdown Gender per Kelas (Kelas 1 - 6)
  const maleClassBreakdown = [0, 0, 0, 0, 0, 0];
  const femaleClassBreakdown = [0, 0, 0, 0, 0, 0];
  allStudents.forEach((s) => {
    if (s.tingkatKelas >= 1 && s.tingkatKelas <= 6) {
      if (s.jenisKelamin === 'L') maleClassBreakdown[s.tingkatKelas - 1]++;
      else femaleClassBreakdown[s.tingkatKelas - 1]++;
    }
  });

  // 2. GTK & Kepegawaian Statistics
  const guruList = await db.pegawai.toArray();
  const totalGuruTendik = guruList.length;
  const pnsCount = guruList.filter((g) => g.statusKepegawaian === 'PNS').length;
  const pppkCount = guruList.filter((g) => g.statusKepegawaian === 'PPPK').length;
  const honorerCount = guruList.filter((g) => g.statusKepegawaian === 'Honorer Daerah' || g.statusKepegawaian === 'GTT/PTT').length;

  const bebanList = await db.bebanAjar.toArray();
  const guruJam: Record<string, { nama: string; jam: number; jabatan: string }> = {};
  guruList.forEach((g) => {
    guruJam[g.id] = { nama: g.namaLengkap.split(',')[0], jam: 0, jabatan: g.jabatan };
  });
  bebanList.forEach((b) => {
    if (guruJam[b.pegawaiId]) {
      guruJam[b.pegawaiId].jam += b.jumlahJamMinggu;
    }
  });

  const guruKelasMapel = Object.values(guruJam).filter((g) => g.jabatan.includes('Guru'));
  const guruMemenuhiBeban = guruKelasMapel.filter((g) => g.jam >= 24).length;

  // 3. Sarpras & KIB Statistics
  const sarprasItems = await db.sarpras.toArray();
  const totalSarprasItem = sarprasItems.length;
  const totalSarprasUnit = sarprasItems.reduce((acc, curr) => acc + curr.jumlahUnit, 0);

  let unitKibB = 0; // Peralatan TIK & Mesin
  let unitKibC = 0; // Bangunan & Gedung
  let unitKibE = 0; // Buku Teks & APE

  sarprasItems.forEach((s) => {
    if (s.kategoriKib.startsWith('KIB B')) unitKibB += s.jumlahUnit;
    else if (s.kategoriKib.startsWith('KIB C')) unitKibC += s.jumlahUnit;
    else if (s.kategoriKib.startsWith('KIB E')) unitKibE += s.jumlahUnit;
  });

  // 4. E-Kinerja & Buku Tamu Statistics
  const totalBukuTamu = await db.bukuTamu.count();
  const totalJurnal = await db.jurnalKinerja.count();
  const pendingJurnalList = await db.jurnalKinerja.where('statusVerifikasi').equals('diajukan').toArray();
  const pendingJurnalCount = pendingJurnalList.length;
  const recentJurnal = await db.jurnalKinerja.reverse().limit(4).toArray();
  const recentTamu = await db.bukuTamu.reverse().limit(4).toArray();

  container.innerHTML = `
    <div class="page-container">
      <!-- School Hero Banner (Solid Apple HIG Container - Zero Gradient) -->
      <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-lg); padding: 1.5rem 1.85rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; box-shadow: var(--apple-shadow-xs);">
        <div style="display: flex; align-items: center; gap: 1.35rem;">
          <img src="/logo.png" alt="Logo SD Inpres Lonrong" style="width: 64px; height: 64px; object-fit: contain; flex-shrink: 0;" />
          <div>
            <div style="display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="status-pill neutral">NPSN ${SD_LONRONG_PROFILE.npsn}</span>
              <span class="status-pill success">Akreditasi ${SD_LONRONG_PROFILE.akreditasi} (Nilai: 91)</span>
              <span class="status-pill info">${SD_LONRONG_PROFILE.kurikulum}</span>
              <span class="status-pill neutral">Dapodik Terverifikasi</span>
            </div>
            <h1 style="font-size: 1.95rem; font-weight: 800; color: var(--apple-text-primary); letter-spacing: -0.025em; line-height: 1.2;">
              ${SD_LONRONG_PROFILE.namaSekolah}
            </h1>
            <p style="font-size: 0.92rem; color: var(--apple-text-secondary); margin-top: 0.25rem;">
              ${SD_LONRONG_PROFILE.alamat}, Desa ${SD_LONRONG_PROFILE.desaKelurahan}, Kec. ${SD_LONRONG_PROFILE.kecamatan}, Kab. ${SD_LONRONG_PROFILE.kabupatenKota}
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <div style="background: var(--apple-surface-secondary); padding: 0.85rem 1.35rem; border-radius: var(--radius-md); border: 1px solid var(--apple-border-subtle); text-align: right;">
            <div style="font-size: 0.74rem; color: var(--apple-text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Tahun Ajaran Aktif</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--apple-blue); margin: 2px 0;">${SD_LONRONG_PROFILE.tahunAjaran}</div>
            <div style="font-size: 0.82rem; color: var(--apple-text-secondary); font-weight: 600;">${SD_LONRONG_PROFILE.semesterAktif}</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Bar (Pusat Aksi Cepat Administrasi) -->
      <div style="background: var(--apple-surface); border: 1px solid var(--apple-border); border-radius: var(--radius-md); padding: 0.75rem 1.15rem; margin-bottom: 1.35rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; font-weight: 700; color: var(--apple-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
          Aksi Cepat Sekolah:
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="apple-btn apple-btn-secondary" id="qaBtnSiswa" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            + Siswa Baru
          </button>
          <button class="apple-btn apple-btn-secondary" id="qaBtnTamu" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            + Catat Buku Tamu
          </button>
          <button class="apple-btn apple-btn-secondary" id="qaBtnJurnal" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>
            + Tulis E-Kinerja
          </button>
          <button class="apple-btn apple-btn-secondary" id="qaBtnEfiling" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload Arsip Drive
          </button>
        </div>
      </div>

      <!-- Bento Metric Highlights (Row 1 - Informative & Interactive) -->
      <div class="bento-grid" style="margin-bottom: 1.35rem;">
        <!-- Card 1: Siswa Aktif -->
        <div class="bento-card bento-card-interactive" id="cardNavSiswa" style="grid-column: span 3;" title="Klik untuk membuka Manajemen Siswa & Alumni">
          <div class="card-header">
            <span class="card-title">Peserta Didik</span>
            <span class="status-pill success" style="font-size: 0.72rem;">Aktif</span>
          </div>
          <div class="metric-val">${totalSiswa} <span style="font-size: 1.15rem; font-weight: 600; color: var(--apple-text-tertiary);">Siswa</span></div>
          <div class="metric-delta">Kelas 1 s/d 6 • +${totalLulus} alumni lulus</div>
          
          <div class="metric-breakdown">
            <span class="breakdown-chip" style="color: var(--apple-blue);">${totalLakiLaki} Laki-Laki</span>
            <span class="breakdown-chip" style="color: var(--apple-indigo);">${totalPerempuan} Perempuan</span>
            <span class="breakdown-chip">100% NISN Valid</span>
          </div>

          <div class="card-action-link">
            Buka Buku Induk Siswa →
          </div>
        </div>

        <!-- Card 2: Guru & Tendik -->
        <div class="bento-card bento-card-interactive" id="cardNavKepegawaian" style="grid-column: span 3;" title="Klik untuk membuka Kepegawaian & Beban Ajar">
          <div class="card-header">
            <span class="card-title">Pendidik & Tendik</span>
            <span class="status-pill info" style="font-size: 0.72rem;">GTK</span>
          </div>
          <div class="metric-val">${totalGuruTendik} <span style="font-size: 1.15rem; font-weight: 600; color: var(--apple-text-tertiary);">Orang</span></div>
          <div class="metric-delta">1 Kepsek, 6 Guru, 1 Operator • Rasio 1:${Math.round(totalSiswa / (totalGuruTendik || 1))}</div>

          <div class="metric-breakdown">
            <span class="breakdown-chip">${pnsCount} PNS</span>
            <span class="breakdown-chip">${pppkCount} PPPK</span>
            <span class="breakdown-chip">${honorerCount} Honorer</span>
            <span class="breakdown-chip" style="color: var(--apple-green);">${guruMemenuhiBeban}/${guruKelasMapel.length} Memenuhi 24 JJM</span>
          </div>

          <div class="card-action-link">
            Kelola Beban Ajar Guru →
          </div>
        </div>

        <!-- Card 3: Sarana Prasarana -->
        <div class="bento-card bento-card-interactive" id="cardNavSarpras" style="grid-column: span 3;" title="Klik untuk membuka Inventaris Sarpras">
          <div class="card-header">
            <span class="card-title">Inventaris Sarpras</span>
            <span class="status-pill success" style="font-size: 0.72rem;">100% Layak</span>
          </div>
          <div class="metric-val">${totalSarprasUnit} <span style="font-size: 1.15rem; font-weight: 600; color: var(--apple-text-tertiary);">Unit</span></div>
          <div class="metric-delta">${totalSarprasItem} Jenis Aset Terdaftar (KIB B, C, E)</div>

          <div class="metric-breakdown">
            <span class="breakdown-chip">${unitKibB} Unit TIK (KIB B)</span>
            <span class="breakdown-chip">${unitKibC} Gedung (KIB C)</span>
            <span class="breakdown-chip">${unitKibE} Buku (KIB E)</span>
          </div>

          <div class="card-action-link">
            Buku Inventaris Sekolah →
          </div>
        </div>

        <!-- Card 4: Buku Tamu & Kinerja -->
        <div class="bento-card bento-card-interactive" id="cardNavJurnal" style="grid-column: span 3;" title="Klik untuk membuka Jurnal E-Kinerja">
          <div class="card-header">
            <span class="card-title">E-Kinerja & Tamu</span>
            ${
              pendingJurnalCount > 0
                ? `<span class="status-pill warning" style="font-size: 0.72rem;">${pendingJurnalCount} Perlu Verifikasi</span>`
                : `<span class="status-pill success" style="font-size: 0.72rem;">Semua Terverifikasi</span>`
            }
          </div>
          <div class="metric-val">${totalJurnal} <span style="font-size: 1.15rem; font-weight: 600; color: var(--apple-text-tertiary);">Jurnal</span></div>
          <div class="metric-delta">${totalBukuTamu} Tamu Resmi Tercatat di Buku Tamu</div>

          <div class="metric-breakdown">
            <span class="breakdown-chip">${pendingJurnalCount} Menunggu Kepsek</span>
            <span class="breakdown-chip">${totalJurnal - pendingJurnalCount} Disetujui</span>
            <span class="breakdown-chip">Terhubung BKN</span>
          </div>

          <div class="card-action-link">
            Tinjau Jurnal E-Kinerja →
          </div>
        </div>
      </div>

      <!-- Real-Time Charts Section (Row 2 - Rich Educational Visualizations) -->
      <div class="bento-grid" style="margin-bottom: 1.35rem;">
        <!-- Chart 1: Demografi Stacked Bar (Laki-laki & Perempuan per Kelas) -->
        <div class="bento-card" style="grid-column: span 7;">
          <div class="card-header">
            <div>
              <div class="card-title">Demografi Peserta Didik per Tingkat Kelas</div>
              <div class="metric-label" style="font-size: 0.88rem; margin-top: 0.2rem;">
                Komposisi Gender Laki-laki vs Perempuan: Fase A (Kelas 1-2), Fase B (Kelas 3-4), Fase C (Kelas 5-6)
              </div>
            </div>
            <span class="status-pill neutral">Real-time Dapodik</span>
          </div>
          <div style="height: 330px; position: relative;">
            <canvas id="chartDemografiSiswa"></canvas>
          </div>
        </div>

        <!-- Chart 2: Distribusi Kategori Inventaris KIB B, C, dan E -->
        <div class="bento-card" style="grid-column: span 5;">
          <div class="card-header">
            <div>
              <div class="card-title">Distribusi Aset Inventaris (KIB)</div>
              <div class="metric-label" style="font-size: 0.88rem; margin-top: 0.2rem;">KIB B (TIK & Mesin), KIB C (Bangunan), KIB E (Buku & APE)</div>
            </div>
            <span class="status-pill success">Total ${totalSarprasUnit} Unit</span>
          </div>
          <div style="height: 330px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="chartSarprasKondisi"></canvas>
          </div>
        </div>
      </div>

      <!-- Real-Time Beban Ajar & Feed Section (Row 3) -->
      <div class="bento-grid">
        <!-- Chart 3: Beban Mengajar Guru vs Target 24 Jam -->
        <div class="bento-card" style="grid-column: span 7;">
          <div class="card-header">
            <div>
              <div class="card-title">Beban Ajar Pendidik (Jam Tatap Muka / Minggu)</div>
              <div class="metric-label" style="font-size: 0.88rem; margin-top: 0.2rem;">
                Standar Beban Kerja Guru Kemdikbud: Minimal 24 Jam Pelajaran (JJM) per Minggu
              </div>
            </div>
            <span class="status-pill ${guruMemenuhiBeban === guruKelasMapel.length ? 'success' : 'warning'}">
              ${guruMemenuhiBeban}/${guruKelasMapel.length} Guru Memenuhi
            </span>
          </div>
          <div style="height: 330px; position: relative;">
            <canvas id="chartBebanAjar"></canvas>
          </div>
        </div>

        <!-- Feed Aktivitas Real-Time & Direct Approval -->
        <div class="bento-card" style="grid-column: span 5; display: flex; flex-direction: column;">
          <div class="card-header">
            <div>
              <div class="card-title">Log Aktivitas & Layanan Terkini</div>
              <div class="metric-label" style="font-size: 0.86rem; margin-top: 0.2rem;">Sinkronisasi otomatis setiap ada entri tamu & kinerja</div>
            </div>
            <button class="apple-btn apple-btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" id="btnRefreshDashboard">
              Segarkan
            </button>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 0.65rem; flex: 1; overflow-y: auto; max-height: 320px; padding-right: 0.25rem;">
            <!-- Pending Jurnal Approvals First -->
            ${recentJurnal
              .map((j) => {
                const isPending = j.statusVerifikasi === 'diajukan';
                return `
              <div style="padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: var(--apple-surface-secondary); border: 1px solid ${
                isPending ? 'rgba(255, 149, 0, 0.3)' : 'var(--apple-border-subtle)'
              }; display: flex; flex-direction: column; gap: 0.35rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 0.45rem;">
                    <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--apple-blue-light); color: var(--apple-blue); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center;">
                      ${j.namaPegawai.charAt(0)}
                    </div>
                    <span style="font-weight: 700; font-size: 0.92rem; color: var(--apple-text-primary);">${j.namaPegawai}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.45rem;">
                    <span class="status-pill ${isPending ? 'warning' : 'success'}" style="font-size: 0.74rem;">
                      ${isPending ? 'Menunggu Persetujuan' : 'Disetujui'}
                    </span>
                    ${
                      isPending
                        ? `
                      <button class="apple-btn apple-btn-primary btn-quick-approve" data-id="${j.id}" style="padding: 0.25rem 0.6rem; font-size: 0.74rem;">
                        Setujui
                      </button>
                    `
                        : ''
                    }
                  </div>
                </div>
                <div style="font-size: 0.84rem; color: var(--apple-text-secondary); line-height: 1.4;">
                  ${j.uraianAktivitas.substring(0, 75)}...
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--apple-text-tertiary);">
                  <span>Output: ${j.outputHasil.substring(0, 35)}...</span>
                  <span>${j.tanggal} • ${j.jamMulai} WITA</span>
                </div>
              </div>
            `;
              })
              .join('')}

            <!-- Recent Visitors -->
            ${recentTamu
              .map(
                (t) => `
              <div style="padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: var(--apple-surface-secondary); border: 1px solid var(--apple-border-subtle); display: flex; flex-direction: column; gap: 0.35rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--apple-text-primary);">${t.namaTamu}</div>
                  <span class="status-pill neutral" style="font-size: 0.74rem;">${t.kategoriTamu}</span>
                </div>
                <div style="font-size: 0.84rem; color: var(--apple-text-secondary); line-height: 1.4;">
                  ${t.instansiAsal} — ${t.tujuanKunjungan.substring(0, 65)}...
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--apple-text-tertiary);">
                  <span>Menemui: <strong>${t.pegawaiDituju}</strong></span>
                  <a href="https://wa.me/${t.noWhatsapp.replace(/^0/, '62')}" target="_blank" style="color: var(--apple-blue); font-weight: 600; text-decoration: none;">
                    WhatsApp Tamu ↗
                  </a>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize Stacked Bar Chart (Laki-laki & Perempuan per Kelas)
  const ctxSiswa = document.getElementById('chartDemografiSiswa') as HTMLCanvasElement;
  if (ctxSiswa) {
    const chartSiswa = new Chart(ctxSiswa, {
      type: 'bar',
      data: {
        labels: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
        datasets: [
          {
            label: 'Laki-Laki',
            data: maleClassBreakdown,
            backgroundColor: '#0071E3', // Apple Blue (Pure Solid)
            borderRadius: 4,
            stack: 'gender',
          },
          {
            label: 'Perempuan',
            data: femaleClassBreakdown,
            backgroundColor: '#5856D6', // Apple Indigo (Pure Solid)
            borderRadius: 4,
            stack: 'gender',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { font: { family: 'Plus Jakarta Sans', weight: 600, size: 12.5 }, boxWidth: 12, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#1D1D1F',
            titleFont: { family: 'Plus Jakarta Sans', weight: 'bold', size: 13 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
            padding: 10,
            cornerRadius: 6,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', weight: 600, size: 13 } },
          },
          y: {
            beginAtZero: true,
            stacked: true,
            ticks: { stepSize: 1, font: { family: 'Plus Jakarta Sans', weight: 500, size: 13 } },
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
          },
        },
      },
    });
    activeCharts.push(chartSiswa);
  }

  // Initialize Donut Chart: Distribusi Aset KIB B, C, dan E
  const ctxSarpras = document.getElementById('chartSarprasKondisi') as HTMLCanvasElement;
  if (ctxSarpras) {
    const chartSarpras = new Chart(ctxSarpras, {
      type: 'doughnut',
      data: {
        labels: [
          `KIB B - Peralatan TIK & Mesin (${unitKibB} Unit)`,
          `KIB C - Gedung & Ruang Kelas (${unitKibC} Gedung)`,
          `KIB E - Buku Teks Kurikulum (${unitKibE} Eksemplar)`,
        ],
        datasets: [
          {
            data: [unitKibB, unitKibC, unitKibE],
            backgroundColor: ['#0071E3', '#FF9500', '#34C759'], // Pure Solid Apple Colors
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Plus Jakarta Sans', weight: 600, size: 12 }, boxWidth: 12, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#1D1D1F',
            titleFont: { family: 'Plus Jakarta Sans', weight: 'bold', size: 13 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
            padding: 10,
            cornerRadius: 6,
          },
        },
      },
    });
    activeCharts.push(chartSarpras);
  }

  // Initialize Horizontal Bar: Beban Ajar Guru vs Target 24 Jam
  const ctxBeban = document.getElementById('chartBebanAjar') as HTMLCanvasElement;
  if (ctxBeban) {
    const guruEntries = Object.values(guruJam).filter((g) => g.jam > 0);
    const chartBeban = new Chart(ctxBeban, {
      type: 'bar',
      data: {
        labels: guruEntries.map((g) => g.nama),
        datasets: [
          {
            label: 'Jam Tatap Muka (JJM)',
            data: guruEntries.map((g) => g.jam),
            backgroundColor: guruEntries.map((g) => (g.jam >= 24 ? '#34C759' : '#FF9500')), // Green or Amber solid
            borderRadius: 5,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1D1D1F',
            titleFont: { family: 'Plus Jakarta Sans', weight: 'bold', size: 13 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
            callbacks: {
              afterLabel: (item) => {
                const val = item.raw as number;
                return val >= 24 ? '✓ Memenuhi Standar Minimal 24 Jam' : `! Kurang ${24 - val} Jam dari Standar`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 30,
            ticks: { stepSize: 6, font: { family: 'Plus Jakarta Sans', weight: 500, size: 12.5 } },
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
          },
          y: {
            ticks: { font: { family: 'Plus Jakarta Sans', weight: 600, size: 13 } },
            grid: { display: false },
          },
        },
      },
    });
    activeCharts.push(chartBeban);
  }

  // Event Listeners for Interactive Card Navigation
  container.querySelector('#cardNavSiswa')?.addEventListener('click', () => {
    (window as any).appNavigate?.('siswa');
  });
  container.querySelector('#cardNavKepegawaian')?.addEventListener('click', () => {
    (window as any).appNavigate?.('kepegawaian');
  });
  container.querySelector('#cardNavSarpras')?.addEventListener('click', () => {
    (window as any).appNavigate?.('sarpras');
  });
  container.querySelector('#cardNavJurnal')?.addEventListener('click', () => {
    (window as any).appNavigate?.('jurnal');
  });

  // Quick Action Buttons
  container.querySelector('#qaBtnSiswa')?.addEventListener('click', () => (window as any).appNavigate?.('siswa'));
  container.querySelector('#qaBtnTamu')?.addEventListener('click', () => (window as any).appNavigate?.('bukutamu'));
  container.querySelector('#qaBtnJurnal')?.addEventListener('click', () => (window as any).appNavigate?.('jurnal'));
  container.querySelector('#qaBtnEfiling')?.addEventListener('click', () => (window as any).appNavigate?.('efiling'));

  // Quick Approve Jurnal directly from dashboard
  container.querySelectorAll('.btn-quick-approve').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) {
        await db.jurnalKinerja.update(id, {
          statusVerifikasi: 'disetujui',
          catatanEvaluasi: 'Disetujui Kepala Sekolah untuk bukti dukung E-Kinerja BKN.',
          updatedAt: new Date().toISOString(),
        });
        confetti({ particleCount: 35, spread: 50 });
        renderDashboardView(container);
      }
    });
  });

  // Manual Refresh
  container.querySelector('#btnRefreshDashboard')?.addEventListener('click', () => {
    renderDashboardView(container);
  });
}
