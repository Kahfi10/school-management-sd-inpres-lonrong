#!/bin/bash
# ==============================================================================
# Script Pembaruan Otomatis IP DuckDNS (Cron Job)
# Tempatkan di: ~/duckdns/duck.sh
# ==============================================================================

# Ganti dengan nama subdomain Anda (tanpa .duckdns.org) dan token DuckDNS Anda
DUCKDNS_DOMAIN="YOUR_SUBDOMAIN"
DUCKDNS_TOKEN="YOUR_DUCKDNS_TOKEN"

echo url="https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | curl -k -o ~/duckdns/duck.log -K -
