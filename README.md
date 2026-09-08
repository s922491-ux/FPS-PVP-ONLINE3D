# 3D FPS PVP — Cloudflare Original Site Edition

アクセス先をそのままゲームサイトにし、Cloudflare Workers + Durable Objects + Workers Static Assets で公開する版です。

## 特徴
- `/` でゲームサイトを直接表示
- WebSocket は `wss://` で同一ホストへ接続
- Quick Match で空きルームへ自動参加
- 2人以上になると自動で対戦開始
- 最大8人
- 120 weapons
- HP / shooting / death / respawn / reload / weapon selection synchronization
- room creation / join / ready / scoreboard / match result
- Three.js frontend is served as Workers Static Assets

## Cloudflareへ公開

1. Node.js 18+ を用意
2. `npm install`
3. `npx wrangler login`
4. `npm run deploy`

デプロイ後に表示される `workers.dev` URL がゲームURLです。

## 独自ドメイン
Cloudflare Dashboard の Workers & Pages からこのWorkerへCustom Domainを追加してください。
例: `https://play.example.com/`

## ローカル確認

```bash
npm install
npm run dev
```

## 注意
この版は小〜中規模の対戦をすぐ公開することを優先し、1つのDurable Objectでルーム群を管理しています。大規模化する場合は「1ルーム=1 Durable Object」へ分割するのが推奨です。
