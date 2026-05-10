import {defineConfig} from 'vite'
import {resolve} from 'node:path'

export default defineConfig({
  base: '/satisfactory-symbol-db/',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        list: resolve(__dirname, 'pages/list.html'),
      },
      onwarn(warning, warn) {
        if (
          typeof warning === 'object' &&
          warning.message.includes(
            'Module "stream/web" has been externalized for browser compatibility',
          )
        ) {
          return
        }

        warn(warning)
      },
    },
  },
})
