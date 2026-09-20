#!/bin/bash
# ==============================================================================
# Simuni Production Deployment Script for Ubuntu 22.04 / 24.04 LTS
# Run this script on your fresh production VPS (AWS, DigitalOcean, Hetzner, etc.)
# ==============================================================================
set -e

echo "🚀 Starting Simuni Production Setup..."

# 1. Update system & install essentials
echo "📦 Installing system dependencies..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx

# 2. Install Node.js 20.x & PM2
if ! command -v node &> /dev/null; then
    echo "🟩 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
sudo npm install -g pm2
pm2 startup

# 3. Install Docker (for PostgreSQL / PostGIS and OSRM)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# 4. Start PostgreSQL (with PostGIS extension) via Docker
echo "🐘 Starting PostgreSQL database..."
# Check if container exists, if not run it
if [ ! "$(sudo docker ps -q -f name=simuni-db)" ]; then
    if [ "$(sudo docker ps -aq -f status=exited -f name=simuni-db)" ]; then
        sudo docker rm simuni-db
    fi
    sudo docker run --name simuni-db \
        -e POSTGRES_USER=simuni_admin \
        -e POSTGRES_PASSWORD=simuni_secure_pass_123 \
        -e POSTGRES_DB=simuni_prod \
        -p 5432:5432 \
        -d postgis/postgis:15-3.3
fi

export DATABASE_URL="postgresql://simuni_admin:simuni_secure_pass_123@localhost:5432/simuni_prod?schema=public"

# 5. Build and Start the Backend (NestJS)
echo "⚙️ Building Backend API..."
cd backend
# Create .env file for backend
cat <<EOT > .env
PORT=3000
DATABASE_URL="${DATABASE_URL}"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL="http://localhost:3000"
EOT

npm install --legacy-peer-deps --ignore-scripts
npx prisma generate
npx prisma db push
npm run build
pm2 start dist/main.js --name "simuni-api"
cd ..

# 6. Build and Start the Web Dashboard (Next.js)
echo "🌐 Building Web Dashboard..."
cd web
# Create .env file for frontend
cat <<EOT > .env
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
EOT

npm install
npm run build
pm2 start npm --name "simuni-web" -- start
cd ..

# 7. Configure Nginx Reverse Proxy
echo "🛡️ Configuring Nginx..."
sudo cat <<EOT > /etc/nginx/sites-available/simuni
server {
    listen 80;
    server_name your-domain.com; # <--- CHANGE THIS LATER

    # Web Dashboard (Next.js)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API & WebSockets (NestJS)
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOT

sudo ln -sf /etc/nginx/sites-available/simuni /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 8. Save PM2 state
pm2 save

echo "✅ Deployment Setup Complete!"
echo "Database is running in Docker on port 5432."
echo "API is running on PM2 (Port 3000)."
echo "Web is running on PM2 (Port 3001)."
echo ""
echo "Next Steps:"
echo "1. Change 'your-domain.com' in /etc/nginx/sites-available/simuni to your actual server IP or domain."
echo "2. Restart Nginx: sudo systemctl restart nginx"
echo "3. Run 'sudo certbot --nginx' to secure your server with HTTPS."
