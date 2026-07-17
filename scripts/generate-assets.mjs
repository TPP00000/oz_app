// scripts/generate-assets.mjs - 本地生图脚本（不属于小程序运行时代码）
// 用法: node scripts/generate-assets.mjs [素材名...]  不带参数则生成全部
// 读取项目根目录 .env 中的 OPENAI_API_KEY，调用 gpt-image-2，
// 产物存入 miniprogram/assets/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'miniprogram', 'assets')
const CONCURRENCY = 3

const STYLE =
  '吉卜力宫崎骏水彩手绘插画风格，温馨浪漫治愈系，白天明亮柔和的暖光，色彩清新，画面干净，无文字'

const ASSETS = [
  {
    name: 'room-day.jpg',
    size: '1024x1536',
    format: 'jpeg',
    prompt:
      `温馨可爱的小屋室内全景，木地板和奶油色墙壁，左侧大窗户洒进柔和的白天阳光，白色纱帘，` +
      `屋内有小沙发、木书架、绿植和挂画，沙发上放着一个可爱的紫色茄子造型抱枕，` +
      `墙上挂着一幅茄子主题的小画，画面中下方有一张原木色圆桌，桌面中央空着，` +
      `构图留有呼吸感，${STYLE}`
  },
  {
    name: 'tree-day.png',
    size: '1024x1536',
    format: 'png',
    prompt:
      `一棵可爱的盆栽愿望树，粉色陶瓷花盆上有一个爱心图案，树干微微弯曲很可爱，` +
      `树冠圆润茂密呈嫩绿色，树枝上同时结着小小的紫色茄子和红色苹果，果实圆润有光泽，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'tree-bare-day.png',
    size: '1024x1536',
    format: 'png',
    prompt:
      `一棵可爱的盆栽树，粉色陶瓷花盆上有一个爱心图案，树干微微弯曲很可爱，` +
      `树冠圆润茂密呈嫩绿色，只有茂密的叶子没有任何果实，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'fruit-eggplant.png',
    size: '1024x1024',
    format: 'png',
    prompt:
      `一个可爱的卡通小茄子，圆润饱满微微弯曲，紫色表面有柔和光泽，绿色小蒂，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'fruit-apple.png',
    size: '1024x1024',
    format: 'png',
    prompt:
      `一个可爱的卡通红苹果，圆润有柔和光泽，带一小片绿叶，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'tree-bg-day.jpg',
    size: '1024x1536',
    format: 'jpeg',
    prompt:
      'Soft watercolor illustration background, cream and pale pink tones, ' +
      'gentle warm daylight, a cozy corner with a plant and soft light, ' +
      'Studio Ghibli style, minimal composition with lots of empty space, no text'
  },
  {
    name: 'card-paper.jpg',
    size: '1024x1536',
    format: 'jpeg',
    prompt:
      `淡奶油色的信纸纹理背景，四角有淡淡的水彩小茄子、小苹果和小花装饰，` +
      `中间大面积留白，${STYLE}`
  }
]

function loadApiKey() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8')
  const match = env.match(/^OPENAI_API_KEY=(.+)$/m)
  if (!match || !match[1].trim()) {
    throw new Error('.env 中没有找到 OPENAI_API_KEY')
  }
  return match[1].trim()
}

async function generateOne(apiKey, asset) {
  const body = {
    model: 'gpt-image-2',
    prompt: asset.prompt,
    size: asset.size,
    quality: 'medium',
    output_format: asset.format
  }
  if (asset.format === 'jpeg') {
    body.output_compression = 88
  }
  if (asset.background) {
    body.background = asset.background
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${asset.name} 生成失败 HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = await res.json()
  const b64 = json.data && json.data[0] && json.data[0].b64_json
  if (!b64) {
    throw new Error(`${asset.name} 返回中没有图片数据`)
  }
  const buf = Buffer.from(b64, 'base64')
  writeFileSync(join(OUT_DIR, asset.name), buf)
  return { name: asset.name, kb: Math.round(buf.length / 1024) }
}

async function main() {
  const apiKey = loadApiKey()
  mkdirSync(OUT_DIR, { recursive: true })

  const wanted = process.argv.slice(2)
  const targets = wanted.length
    ? ASSETS.filter((a) => wanted.some((w) => a.name.includes(w)))
    : ASSETS
  if (!targets.length) {
    throw new Error(`没有匹配的素材名: ${wanted.join(', ')}`)
  }

  process.stdout.write(`将生成 ${targets.length} 张图 (~$${(targets.length * 0.041).toFixed(2)})\n`)

  const queue = [...targets]
  const results = []
  const errors = []
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const asset = queue.shift()
        try {
          const r = await generateOne(apiKey, asset)
          results.push(r)
          process.stdout.write(`OK  ${r.name}  ${r.kb}KB\n`)
        } catch (err) {
          errors.push(err.message)
          process.stdout.write(`FAIL ${asset.name}: ${err.message}\n`)
        }
      }
    })
  )

  process.stdout.write(`\n完成 ${results.length}/${targets.length}\n`)
  if (errors.length) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`)
  process.exitCode = 1
})
