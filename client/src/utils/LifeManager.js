export class LifeManager {
  constructor({
    maxLives = 3,
    onLivesChange,
    onHit,
    onNextQuestion,
    triggerLightningDeath,
    showGameOver
  } = {}) {
    this.maxLives = maxLives
    this.lives = maxLives

    this.onLivesChange = onLivesChange
    this.onHit = onHit
    this.onNextQuestion = onNextQuestion
    this.triggerLightningDeath =
      triggerLightningDeath
    this.showGameOver = showGameOver

    this.isDead = false
    this.processing = false
  }

  reset() {
    this.lives = this.maxLives
    this.isDead = false
    this.processing = false

    this.onLivesChange?.(this.lives)
  }

  async wrongAnswer() {
    if (this.isDead || this.processing) {
      return
    }

    this.processing = true

    this.lives = Math.max(
      0,
      this.lives - 1
    )

    // Update React UI.
    this.onLivesChange?.(this.lives)

    // Hit sound / effect.
    this.onHit?.()

    /*
     * Player still has lives.
     */
    if (this.lives > 0) {
      this.processing = false
      this.onNextQuestion?.()
      return
    }

    /*
     * Third wrong answer.
     */
    this.isDead = true

    try {
      /*
       * Wait for the lightning/electrocution
       * animation to finish.
       */
      await this.triggerLightningDeath?.()

      /*
       * Only show Game Over after the
       * animation has completed.
       */
      this.showGameOver?.()
    } finally {
      this.processing = false
    }
  }
}