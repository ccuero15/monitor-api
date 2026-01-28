#!/bin/bash

# --- FUERZA PUNTO DECIMAL GLOBAL ---
export LC_ALL=C
export LANG=C

# --- CONFIGURACIÓN ---
API_URL="http://192.168.16.162:4000/api/v1/health/ingest"
API_KEY="9f5f62c336b96a450ded001d8fd05dc0305b1d364992b461f69f005cc1f8d156"
HOSTNAME=$(hostname)
IP_ADDRESS=$(hostname -I | awk '{print $1}')
OS_INFO=$(cat /etc/os-release | grep "PRETTY_NAME" | cut -d '"' -f 2)

# --- RECOLECCIÓN DE MÉTRICAS ---
# Usamos awk para calcular y formatear de un solo golpe con punto decimal
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | awk '{printf "%.2f", $1}')
RAM_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

# --- LÓGICA DE PROCESOS ---
PROCESSES_JSON="[]"
if (( $(echo "$CPU_USAGE > 1" | bc -l) )); then # Bajé a 1 para que veas si funciona
    PROCESSES_JSON=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 11 | tail -n 10 | awk '
    BEGIN { printf "[" }
    {
        if (NR > 1) printf ","
        name=$2; gsub(/[^a-zA-Z0-9]/, "", name);
        printf "{\"pid\": %d, \"name\": \"%s\", \"cpuUsage\": %.2f, \"ramUsage\": %.2f}", $1, name, $3, $4
    }
    END { printf "]" }')
fi

# --- CONSTRUCCIÓN DEL PAYLOAD (CON LIMPIEZA FINAL) ---
# El sed 's/,/./g' es una red de seguridad extra para los valores numéricos
JSON_PAYLOAD=$(printf '{"hostname":"%s","ipAddress":"%s","osInfo":"%s","cpuUsage":%s,"ramUsage":%s,"diskUsage":%s,"processes":%s}' \
    "$HOSTNAME" "$IP_ADDRESS" "$OS_INFO" "$CPU_USAGE" "$RAM_USAGE" "$DISK_USAGE" "$PROCESSES_JSON")

# ÚLTIMO RECURSO: Cambiar cualquier coma que haya quedado entre números
JSON_PAYLOAD=$(echo $JSON_PAYLOAD | sed 's/\([0-9]\),\([0-9]\)/\1.\2/g')

echo "------------------------------------------"
echo "JSON GENERADO (Validado):"
echo "$JSON_PAYLOAD"
echo "------------------------------------------"

# --- ENVÍO ---
curl -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: $API_KEY" \
     -d "$JSON_PAYLOAD"