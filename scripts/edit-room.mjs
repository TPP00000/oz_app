// scripts/edit-room.mjs - 图生图局部修改全景图（本地工具）
// 用法: node scripts/edit-room.mjs "修改指令"
// 保持构图不变地修改 room-pano-day.jpg，修改前自动备份为 room-pano-day.bak.jpg
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = join(ROOT, 'miniprogram', 'assets', 'room-pano-day.jpg')
// 备份放在项目根目录（miniprogram/ 之外），避免被打进小程序包
const BACKUP = join(ROOT, 'room-pano-day.bak.jpg')

function loadApiKey() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8')
  const match = env.match(/^OPENAI_API_KEY=(.+)$/m)
  if (!match || !match[1].trim()) {
    throw new Error('.env 中没有找到 OPENAI_API_KEY')
  }
  return match[1].trim()
}

async function main() {
  const instruction = process.argv[2]
  if (!instruction) {
    throw new Error('用法: node scripts/edit-room.mjs "修改指令"')
  }
  const apiKey = loadApiKey()

  copyFileSync(TARGET, BACKUP)

  const form = new FormData()
  form.append('model', 'gpt-image-2')
  form.append('prompt', instruction)
  form.append('size', '1536x1024')
  form.append('output_format', 'jpeg')
  form.append('output_compression', '88')
  form.append(
    'image',
    new Blob([readFileSync(TARGET)], { type: 'image/jpeg' }),
    'room-pano-day.jpg'
  )

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`修改失败 HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  const b64 = json.data && json.data[0] && json.data[0].b64_json
  if (!b64) {
    throw new Error('返回中没有图片数据')
  }
  const buf = Buffer.from(b64, 'base64')
  writeFileSync(TARGET, buf)
  process.stdout.write(`OK 已更新 (${Math.round(buf.length / 1024)}KB)，原图备份在 room-pano-day.bak.jpg\n`)
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`)
  process.exitCode = 1
})
