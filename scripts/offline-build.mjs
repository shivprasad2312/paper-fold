import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultTemplate = fileURLToPath(new URL('./offline-worker.js', import.meta.url));

async function listFiles(root, directory = '') {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(root, relative);
    if (entry.isFile() && relative !== 'sw.js') return [relative];
    return [];
  }));
  return files.flat().sort();
}

// The worker is generated only after Vite has emitted its complete output,
// including lazily loaded chunks, fonts and every public character portrait.
export async function generateOfflineWorker(outDir, templatePath = defaultTemplate) {
  const files = await listFiles(outDir);
  if (!files.includes('index.html')) throw new Error('Offline build requires index.html in the output directory.');
  const template = await readFile(templatePath, 'utf8');
  if (!template.includes('__OFFLINE_VERSION__') || !template.includes('__OFFLINE_ASSETS__')) {
    throw new Error('Offline worker template is missing a build placeholder.');
  }
  const hash = createHash('sha256').update(template);
  for (const file of files) {
    hash.update('\0').update(file).update('\0').update(await readFile(path.join(outDir, file)));
  }
  const version = hash.digest('hex').slice(0, 16);
  const assets = files.map((file) => `./${file}`);
  const worker = template
    .replace('__OFFLINE_VERSION__', JSON.stringify(version))
    .replace('__OFFLINE_ASSETS__', JSON.stringify(assets));
  if (worker === template || worker.includes('__OFFLINE_VERSION__') || worker.includes('__OFFLINE_ASSETS__')) {
    throw new Error('Offline worker template is missing a build placeholder.');
  }
  await writeFile(path.join(outDir, 'sw.js'), worker);
  return { version, assets };
}

export function offlineBuildPlugin() {
  let outputDir;
  return {
    name: 'ludo-offline-precache',
    apply: 'build',
    configResolved(config) { outputDir = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const { version, assets } = await generateOfflineWorker(outputDir);
      console.log(`Offline cache: ${assets.length} local files (version ${version}).`);
    },
  };
}
