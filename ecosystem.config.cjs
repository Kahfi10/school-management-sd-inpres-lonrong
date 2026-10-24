// ==============================================================================
// Konfigurasi PM2 Process Manager - SD Inpres Lonrong
// Digunakan di Server Ubuntu (Oracle Cloud)
// Jalankan: pm2 start ecosystem.config.cjs
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'sd-lonrong',
      // Menggunakan fitur bawaan PM2 Static Server (Sangat ringan, ~30MB RAM)
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
