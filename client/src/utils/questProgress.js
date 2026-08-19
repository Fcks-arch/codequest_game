export function completedLessonIds(progress) {
  return new Set(
    progress.filter(item => item.phase === 'completed').map(item => item.lesson_id)
  )
}

export function isActivityUnlocked(index, activities, completedIds) {
  if (index === 0) return true
  const previousActivity = activities[index - 1]
  return !!previousActivity && completedIds.has(previousActivity.id)
}

export function findNextActivity(modules, progress) {
  const completed = completedLessonIds(progress)
  let previousComplete = true

  for (const module of modules) {
    const activityCount = module.activities.length
    const moduleUnlocked = previousComplete && activityCount > 0
    if (!moduleUnlocked) break

    for (let index = 0; index < module.activities.length; index++) {
      const activity = module.activities[index]
      if (completed.has(activity.id)) continue
      if (!isActivityUnlocked(index, module.activities, completed)) break
      return activity
    }

    previousComplete = module.activities.length > 0 &&
      module.activities.every(activity => completed.has(activity.id))
  }

  return null
}

export function countTotalActivities(modules) {
  return modules.reduce((sum, module) => sum + module.activities.length, 0)
}
