import { EventEmitter } from 'events';

// Este objeto será el puente entre el POST y el SSE
export const metricsEvents = new EventEmitter();

// Definimos el nombre del evento para evitar errores de dedo
export const NEW_METRICS_EVENT = 'new_metrics';