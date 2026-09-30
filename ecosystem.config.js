const path = require('path');

module.exports = {
  apps: [
    {
      name: 'simuni-backend',
      script: path.resolve(__dirname, 'backend/dist/src/main.js'),
      cwd: path.resolve(__dirname, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
    },
    {
      name: 'simuni-web',
      script: path.resolve(__dirname, 'web/node_modules/next/dist/bin/next'),
      args: 'dev -p 3011',
      cwd: path.resolve(__dirname, 'web'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3011,
      },
    },
    {
      name: 'simuni-mobile-web',
      script: path.resolve(__dirname, 'mobile/serve-pwa.js'),
      cwd: path.resolve(__dirname, 'mobile'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 8082,
      },
    },
  ],
};
