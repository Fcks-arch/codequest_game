import { getLocallyCompletedLessonIds } from './GameStateManager'

export function completedLessonIds(progress) {
  return new Set(
    (progress || [])
      .filter(item => item.phase === 'completed')
      // The current API calls these lessons, while older activity APIs use
      // activity_id. Accept both so the unlock UI always reflects saved work.
      .map(item => Number(item.lesson_id ?? item.activity_id))
      .filter(Number.isFinite)
  )
}

export function completedLessonIdsWithLocalFallback(progress) {
  const completed = completedLessonIds(progress)
  getLocallyCompletedLessonIds().forEach(id => completed.add(id))
  return completed
}

export function completedModuleCounts(progress) {
  const counts = new Map()
  ;(progress || [])
    .filter(item => item.phase === 'completed' && Number.isFinite(Number(item.module_id)))
    .forEach(item => {
      const moduleId = Number(item.module_id)
      counts.set(moduleId, (counts.get(moduleId) || 0) + 1)
    })
  return counts
}

export function isActivityUnlocked(index, activities, completedIds) {
  if (index === 0) return true
  const previousActivity = activities[index - 1]
  return !!previousActivity && completedIds.has(Number(previousActivity.id))
}

export function isModuleCleared(module, completedIds) {
  if (!module || !module.activities || module.activities.length === 0) return false
  return module.activities.every(activity => completedIds.has(Number(activity.id)))
}

// Single source of truth for island (module) lock/unlock state, used by both
// the island map and the activity list so they never disagree.
//
// Rule: island N unlocks once every earlier island that actually has
// activities has been fully cleared — checked in syllabus order
// (order_index), not by id, since ids aren't guaranteed to be sequential.
// The first island is always unlocked. A teacher's manual override
// (user.unlocked_module) can force-unlock further islands. Islands with no
// activities yet ("coming soon" placeholders) are transparent for chaining:
// they don't block whichever island comes after them.
export function getIslandStatuses(modules, completedIds, unlockedOverride = 1, progress = []) {
  const statuses = new Map()
  const override = Number(unlockedOverride) || 1
  const completedCounts = completedModuleCounts(progress)
  const orderedModules = [...modules].sort((a, b) => Number(a.order_index) - Number(b.order_index))

  orderedModules.forEach((module, index) => {
    const isComplete = isModuleCleared(module, completedIds)
    const previousModule = orderedModules[index - 1]
    const previousCount = previousModule ? completedCounts.get(Number(previousModule.id)) || 0 : 0
    const previousComplete = previousModule && (
      isModuleCleared(previousModule, completedIds) ||
      previousCount >= previousModule.activities.length ||
      previousCount >= 10
    )
    const unlocked = index === 0 || previousComplete || override >= module.id

    statuses.set(module.id, {
      isComplete,
      unlocked,
      status: isComplete ? 'completed' : unlocked ? 'current' : 'locked'
    })

  })

  return statuses
}

export function findNextActivity(modules, progress, unlockedOverride = 1) {
  const completed = completedLessonIds(progress)
  const statuses = getIslandStatuses(modules, completed, unlockedOverride, progress)

  for (const module of modules) {
    if (!statuses.get(module.id)?.unlocked) continue

    for (let index = 0; index < module.activities.length; index++) {
      const activity = module.activities[index]
      if (completed.has(activity.id)) continue
      if (!isActivityUnlocked(index, module.activities, completed)) break
      return activity
    }
  }

  return null
}

export function countTotalActivities(modules) {
  return modules.reduce((sum, module) => sum + module.activities.length, 0)
}