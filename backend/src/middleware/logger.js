/**
 * Simple request logger middleware
 */
const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
};

module.exports = logger;
