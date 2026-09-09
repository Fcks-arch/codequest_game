import island2Lessons from './island2Lessons'
import island3Lessons from './island3Lessons'

export const islandLessons = {
  2: island2Lessons,
  3: island3Lessons
}

export const getLessonById = (lessonId) => {
  const id = Number(lessonId)
  if (!Number.isFinite(id)) return null

  const allLessons = Object.values(islandLessons).flat()
  return allLessons.find(lesson => Number(lesson.id) === id) || null
}

export const getIsland3LessonByRelativeId = (relativeId) => {
  const id = Number(relativeId)
  if (!Number.isInteger(id) || id < 1 || id > island3Lessons.length) return null
  return island3Lessons[id - 1] || null
}

export const getLessonByIslandAndLevel = (islandId, levelId) => {
  const moduleId = Number(islandId)
  const level = Number(levelId)
  const lessons = islandLessons[moduleId] || []
  if (!Number.isFinite(moduleId) || !Number.isFinite(level)) return null

  return lessons.find((lesson, index) => {
    const lessonModuleId = Number(lesson.moduleId ?? lesson.module_id ?? lesson.islandId)
    const relativeId = Number(lesson.relativeId)
    return lessonModuleId === moduleId && (relativeId === level || Number(lesson.id) === level || index + 1 === level)
  }) || null
}

export const getLessonsByIsland = (islandId) => islandLessons[Number(islandId)] || []
export const lessonsByIsland = islandLessons

export default islandLessons
