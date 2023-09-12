import sharp from 'sharp'
import { globSync } from 'glob'
import path from 'path'
import fse from 'fs-extra'
import { Command } from 'commander'
import { optimize, loadConfig } from 'svgo'
import zlib from 'zlib'

// 引数設定
const program = new Command()
program
  .requiredOption('-i, --input <string>', 'ソースディレクトリ（必須）')
  .requiredOption('-o, --out <string>', '出力先ディレクトリ（必須）')
  .option('-m, --minify', '画像の最適化を行う（同一拡張子での変換）', false)
  .option('-w, --webp', 'webp化を行う', false)
  .option(
    '-a, --webp-suffix-add',
    'webp化の際、拡張子を書き換え（false）するか追加（true）するか',
    false
  )
  .option('-v, --svg', 'svgの最適化を行う', false)
  .option('-z, --svgz', 'svgzを出力する', false)
  .option('-n, --nosvg', 'svgzを出力した場合、svgは出力しない', false)
  .option('-t, --truncate', '出力先のディレクトリを空にする', false)
  .parse()

/**
 * 設定項目ここから
 */
// 変換対象拡張子とエンコーダーの設定
const ENCODER_MAP_FROM_EXTENSION = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
}

// 変換オプション（参考： https://sharp.pixelplumbing.com/api-output）
const ENCODER_OPTIONS = {
  png: {
    compressionLevel: 9,
    adaptiveFiltering: true,
    progressive: true,
    palette: true,
  },
  jpg: {
    quality: 90,
  },
  webp: {
    png: {
      lossless: true
    },
    jpg: {
      quality: 90
    }
  }
}

/**
 * 設定項目ここまで
 */

// オプション項目読み取り
const Options = program.opts()
const IMAGE_DIR = Options.input
const OUTPUT_DIR = Options.out
const DO_OPTIMIZE = Options.minify
const DO_OPTIMIZE_SVG = Options.svg
const ENCODE_WEBP = Options.webp
const WEBP_SUFFIX_ADD = Options.webpSuffixAdd
const ENCODE_SVGZ = Options.svgz
const NO_SVG = ENCODE_SVGZ && Options.nosvg
const TRUNCATE_BEFORE = Options.truncate
const svgoConfig = await loadConfig() // svgo.config.jsから設定を取得

// ソースディレクトリからファイル一覧を取得
let imageFileList = []
globSync(IMAGE_DIR + '/**/*.*').map(function (file) {
  // windows対応
  file = './' + file.replace(/\\/g, '/')
  imageFileList.push(file.replace(IMAGE_DIR, '.'))
})

// 出力先ディレクトリを空にする
if (TRUNCATE_BEFORE) {
  fse.emptyDirSync(OUTPUT_DIR)
}

// 変数初期化
const ts_start = Date.now()
let ts_worker_start = Date.now()
let ts_worker_end
let targetFileNum = imageFileList.length
let encodedFileNum = 1

await Promise.all(
  imageFileList.map(async (imagePath) => {
    // ファイルの拡張子を取得
    const fileExtension = path.extname(imagePath).substring(1).toLowerCase()
    // ソースパスと出力パスを取得
    const sourcePath = path.join(IMAGE_DIR, imagePath)
    const destinationPath = path.join(OUTPUT_DIR, imagePath)

    // destinationPathのディレクトリがなければ作成
    await fse.ensureDir(path.dirname(destinationPath))

    // 拡張子からエンコーダーを取得
    const encoder = ENCODER_MAP_FROM_EXTENSION[fileExtension]
    // SVGかどうか
    const isSvg = fileExtension === 'svg'

    // 変数の初期化
    let action = ''
    let isCopy = !encoder && !isSvg
    let encodeOptions = {}
    let binaryData = ''

    if (encoder !== '') {
      // エンコーダーの設定
      if (DO_OPTIMIZE) {
        encodeOptions[encoder] = ENCODER_OPTIONS[encoder]
      }
      if (ENCODE_WEBP) {
        encodeOptions['webp'] = ENCODER_OPTIONS['webp']
      }
      if (Object.keys(encodeOptions).length === 0) {
        isCopy = true
      }
    }

    if (isCopy) {
      // エンコード対象外
      await fse.copy(sourcePath, destinationPath)
      action = 'copied'
    } else if (isSvg) {
      // SVGの処理
      binaryData = fse.readFileSync(sourcePath)
      if (DO_OPTIMIZE_SVG) {
        binaryData = optimize(binaryData, svgoConfig)
        binaryData = binaryData.data
      }
      if (!NO_SVG) {
        await fse.outputFile(destinationPath, binaryData)
        action += 'optimized'
      }
      if (ENCODE_SVGZ) {
        await zlib.gzip(binaryData, async (__, svgzData) => {
          await fse.outputFile(destinationPath + 'z', svgzData)
        })
        if (action !== '') {
          action += ' and '
        }
        action += 'encoded to svgz'
      }
    } else {
      // 最適化を行う
      if (DO_OPTIMIZE) {
        // encoder と encodeOptions を指定して最適化
        await sharp(sourcePath)
          .toFormat(encoder, ENCODER_OPTIONS[encoder])
          .toFile(destinationPath)
        action += 'optimized'
      }
      if (ENCODE_WEBP) {
        // webp と encodeOptions を指定して最適化
        const destinationPathWebp = WEBP_SUFFIX_ADD
          ? destinationPath + '.webp'
          : destinationPath.slice(0, fileExtension.length * -1) + 'webp'

        await sharp(sourcePath)
          .webp(ENCODER_OPTIONS['webp'][encoder])
          .toFile(destinationPathWebp)
        if (action !== '') {
          action += ' and '
        }
        action += 'encoded to webp'
      }
    }

    // 変換結果表示
    ts_worker_end = Date.now()
    console.info(
      '[',
      encodedFileNum++,
      '/',
      targetFileNum,
      ']',
      imagePath,
      'is',
      action,
      '(',
      ts_worker_end - ts_worker_start,
      'ms',
      ')'
    )
    ts_worker_start = ts_worker_end
  })
)

// 結果表示
console.info('👍🏻done!', '(', 'total:', ts_worker_end - ts_start, 'ms', ')')
