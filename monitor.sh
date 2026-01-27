#!/bin/bash

# --- CONFIGURACIÓN ---
API_URL="http://192.168.1.15:4000/api/v1/health"
API_KEY="9f5f62c336b96a450ded001d8fd05dc0305b1d364992b461f69f005cc1f8d156"
HOSTNAME=$(hostname)
# Obtiene la IP primaria (ajustar interfaz si es necesario, ej. eth0 o ens3)
IP_ADDRESS=$(hostname -I | awk '{print $1}')
OS_INFO=$(cat /etc/os-release | grep "PRETTY_NAME" | cut -d '"' -f 2)

# --- RECOLECCIÓN DE MÉTRICAS ---
# CPU: Promedio de carga de 1 minuto
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

# RAM: Porcentaje de uso real
RAM_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')

# DISCO: Uso de la partición raíz /
DISK_USAGE=$(df / | df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

# --- LÓGICA DE PROCESOS ---
# Inicializamos el array de procesos vacío
PROCESSES_JSON="[]"

# Si el uso supera el 80%, capturamos los 10 procesos más pesados
if (( $(echo "$CPU_USAGE > 80" | bc -l) )) || (( $(echo "$RAM_USAGE > 80" | bc -l) )); then
    PROCESSES_JSON=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 11 | tail -n 10 | awk '
    BEGIN { printf "[" }
    {
        if (NR > 1) printf ","
        printf "{\"pid\": %d, \"name\": \"%s\", \"cpuUsage\": %.1f, \"ramUsage\": %.1f}", $1, $2, $3, $4
    }
    END { printf "]" }')
fi

# --- CONSTRUCCIÓN DEL PAYLOAD JSON ---
JSON_PAYLOAD=$(cat <<EOF
{
  "hostname": "$HOSTNAME",
  "ipAddress": "$IP_ADDRESS",
  "osInfo": "$OS_INFO",
  "cpuUsage": $CPU_USAGE,
  "ramUsage": $RAM_USAGE,
  "diskUsage": $DISK_USAGE,
  "processes": $PROCESSES_JSON
}
EOF
)

# --- ENVÍO AL API ---
curl -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -H "X-API-KEY: $API_KEY" \
     -d "$JSON_PAYLOAD" \
     -s -o /dev/null -w "Status: %{http_code}\n"