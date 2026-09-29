module.exports = {
  apps: [
    {
      name: 'simuni-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        PORT: 3001
      }
    }
  ]
};
