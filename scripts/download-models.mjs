import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { get } from 'https'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = join(__dirname, '..', 'public', 'models')

const BASE = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'

const FILES = [
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json',
  'face_landmark_68_net-shard1',
  'face_landmark_68_net-weights_manifest.json',
  'face_recognition_net-shard1',
  'face_recognition_net-shard2',
  'face_recognition_net-weights_manifest.json',
]

mkdirSync(MODELS_DIR, { recursive: true })

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) {
      console.log(`  ✓ Already: ${dest.split(/[/\\]/).pop()}`)
      return resolve()
    }
    const file = createWriteStream(dest)
    const req = get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

console.log('📥 Downloading face-api.js models to public/models/ ...\n')
let ok = 0, fail = 0
for (const file of FILES) {
  process.stdout.write(`  ${file}... `)
  try {
    await download(`${BASE}/${file}`, join(MODELS_DIR, file))
    if (!existsSync(join(MODELS_DIR, file))) {
      console.log('✓ Done')
    }
    ok++
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`)
    fail++
  }
}

console.log(`\n${fail === 0 ? '✅' : '⚠️ '} ${ok}/${FILES.length} files ready in public/models/`)
if (fail > 0) {
  console.log('Some files failed. Check your internet connection and retry.')
  process.exit(1)
}
