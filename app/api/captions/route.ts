import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Lyric } from "@/app/types"

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("v")
  if (!videoId) {
    return NextResponse.json({ error: "Missing ?v= parameter" }, { status: 400 })
  }

  // 1. Fetch YouTube page to extract caption track URL
  const captions = await fetchCaptions(videoId)
  if (!captions) {
    return NextResponse.json(
      { error: "No captions found for this video" },
      { status: 404 }
    )
  }

  // 2. Send to Gemini for cleanup + romaji conversion
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    )
  }

  const lyrics = await parseWithGemini(apiKey, captions)
  if (!lyrics) {
    return NextResponse.json(
      { error: "Failed to parse captions with Gemini" },
      { status: 500 }
    )
  }

  return NextResponse.json(lyrics)
}

type RawCaption = { start: number; dur: number; text: string }

async function fetchCaptions(videoId: string): Promise<RawCaption[] | null> {
  try {
    // Fetch YouTube watch page to extract player response
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
    const html = await res.text()

    // Extract ytInitialPlayerResponse
    const match = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});(?:\s*var\s|\s*<\/script>)/
    )
    if (!match) return null

    const playerResponse = JSON.parse(match[1])
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!captionTracks || captionTracks.length === 0) return null

    // Prefer English, then first available
    const track =
      captionTracks.find((t: { languageCode: string }) => t.languageCode === "en") ??
      captionTracks[0]
    const captionUrl = track.baseUrl

    // Fetch the actual captions XML
    const captionRes = await fetch(captionUrl)
    const xml = await captionRes.text()

    // Parse XML: <text start="1.23" dur="4.56">content</text>
    const entries: RawCaption[] = []
    const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
    let m
    while ((m = regex.exec(xml)) !== null) {
      entries.push({
        start: parseFloat(m[1]),
        dur: parseFloat(m[2]),
        text: decodeXmlEntities(m[3].replace(/<[^>]+>/g, "").trim()),
      })
    }
    return entries.length > 0 ? entries : null
  } catch (e) {
    console.error("fetchCaptions error:", e)
    return null
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, " ")
}

async function parseWithGemini(
  apiKey: string,
  captions: RawCaption[]
): Promise<Lyric[] | null> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const captionJson = JSON.stringify(
    captions.map((c) => ({ s: c.start, d: c.dur, t: c.text }))
  )

  const prompt = `You are a lyrics processing engine for a typing game.

Given these YouTube captions (JSON array with s=startTime, d=duration, t=text):
${captionJson}

Convert them into a JSON array for a typing game. Each element must have:
- "text": the original lyric line (cleaned up, no HTML tags)
- "romaji": the typing target in lowercase ASCII. For English text, just lowercase it. For Japanese text, convert to romaji. Remove special characters except apostrophes, commas, and hyphens.
- "startTime": start time in seconds (number)
- "endTime": end time in seconds (number, = startTime + duration)

Rules:
- Merge very short consecutive captions (< 0.5s) into one line if they form a single phrase
- Split very long lines (> 60 chars) into multiple entries with proportional timing
- Remove empty lines, pure instrumental markers like "[Music]", "(applause)", etc.
- Keep the timing accurate
- For romaji field: only use a-z, 0-9, spaces, apostrophes, commas, hyphens, periods

Return ONLY the JSON array, no markdown fences, no explanation.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    // Strip markdown fences if present
    const clean = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "")
    const parsed = JSON.parse(clean) as Lyric[]
    return parsed.length > 0 ? parsed : null
  } catch (e) {
    console.error("Gemini parse error:", e)
    return null
  }
}
