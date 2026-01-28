# 🖥️ Server Health Monitor - Ingestor Backend

Este microservicio es el componente encargado de la monitorización de infraestructura. Está construido en **Node.js** con **TypeScript** y se encarga de recibir, procesar y transmitir las métricas de salud de servidores remotos en tiempo real hacia el Dashboard de Next.js.

## 🚀 Características Principales

* **Ingesta de Métricas**: Endpoint optimizado para recibir ráfagas de datos (CPU, RAM, Disco).
* **Filtrado Inteligente de Procesos**: Solo persiste en base de datos los procesos que exceden el **75% de uso de RAM**, reduciendo el crecimiento de la DB en un 80%.
* **Transmisión en Tiempo Real**: Implementación de **Server-Sent Events (SSE)** para actualizaciones instantáneas en el Dashboard.
* **Gestión de Estado con SWR**: Integración optimizada con el frontend para manejo de caché y revalidación.

---

## 🏗️ Arquitectura del Sistema

El sistema opera bajo un modelo de microservicios desacoplados:

1.  **Agente (Bash + Cron)**: Recolecta datos cada minuto y los envía vía POST.
2.  **Ingestor (Node.js)**: Valida con Zod, guarda en PostgreSQL y emite eventos.
3.  **Dashboard (Next.js)**: Consume el stream de eventos y visualiza gráficas con Recharts.



---

## ⚙️ Instalación y Configuración

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar variables de entorno (`.env`):**
    ```env
    PORT=4000
    DATABASE_URL="postgresql://user:password@localhost:5432/monitor_db"
    DASHBOARD_URL="http://localhost:3000"
    ```

3.  **Sincronizar Prisma:**
    ```bash
    npx prisma generate
    ```

4.  **Iniciar el servicio:**
    ```bash
    npm run dev
    ```

---

## 📡 API Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/health` | Punto de entrada para el script Bash. |
| `GET` | `/api/v1/health/stream` | Canal SSE (text/event-stream) para el Dashboard. |

---

## 🤖 Configuración del Agente (Cron)

Para habilitar el monitoreo automático cada minuto en un servidor:

1.  **Dar permisos al script:**
    ```bash
    chmod +x /route/server/monitor.sh
    ```

2.  **Configurar el Crontab:**
    ```bash
    crontab -e
    ```

3.  **Añadir la tarea (Sintaxis para 1 minuto):**
    ```cron
    * * * * * /bin/bash /route/server/monitor.sh >> /route/server/monitor_agent.log 2>&1
    ```

---

## 🔍 Troubleshooting (Depuración)

Si el sistema no muestra datos, utiliza estos comandos para localizar el fallo:

### Verificar si el Cron se está ejecutando:
```bash
journalctl -u cron -n 20