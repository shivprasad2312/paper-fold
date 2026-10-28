import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { offlineBuildPlugin } from './scripts/offline-build.mjs';

export default defineConfig({
  plugins: [react(), offlineBuildPlugin()],
  // Keep the HMR origin separate from the production/offline preview so an
  // installed production worker cannot serve cached assets to development.
  server: { host: '0.0.0.0', port: 5174, allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  // Prebundle the lazy character renderer up front instead of replacing dependency chunks
  // while a proxied browser is still loading the app.
  optimizeDeps: { include: [
    'react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react',
    'three',
    'three/examples/jsm/geometries/RoundedBoxGeometry.js', 'three/examples/jsm/utils/BufferGeometryUtils.js',
  ] },
  // Keep WebGL separately cacheable. Three.js is about 500 kB minified but
  // only ~129 kB compressed, so allow a little room above Vite's default warning.
  build: { chunkSizeWarningLimit: 550, rollupOptions: { output: { manualChunks: { 'three-core': ['three'] } } } },
});
