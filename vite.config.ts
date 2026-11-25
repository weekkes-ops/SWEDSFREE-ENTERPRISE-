import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const firebaseApiKey = env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
  const disableHmr = (env.DISABLE_HMR || process.env.DISABLE_HMR) === 'true';

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['firebase/app', 'firebase/firestore'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.FIREBASE_API_KEY': JSON.stringify(firebaseApiKey),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // Disable HMR websocket connection to prevent connection errors in cloud container preview
      hmr: false,
      watch: disableHmr ? null : {},
    },
  };
});
