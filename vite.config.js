import { copyFile, mkdir, readFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = dirname(fileURLToPath(import.meta.url));

// Copied into the build byte for byte: Chrome loads them as they are.
const COPIED = ['manifest.json', 'src/background.js', 'src/meet/meet.js'];

function extensionFiles() {
  return {
    name: 'extension-files',
    apply: 'build',
    buildStart() {
      for (const file of COPIED) this.addWatchFile(resolve(root, file));
    },
    async writeBundle(options) {
      const out = options.dir;
      for (const file of COPIED) {
        await mkdir(dirname(join(out, file)), { recursive: true });
        await copyFile(resolve(root, file), join(out, file));
      }
      const manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
      const named = [
        manifest.background?.service_worker,
        manifest.side_panel?.default_path,
        ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? []),
      ].filter(Boolean);
      for (const path of named) {
        try {
          await access(join(out, path));
        } catch {
          this.error(`manifest.json names ${path}, which is not in dist/`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), extensionFiles()],
  resolve: { alias: { '@': resolve(root, 'src') } },
  build: {
    rollupOptions: {
      input: {
        panel: resolve(root, 'src/panel/panel.html'),
        'roster-page': resolve(root, 'src/roster-page/roster-page.html'),
      },
    },
  },
});
