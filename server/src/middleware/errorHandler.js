/**
 * Global error handler middleware.
 * Catches anything passed to next(err) and returns a safe JSON response.
 */
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message || err, err.stack);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
