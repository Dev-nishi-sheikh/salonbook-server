module.exports = {
  apps: [
    {
      name: 'salonbook-server',
      cwd: '/var/www/salonbook/server',
      script: 'dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/salonbook/server-error.log',
      out_file: '/var/log/salonbook/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'salonbook-client',
      cwd: '/var/www/salonbook/client/.next/standalone',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/var/log/salonbook/client-error.log',
      out_file: '/var/log/salonbook/client-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 3000,
      watch: false,
    },
  ],
};