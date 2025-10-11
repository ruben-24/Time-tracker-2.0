export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString()
}
