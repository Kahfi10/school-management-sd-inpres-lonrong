#!/bin/bash
# ==============================================================================
# Script Otomasi Setup Ubuntu Server di Oracle Cloud Free Tier
# Dijalankan via Termius: bash setup-oracle.sh
# ==============================================================================

set -e

echo "🚀 [1/6] Memperbarui sistem Ubuntu..."
sudo apt update && sudo apt upgrade -y

echo "📦 [2/6] Memasang Nginx, Git, Curl, dan Certbot SSL..."
sudo apt install -y nginx git curl ufw certbot python3-certbot-nginx

echo "🛡️  [3/6] Mengonfigurasi Firewall Oracle & Ubuntu (Membuka Port 80 & 443)..."
# Oracle Cloud Ubuntu secara default memiliki iptables yang sangat ketat
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

# UFW Firewall
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable

echo "📂 [4/6] Membuat direktori web /var/www/sdlonrong..."
sudo mkdir -p /var/www/sdlonrong/dist
sudo chown -R $USER:www-data /var/www/sdlonrong
sudo chmod -R 775 /var/www/sdlonrong

echo "🌐 [5/6] Memasang konfigurasi Nginx..."
if [ -f /var/www/sdlonrong/deploy/nginx.conf ]; then
    sudo cp /var/www/sdlonrong/deploy/nginx.conf /etc/nginx/sites-available/sdlonrong
else
    echo "⚠️ File deploy/nginx.conf belum ada di /var/www/sdlonrong. Silakan unggah lewat Termius SFTP."
fi

echo "✅ [6/6] Selesai!"
echo "Langkah selanjutnya:"
echo "1. Pastikan domain DuckDNS sudah mengarah ke IP Publik Oracle Anda."
echo "2. Edit server_name di /etc/nginx/sites-available/sdlonrong sesuai domain DuckDNS Anda."
echo "3. Jalankan Certbot SSL: sudo certbot --nginx -d DOMAIN_ANDA.duckdns.org"
echo "4. Reload Nginx: sudo systemctl reload nginx"
