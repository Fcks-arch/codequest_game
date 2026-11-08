const db = require('../config/db');
const logger = require('./logger');

async function recordAudit({
  actorId,
  action,
  recordType,
  recordId,
  details = {}
}) {
  logger.info('AUDIT_WRITE_STARTED', {
    actorId: actorId ?? null,
    action,
    recordType,
    recordId: String(recordId)
  });

  try {
    const [result] = await db.query(
      `INSERT INTO audit_logs
       (actor_id, action, record_type, record_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        actorId ?? null,
        action,
        recordType,
        String(recordId),
        JSON.stringify(details)
      ]
    );

    logger.info('AUDIT_WRITE_SUCCESS', {
      action,
      recordId: String(recordId),
      insertId: result.insertId
    });

    return result;
  } catch (error) {
    logger.error('AUDIT_WRITE_FAILED', {
      action,
      recordType,
      errorCode: error.code ?? 'UNKNOWN',
      message: error.message
    });

    throw error;
  }
}

module.exports = recordAudit;