import axios from 'axios'

export const MAX_MAP_TILES = 15
const COMPLETED_LESSONS_KEY = 'codequest_completed_lessons'

function completedLessonsKey(userId) {
  return userId
    ? `${COMPLETED_LESSONS_KEY}_${userId}`
    : null
}

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
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(`${COMPLETED_LESSONS_KEY}_`))
      .forEach(key => localStorage.removeItem(key))
    localStorage.removeItem(COMPLETED_LESSONS_KEY)
  } catch (_) {}
}

function readCompletedLessons(userId) {
  const key = completedLessonsKey(userId)
  if (!key) return []

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
  } catch (_) {
    return []
  }
}

export function getLocallyCompletedLessonIds(userId) {
  return new Set(readCompletedLessons(userId))
}

export function isLessonCompleted(lessonId, userId) {
  return getLocallyCompletedLessonIds(userId).has(Number(lessonId))
}

export function markLessonCompleted(lessonId, userId) {
  const id = Number(lessonId)
  const key = completedLessonsKey(userId)
  if (!Number.isFinite(id) || !key) return
  const completed = new Set(readCompletedLessons(userId))
  completed.add(id)
  try {
    localStorage.setItem(key, JSON.stringify([...completed]))
  } catch (_) {}
}

export function completeLesson(lessonId, userId) {
  const id = Number(lessonId)
  if (!Number.isFinite(id)) return Promise.resolve()
  markLessonCompleted(id, userId)
  return axios.post('/api/progress/complete', { lesson_id: id }).catch(() => {})
}
