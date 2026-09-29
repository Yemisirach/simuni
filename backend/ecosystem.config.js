module.exports = {
  apps: [
    {
      name: 'simuni-backend',
      script: 'dist/src/main.js',
      instances: 1, // Single instance required for WebSockets unless using RedisAdapter
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      }
    }
  ]
};
