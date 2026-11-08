function log(level, event, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details
  }));
}

module.exports = {
  info: (event, details) => log('INFO', event, details),
  warn: (event, details) => log('WARN', event, details),
  error: (event, details) => log('ERROR', event, details)
};