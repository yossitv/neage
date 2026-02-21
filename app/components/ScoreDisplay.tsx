"use client"

type Props = {
  score: number
  correctCount: number
  totalCount: number
  hype: number
}

export function ScoreDisplay({ score, correctCount, totalCount, hype }: Props) {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  return (
    <div className="flex gap-6 text-lg font-mono">
      <div>
        <span className="text-gray-400">SCORE </span>
        <span className="text-yellow-400 text-2xl">{score}</span>
      </div>
      <div>
        <span className="text-gray-400">ACC </span>
        <span className="text-blue-400">{accuracy}%</span>
      </div>
      <div>
        <span className="text-gray-400">HYPE </span>
        <span className="text-pink-400">x{hype.toFixed(1)}</span>
      </div>
    </div>
  )
}
