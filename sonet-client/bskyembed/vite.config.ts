import {resolve} from 'node:path'

import preact from '@preact/preset-vite'
import legacy from '@vitejs/plugin-legacy'
import type {UserConfig} from 'vite'
import paths from 'vite-tsconfig-paths'

const config: UserConfig = {
  plugins: [
    preact(),
    paths(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  build: {
    assetsDir: 'static',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        note: resolve(__dirname, 'note.html'),
      },
    },
  },
}

export default config
