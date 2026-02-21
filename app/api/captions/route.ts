import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, unlink, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Lyric } from "@/app/types"

const execFileAsync = promisify(execFile)
const CACHE_DIR = join(process.cwd(), ".cache", "captions")

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("v")
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 })
  }

  // Check cache first
  const cached = await loadCache(videoId)
  if (cached) return NextResponse.json(cached)

  const captions = await fetchCaptions(videoId)
  if (!captions) {
    return NextResponse.json(
      { error: "No captions found for this video" },
      { status: 404 }
    )
  }

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
      { error: "Failed to parse captions" },
      { status: 500 }
    )
  }

  // Save to cache
  await saveCache(videoId, lyrics)

  return NextResponse.json(lyrics)
}

// --- Cache ---

async function loadCache(videoId: string): Promise<Lyric[] | null> {
  try {
    const data = await readFile(join(CACHE_DIR, `${videoId}.json`), "utf-8")
    return JSON.parse(data) as Lyric[]
  } catch {
    return null
  }
}

async function saveCache(videoId: string, lyrics: Lyric[]): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(
      join(CACHE_DIR, `${videoId}.json`),
      JSON.stringify(lyrics, null, 2)
    )
  } catch (e) {
    console.error("cache write error:", e)
  }
}

// --- Caption Fetch ---

type RawCaption = { start: number; dur: number; text: string }

async function fetchCaptions(videoId: string): Promise<RawCaption[] | null> {
  // Strategy 1: innertube ANDROID API
  const innertube = await fetchViaInnertube(videoId)
  if (innertube) return innertube

  // Strategy 2: yt-dlp subprocess fallback
  return fetchViaYtDlp(videoId)
}

async function fetchViaInnertube(videoId: string): Promise<RawCaption[] | null> {
  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "19.09.37",
              androidSdkVersion: 30,
              hl: "en",
            },
          },
        }),
      }
    )
    const data = await res.json()
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!tracks || tracks.length === 0) return null

    const track =
      tracks.find((t: { languageCode: string }) => t.languageCode === "en") ??
      tracks.find((t: { languageCode: string }) => t.languageCode === "ja") ??
      tracks[0]

    // Auto-generated subs return format 3 by default
    const capRes = await fetch(track.baseUrl)
    const xml = await capRes.text()
    if (!xml || xml.length === 0) return null

    // Try format 3 first (<p t="ms" d="ms">), then srv1 (<text start="" dur="">)
    return parseFormat3Xml(xml) ?? parseSrv1Xml(xml)
  } catch (e) {
    console.error("innertube error:", e)
    return null
  }
}

async function fetchViaYtDlp(videoId: string): Promise<RawCaption[] | null> {
  const outPath = join(tmpdir(), `neage-${videoId}`)
  try {
    await execFileAsync("yt-dlp", [
      "--write-auto-sub",
      "--sub-lang", "ja,en",
      "--sub-format", "srv1",
      "--skip-download",
      "-o", outPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 30000 })

    for (const lang of ["ja", "en"]) {
      const file = `${outPath}.${lang}.srv1`
      try {
        const xml = await readFile(file, "utf-8")
        await unlink(file).catch(() => {})
        const parsed = parseSrv1Xml(xml)
        if (parsed) return parsed
      } catch {
        // file doesn't exist
      }
    }
    return null
  } catch (e) {
    console.error("yt-dlp error:", e)
    return null
  } finally {
    for (const lang of ["ja", "en"]) {
      await unlink(`${outPath}.${lang}.srv1`).catch(() => {})
    }
  }
}

// --- XML Parsers ---

function parseSrv1Xml(xml: string): RawCaption[] | null {
  const entries: RawCaption[] = []
  const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
  let m
  while ((m = regex.exec(xml)) !== null) {
    const text = decodeXml(m[3])
    if (text) entries.push({ start: parseFloat(m[1]), dur: parseFloat(m[2]), text })
  }
  return entries.length > 0 ? entries : null
}

function parseFormat3Xml(xml: string): RawCaption[] | null {
  const entries: RawCaption[] = []
  const regex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g
  let m
  while ((m = regex.exec(xml)) !== null) {
    const text = decodeXml(m[3])
    if (text) {
      entries.push({
        start: parseInt(m[1]) / 1000,
        dur: parseInt(m[2]) / 1000,
        text,
      })
    }
  }
  return entries.length > 0 ? entries : null
}

function decodeXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, " ")
    .trim()
}

// --- Gemini Parse ---

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
- Remove empty lines, pure instrumental markers like "[Music]", "[Musik]", "(applause)", etc.
- Keep the timing accurate
- For romaji field: only use a-z, 0-9, spaces, apostrophes, commas, hyphens, periods

Return ONLY the JSON array, no markdown fences, no explanation.`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const clean = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "")
    const parsed = JSON.parse(clean) as Lyric[]
    return parsed.length > 0 ? parsed : null
  } catch (e) {
    console.error("Gemini parse error:", e)
    return null
  }
}
