module.exports = {
  apps: [
    {
      name: 'workdocs-app',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // ВАЖНО: держим uploads вне рабочей папки релиза, чтобы CI/CD не стирал файлы
        // Укажите актуальный путь на сервере (создайте заранее с нужными правами)
        UPLOADS_DIR: '/var/www/workdocs_uploads',
      },
    },
  ],
}
