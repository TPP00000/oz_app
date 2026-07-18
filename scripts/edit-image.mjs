// scripts/edit-image.mjs - 图生图工具（本地工具，不属于小程序运行时）
// 用法: node scripts/edit-image.mjs <输入图路径> <输出图路径> "修改指令" [蒙版png路径]
// 保持构图不变地按指令修改图片（gpt-image-2 edits，约 $0.04/次）
// 蒙版：透明区域=允许重绘，不透明区域=保持原样
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadApiKey() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8')
  const match = env.match(/^OPENAI_API_KEY=(.+)$/m)
  if (!match || !match[1].trim()) {
    throw new Error('.env 中没有找到 OPENAI_API_KEY')
  }
  return match[1].trim()
}

async function main() {
  const [input, output, instruction, maskPath] = process.argv.slice(2)
  if (!input || !output || !instruction) {
    throw new Error('用法: node scripts/edit-image.mjs <输入图> <输出图> "修改指令" [蒙版png]')
  }
  const apiKey = loadApiKey()

  const isJpeg = ['.jpg', '.jpeg'].includes(extname(output).toLowerCase())
  const form = new FormData()
  form.append('model', 'gpt-image-2')
  form.append('prompt', instruction)
  form.append('size', '1536x1024')
  form.append('output_format', isJpeg ? 'jpeg' : 'png')
  if (isJpeg) {
    form.append('output_compression', '88')
  }
  form.append(
    'image',
    new Blob([readFileSync(input)], { type: 'image/jpeg' }),
    'input.jpg'
  )
  if (maskPath) {
    form.append(
      'mask',
      new Blob([readFileSync(maskPath)], { type: 'image/png' }),
      'mask.png'
    )
  }

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
  writeFileSync(output, buf)
  process.stdout.write(`OK ${output} (${Math.round(buf.length / 1024)}KB)\n`)
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`)
  process.exitCode = 1
})
