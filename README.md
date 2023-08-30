<div align="center">
	<h1 align="center">imagemin</h1>
	<p align="center">
		画像のwebp化・最適化・svgの最適化を行うスクリプト
	</p>
</div>

## 参考

https://sharp.pixelplumbing.com/

## インストール

`yarn add sharp glob path fs-extra svgo zlib commander`

## 実行例

`node ./scripts/convertImage.mjs -i ./in -o ./out -w -t`

## オプション

| ショートハンド | オプション         | 処理内容                                                                     |
| -------------- | ------------------ | ---------------------------------------------------------------------------- |
| -i             | --input `<string>` | ソースディレクトリ（必須）                                                   |
| -o             | --out `<string>`   | 出力先ディレクトリ（必須）                                                   |
| -m             | --minify           | 画像の最適化を行う（同一抵張子での変換）(default：false）                    |
| -w             | --webp             | webp化を行う(default：false）                                                |
| -a             | --webp-suffix-add  | webp化の際、拡張子を書き換え（false）するか追加（true）するか(default:false) |
| -v             | --svg              | svgの最適化を行う (default：false)                                           |
| -z             | --svgz             | svgzを出力する（default:false）                                              |
| -n             | --nosvg            | svgzを出力した場合、svgは出力しない（default:false）                         |
| -t             | --truncate         | 出力先のディレクトリを空にする（default:false）                              |
| -h             | --help             | オプションコマンドの一覧を表示する                                           |

## ヘルプ

`node ./scripts/convertImage.mjs -h`
