import axios from 'axios'

export const MAX_MAP_TILES = 15
const COMPLETED_LESSONS_KEY = 'codequest_completed_lessons'

const LEVEL_START_SPAWNS = {
  1: { tileX: 0, tileY: 0 },
  2: { tileX: 2, tileY: 0 },
  3: { tileX: 7, tileY: 0 }
}

export function getLevelStartSpawn(levelId) {
  const id = Number(levelId)
  if (LEVEL_START_SPAWNS[id]) return { ...LEVEL_START_SPAWNS[id] }
  const tileX = ((7 + Math.max(0, id - 3) * 3) % MAX_MAP_TILES + MAX_MAP_TILES) % MAX_MAP_TILES
  return { tileX, tileY: 0 }
}

export function clearGameState() {
  try { localStorage.removeItem(COMPLETED_LESSONS_KEY) } catch (_) {}
}

function readCompletedLessons() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPLETED_LESSONS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch (_) {
    return []
  }
}

export function getLocallyCompletedLessonIds() {
  return new Set(readCompletedLessons())
}

export function isLessonCompleted(lessonId) {
  return getLocallyCompletedLessonIds().has(Number(lessonId))
}

export function markLessonCompleted(lessonId) {
  const id = Number(lessonId)
  if (!Number.isFinite(id)) return
  const completed = new Set(readCompletedLessons())
  completed.add(id)
  try {
    localStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify([...completed]))
  } catch (_) {}
}

export function completeLesson(lessonId) {
  const id = Number(lessonId)
  if (!Number.isFinite(id)) return Promise.resolve()
  markLessonCompleted(id)
  return axios.post('/api/progress/complete', { lesson_id: id }).catch(() => {})
}
