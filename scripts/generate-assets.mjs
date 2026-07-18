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
    name: 'room-pano-day.jpg',
    size: '1536x1024',
    format: 'jpeg',
    prompt:
      `一间温馨小屋的室内横向全景，微微斜视角带有柔和的空间纵深感（不是完全正面平视），` +
      `温暖的金色午后阳光从窗户斜洒进房间，在木地板上投下柔和光斑；从左到右依次是：` +
      `左侧一扇大窗户，窗台上摆着绿植；` +
      `然后是一个装满书的原木色书柜；` +
      `画面正中间是一张原木色小圆桌，桌上摆着一盆可爱的心愿树小盆栽：` +
      `粉色陶瓷花盆上有爱心图案，树冠圆润茂密呈嫩绿色，` +
      `树上结着几颗小小的紫色茄子和红色苹果；` +
      `右侧是一张奶油色的小沙发，沙发上坐着两只依偎在一起的可爱紫色茄子玩偶，` +
      `一大一小亲密地靠在一起；` +
      `沙发上方墙上挂着一幅小画，画中是两只依偎在一起的小茄子；` +
      `最右边是一个摆着杯子和小摆件的置物架；` +
      `木地板，奶油色墙壁，屋顶有吊灯，${STYLE}`
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
    name: 'heart.png',
    size: '1024x1024',
    format: 'png',
    prompt:
      `一颗可爱的水彩爱心，柔和的粉红色渐变，圆润饱满，边缘微微晕染，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'title.png',
    size: '1536x1024',
    format: 'png',
    prompt:
      `手写风格的中文标题"茄茄小屋"四个字，横排一行，圆润可爱的手写字体，` +
      `暖棕色（深咖啡色）笔画，带一点水彩笔触质感，字迹清晰工整，` +
      `纯白色干净背景，除这四个字外没有任何其他内容和装饰`
  },
  {
    name: 'board.png',
    size: '1536x1024',
    format: 'png',
    prompt:
      `一块横向的木质挂牌，圆角矩形的浅原木色木板，微微的木纹质感，` +
      `边缘一圈略深的木色描边，板面干净没有任何文字，简洁可爱，` +
      `${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'house-eggplant.png',
    size: '1024x1024',
    format: 'png',
    prompt:
      `一间可爱的卡通小屋，造型圆润饱满，屋顶是一个大大的紫色茄子形状（带绿色茄子蒂当烟囱），` +
      `奶油色的墙壁，圆圆的木门和小窗户，窗户透出暖黄色的光，` +
      `门口点缀着小茄子和小花，${STYLE}，纯白色干净背景，主体完整居中，不贴边`
  },
  {
    name: 'app-icon.png',
    size: '1024x1024',
    format: 'png',
    prompt:
      `小程序应用图标：两只依偎在一起的可爱紫色小茄子，圆润饱满没有手脚，` +
      `带着可爱的表情，一大一小亲密靠在一起，奶油色到淡粉色的柔和纯色满幅背景，` +
      `居中构图简洁大方，${STYLE}`
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
