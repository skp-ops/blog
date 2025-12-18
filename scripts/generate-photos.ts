import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface Photo {
  id: string
  title: string
  description?: string
  date: string
  image: string
  thumbnail?: string
  tags?: string[]
  location?: string
  camera?: string
  lens?: string
  iso?: string | number
  aperture?: string
  shutter?: string
  focalLength?: string
}

const pad = (n: number, width = 4) => String(n).padStart(width, '0')

const pick = <T>(arr: T[], idx: number) => arr[idx % arr.length]

async function main() {
  const count = Number.parseInt(process.argv[2] || '1000', 10) || 1000
  const baseDate = new Date('2025-01-01T00:00:00.000Z')

  const locations = ['Tokyo', 'Shanghai', 'Taipei', 'Osaka', 'Seoul', 'Hong Kong', 'Singapore', 'Bangkok', 'Paris', 'Berlin', 'New York']
  const tagPool = ['street', 'portrait', 'landscape', 'night', 'nature', 'architecture', 'travel', 'food', 'film', 'bw', 'sunset']
  const cameras = ['Fujifilm X-T5', 'Sony A7C', 'Canon R6', 'Nikon Z6', 'iPhone 15 Pro']
  const lenses = ['XF 23mm f/1.4', 'FE 35mm f/1.8', 'RF 50mm f/1.8', 'Z 24-70mm f/4', '—']
  const isos = [100, 200, 400, 800, 1600, 3200]
  const apertures = ['f/1.8', 'f/2.8', 'f/4', 'f/5.6', 'f/8']
  const shutters = ['1/30s', '1/60s', '1/125s', '1/250s', '1/500s']
  const focalLengths = ['23mm', '28mm', '35mm', '50mm', '85mm']

  const photos: Photo[] = []

  for (let i = 1; i <= count; i++) {
    const d = new Date(baseDate)
    // Newest first when sorted by date desc: later dates should be larger.
    d.setUTCMinutes(d.getUTCMinutes() + i)

    const id = `test-photo-${pad(i)}`
    const location = pick(locations, i)

    const tags = [
      pick(tagPool, i),
      pick(tagPool, i * 3),
      pick(tagPool, i * 7),
    ].filter((v, idx, arr) => arr.indexOf(v) === idx)

    // Keep consistent with your schema: image is required; thumbnail optional.
    // Use existing placeholder svg (no need to add 1000 files to repo).
    const image = '/gallery/placeholder.svg'
    const thumbnail = '/gallery/placeholder.svg'

    const camera = pick(cameras, i)
    const lens = pick(lenses, i)

    photos.push({
      id,
      title: `Test Photo ${i}`,
      description: `Generated testcase image #${i}`,
      date: d.toISOString(),
      image,
      thumbnail,
      tags,
      location,
      camera,
      lens,
      iso: pick(isos, i),
      aperture: pick(apertures, i),
      shutter: pick(shutters, i),
      focalLength: pick(focalLengths, i),
    })
  }

  const outPath = resolve('src/content/photos/photos.json')
  await writeFile(outPath, `${JSON.stringify(photos, null, 2)}\n`, 'utf8')

  console.log(`Wrote ${photos.length} photos to ${outPath}`)
}

void main()
