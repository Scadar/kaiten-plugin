import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    // CRITICAL: TanStack Router plugin must come BEFORE React plugin
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: false,
    }),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
      exclude: [
        'src/components/ui/**', // vendor shadcn code
        'src/routeTree.gen.ts', // TanStack Router auto-generated
      ],
    },
  },
});
