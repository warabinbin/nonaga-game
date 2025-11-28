# Nonaga

六角形ボード上で行う2人用アブストラクトストラテジーゲームのReact実装です。

![Nonaga Game](https://img.shields.io/badge/React-Game-61DAFB?style=flat-square&logo=react)
![Mobile Ready](https://img.shields.io/badge/Mobile-Ready-green?style=flat-square)

## 🎮 プレイする

**👉 [https://warabinbin.github.io/nonaga-game/](https://warabinbin.github.io/nonaga-game/)**

スマホ・タブレット・PCのブラウザで遊べます。

## ゲーム概要

Nonagaは、19個の六角形ディスクで構成されるボード上で、3つの駒を操作して勝利を目指すゲームです。

### 勝利条件

自分の3つの駒が以下のいずれかの形に並んだら勝利：

- **一直線** - 3つの駒が直線上に連続して並ぶ
- **三角形** - 3つの駒が互いに隣接する三角形を形成
- **V字** - 中央の駒が両側の2つの駒と隣接（両端は非隣接）

### ゲームの流れ

各ターンは2つのフェーズで構成されます：

1. **駒の移動** - 自分の駒を1つ選び、6方向のいずれかに直線移動（ボード端か他の駒にぶつかるまで）
2. **ディスクの移動** - ボード外周の空きディスクを1つ選び、2つ以上のディスクに隣接する位置に移動

### 制約

- 相手が直前に動かしたディスクは移動不可
- ディスク移動でボードが分断されてはならない

## 🚀 GitHub Pagesへのデプロイ

1. このリポジトリをフォークまたはクローン
2. リポジトリの Settings → Pages を開く
3. Source を "Deploy from a branch" に設定
4. Branch を "main" / "(root)" に設定
5. Save をクリック
6. 数分後に `https://[username].github.io/[repo-name]/` でアクセス可能

## 技術スタック

- React 18 (CDN)
- SVG描画
- 六角形座標系 (Axial Coordinates)
- レスポンシブデザイン（スマホ対応）

## ファイル構成

```
├── index.html           # メインページ（スマホ対応版）
├── nonaga.jsx           # Reactコンポーネント（開発用）
├── nonaga.test.jsx      # 基本テスト
├── nonaga.win.test.jsx  # 勝利判定テスト
├── nonaga.win-conditions.test.jsx  # 勝利条件の詳細テスト
├── nonaga.phase2.test.jsx         # ディスク移動フェーズテスト
└── README.md
```

## ライセンス

MIT License
