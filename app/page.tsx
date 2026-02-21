"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

function extractVideoId(input: string): string | null {
  // youtu.be/ID
  const short = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (short) return short[1]
  // youtube.com/watch?v=ID
  const long = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (long) return long[1]
  // bare ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return null
}

export default function Home() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractVideoId(url)
    if (!id) {
      setError("Invalid YouTube URL")
      return
    }
    router.push(`/play/${id}`)
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">
        <span className="text-pink-500">音上げ</span> NeAge
      </h1>
      <p className="text-gray-400 text-center max-w-md">
        Lyrics Typing x Hand Gesture Action Game
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-lg flex flex-col gap-4">
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError("") }}
          placeholder="YouTube URL or Video ID"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg font-bold text-lg"
        >
          Play
        </button>
      </form>

      <div className="text-gray-500 text-sm text-center mt-4">
        <p>Paste a YouTube URL with subtitles to start typing along</p>
      </div>
    </main>
  )
}
