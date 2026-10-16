import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(error: unknown, fallback = 'No fue posible completar la operación.'): string {
    if (error instanceof Error && error.message) return error.message;
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
    if (error.status === 0) return 'No se pudo conectar con el backend.';
    return fallback;
}
