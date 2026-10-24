import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    },
  },
  build: {
    sourcemap: false, // Point 16: Private source map - prevent source code leakage in production
    minify: 'esbuild',
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-excel': ['xlsx'],
          'vendor-charts': ['chart.js'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-core': ['dexie', 'dompurify', 'lucide', 'signature_pad'],
        },
      },
    },
  },
});
