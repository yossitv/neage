# Tech Stack

## Language & Runtime
- Primary Language: TypeScript
- Runtime: Node.js 20+
- Version: TypeScript 5.x

## Framework
- Main Framework: Next.js 15 (App Router)
- Additional Libraries:
  - `@mediapipe/tasks-vision` (ハンドジェスチャー検出)
  - `youtube-captions-scraper` or YouTube Data API (字幕取得)
  - `@google/generative-ai` (Gemini API - 字幕解析・ローマ字変換)

## Frontend
- Framework: React 19 (Next.js built-in)
- Language: TypeScript
- Styling: Tailwind CSS 4
- State Management: React useState/useRef (軽量で十分)

## Backend/API
- Framework: Next.js API Routes (App Router)
- Language: TypeScript
- 用途: YouTube字幕取得のプロキシのみ

## Database
- なし（v1ではスコアをセッション内のみ保持）

## Infrastructure
- Hosting: Vercel（初期）→ Google Cloud（将来検討）
- CI/CD: Vercel自動デプロイ（GitHub連携）
- Monitoring: なし（v1）

## External Services
- YouTube IFrame Player API: 動画再生
- YouTube字幕取得: `youtube-captions-scraper` or 字幕API
- Google Gemini API: 字幕データの解析・クリーニング・ローマ字変換
- MediaPipe Vision: ハンドランドマーク検出（クライアントサイド）

## Development Tools
- Package Manager: npm
- Testing: Vitest（必要に応じて）
- Linting: ESLint (Next.js built-in)
- Formatter: Prettier

## Justification

- **Next.js**: `/play/[id]` のファイルベースルーティングに最適。API Routeで字幕取得プロキシも実装可能。Vercelデプロイが最も簡単。
- **Tailwind CSS**: ユーティリティファーストで高速UI構築。3時間スプリントに最適。
- **MediaPipe (クライアントサイド)**: サーバー不要でリアルタイムハンドトラッキング。ブラウザ内で完結。
- **DB不要**: スコアはセッション限りなので永続化不要。認証も不要。最小構成。
