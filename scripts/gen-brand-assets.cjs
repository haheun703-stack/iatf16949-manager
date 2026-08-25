// ============================================================
// scripts/gen-brand-assets.cjs — 데일리Q 브랜드 자산 생성 (2026-08-25, 시안 C 게이지Q 확정)
//
// 무엇을 만드나 (원본 = resources/brand/*.svg · png/ico 손편집 금지, 이 스크립트로만 재생성):
//   build/icon.png                      512   electron-builder 일반용
//   build/icon.ico                      16·24·32·48·64·128·256 (7종)  윈도우 앱·설치파일 아이콘
//   resources/brand/mark-64.png,-256.png       바탕 없는 마크 사본(화면·문서용)
//
// 16·24·32 는 icon-small.svg(눈금 없는 단순판)에서, 48 이상은 icon.svg 에서 굽는다.
//   → 작은 치수에서 눈금·바늘이 뭉쳐 형태가 무너지던 C안의 약점을 ICO 안에서 해결한다.
//   윈도우가 치수에 맞는 판을 알아서 고른다.
//
// 왜 Electron GUI 모드인가: SVG 를 픽셀로 만들려면 렌더러가 필요하다. 저장소에 이미 Electron 이
//   있으므로 외부 도구(ImageMagick·sharp) 의존을 새로 만들지 않는다.
//   ⚠ ELECTRON_RUN_AS_NODE=1 를 붙이면 안 된다(창을 못 만든다). 셸에 남아 있으면 벗기고 부를 것.
//
// 왜 작은 치수를 직접 렌더하지 않나: 16x16 창은 윈도우 최소 창 크기 아래라 loadFile 이
//   ERR_FAILED 로 죽는다(2026-08-25 실측). 그래서 판마다 512 로 한 번만 굽고 축소한다.
//   렌더 2회로 끝나 빠르기도 하다.
//
// 구동: node_modules\electron\dist\electron.exe scripts\gen-brand-assets.cjs
// ============================================================
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')

const REPO = path.join(__dirname, '..')
const BRAND = path.join(REPO, 'resources', 'brand')
const BUILD = path.join(REPO, 'build')
const MASTER_PX = 512 // 모든 산출물의 원판 해상도
const tmpFiles = [] // 렌더용 임시 html — 창을 닫은 뒤 한꺼번에 지운다(살아 있으면 EBUSY)

// ICO 에 넣을 치수 → 어느 판에서 뽑을지
const ICO_SIZES = [
  { px: 16, from: 'small' },
  { px: 24, from: 'small' },
  { px: 32, from: 'small' },
  { px: 48, from: 'big' },
  { px: 64, from: 'big' },
  { px: 128, from: 'big' },
  { px: 256, from: 'big' }
]

/**
 * SVG 파일을 MASTER_PX 정사각 NativeImage 로 굽는다(투명 배경 유지).
 * ⚠ 창은 하나를 만들어 계속 쓴다 — 렌더마다 새 오프스크린 창을 만들면 두 번째부터
 *   loadFile 이 ERR_FAILED 로 죽는다(2026-08-25 실측).
 */
async function renderMaster(win, svgPath) {
  const svg = fs.readFileSync(svgPath, 'utf-8')
  const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent;width:${MASTER_PX}px;height:${MASTER_PX}px;overflow:hidden}
  svg{display:block;width:${MASTER_PX}px;height:${MASTER_PX}px}
</style>${svg}`

  // data: URL 로 싣지 않는다 — 주석까지 담긴 SVG 는 URL 길이 한계에 걸려 ERR_FAILED 가 난다.
  const tmpHtml = path.join(os.tmpdir(), `dailyq-brand-${path.basename(svgPath, '.svg')}.html`)
  fs.writeFileSync(tmpHtml, html, 'utf-8')
  tmpFiles.push(tmpHtml)

  await win.loadFile(tmpHtml)
  await new Promise((r) => setTimeout(r, 150)) // 그라데이션이 그려질 여유
  let img = await win.webContents.capturePage()

  // 화면 배율이 1 이 아니면 캡처가 확대돼 나온다(150% → 512 요청에 770). 정확히 되돌린다.
  const s = img.getSize()
  if (s.width !== MASTER_PX || s.height !== MASTER_PX) {
    img = img.resize({ width: MASTER_PX, height: MASTER_PX, quality: 'best' })
  }

  // 무음 실패 금지(35호) — 거의 전부 투명이면 렌더가 안 된 것이다.
  const bitmap = img.toBitmap()
  let opaque = 0
  for (let i = 3; i < bitmap.length; i += 4) if (bitmap[i] > 8) opaque++
  const ratio = opaque / (bitmap.length / 4)
  if (ratio < 0.05) {
    throw new Error(`${path.basename(svgPath)} 렌더 실패 — 불투명 비율 ${(ratio * 100).toFixed(1)}%`)
  }
  return { img, ratio }
}

const pngAt = (img, px) =>
  (px === MASTER_PX ? img : img.resize({ width: px, height: px, quality: 'best' })).toPNG()

/**
 * PNG 버퍼들을 ICO 한 파일로 묶는다.
 * ICO 구조 = ICONDIR(6) + ICONDIRENTRY(16)*n + 이미지 데이터.
 * Vista 이후 형식은 항목에 PNG 를 그대로 담을 수 있어 BMP 변환이 필요 없다.
 * 256px 은 폭/높이 바이트에 0 을 적는 것이 규약(1바이트로 256 을 못 적는다).
 */
function buildIco(entries) {
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2) // type 1 = icon
  dir.writeUInt16LE(entries.length, 4)

  let offset = 6 + entries.length * 16
  const dirEntries = []
  for (const e of entries) {
    const d = Buffer.alloc(16)
    d.writeUInt8(e.px >= 256 ? 0 : e.px, 0)
    d.writeUInt8(e.px >= 256 ? 0 : e.px, 1)
    d.writeUInt8(0, 2) // 팔레트 없음
    d.writeUInt8(0, 3) // reserved
    d.writeUInt16LE(1, 4) // color planes
    d.writeUInt16LE(32, 6) // bits per pixel
    d.writeUInt32LE(e.png.length, 8)
    d.writeUInt32LE(offset, 12)
    dirEntries.push(d)
    offset += e.png.length
  }
  return Buffer.concat([dir, ...dirEntries, ...entries.map((e) => e.png)])
}

// 화면 배율 1 고정 — app ready 전에 걸어야 적용된다.
app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.disableHardwareAcceleration()

app.whenReady().then(async () => {
  let win = null
  let code = 1
  try {
    fs.mkdirSync(BUILD, { recursive: true })
    const out = []

    win = new BrowserWindow({
      width: MASTER_PX,
      height: MASTER_PX,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      useContentSize: true,
      webPreferences: { offscreen: true }
    })

    // 원판 3장만 굽는다(창 하나 재사용)
    const big = await renderMaster(win, path.join(BRAND, 'icon.svg'))
    const small = await renderMaster(win, path.join(BRAND, 'icon-small.svg'))
    const mark = await renderMaster(win, path.join(BRAND, 'mark.svg'))
    console.log(
      `[brand] 원판 렌더 — icon ${(big.ratio * 100).toFixed(0)}% · icon-small ${(small.ratio * 100).toFixed(0)}% · mark ${(mark.ratio * 100).toFixed(0)}% (불투명 비율)`
    )

    // ① build/icon.png
    const iconPng = pngAt(big.img, 512)
    fs.writeFileSync(path.join(BUILD, 'icon.png'), iconPng)
    out.push(['build/icon.png', '512', iconPng.length])

    // ② build/icon.ico
    const entries = ICO_SIZES.map((s) => ({
      px: s.px,
      png: pngAt(s.from === 'small' ? small.img : big.img, s.px),
      from: s.from
    }))
    const ico = buildIco(entries)
    fs.writeFileSync(path.join(BUILD, 'icon.ico'), ico)
    out.push(['build/icon.ico', ICO_SIZES.length + '종', ico.length])
    for (const e of entries) out.push([`    ${e.px}px (${e.from === 'small' ? '단순판' : '표준판'})`, '', e.png.length])

    // ③ 바탕 없는 마크 사본
    for (const px of [64, 256]) {
      const png = pngAt(mark.img, px)
      fs.writeFileSync(path.join(BRAND, `mark-${px}.png`), png)
      out.push([`resources/brand/mark-${px}.png`, String(px), png.length])
    }

    console.log('[brand] 생성 완료')
    for (const [name, size, bytes] of out) {
      console.log(`  ${String(name).padEnd(32)} ${String(size).padEnd(5)} ${(bytes / 1024).toFixed(1)} KB`)
    }
    code = 0
  } catch (err) {
    console.error('[brand] 실패:', (err && err.message) || err)
    code = 1
  } finally {
    // ⚠ app.exit() 을 try 안에서 부르면 즉시 종료돼 이 정리가 아예 돌지 않는다(리뷰 8/25).
    //   종료 코드만 정해 두고, 창·임시 파일을 치운 뒤 마지막에 나간다.
    if (win) win.destroy()
    for (const f of tmpFiles) {
      try {
        fs.rmSync(f, { force: true })
      } catch {
        /* 임시 파일 잔류는 무해 */
      }
    }
    app.exit(code)
  }
})
