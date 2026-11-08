
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 6,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many failed login attempts.',
            attemptsRemaining: 0,
            retryAfterSeconds: Math.max(
                1,
                Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
            )
        });
    }
});

module.exports = loginLimiter;
