import { PedidoEstatus } from '../models/pedido.model';

export interface UrgenciaEvento {
    dias: number;
    texto: string;
    severity: 'secondary' | 'info' | 'warn' | 'danger' | 'success';
    vencido: boolean;
}

function fechaCalendarioLocal(value: Date | string): Date {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    const parsed = new Date(value);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function claveDia(value: Date): number {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getUrgenciaEvento(fechaEvento: Date | string, estatus?: PedidoEstatus): UrgenciaEvento {
    if (estatus === 'ENTREGADO') return { dias: 0, texto: 'Finalizado', severity: 'secondary', vencido: false };

    const hoy = fechaCalendarioLocal(new Date());
    const evento = fechaCalendarioLocal(fechaEvento);
    const dias = Math.round((claveDia(evento) - claveDia(hoy)) / 86_400_000);

    if (dias === 0) return { dias, texto: 'Hoy', severity: 'danger', vencido: false };
    if (dias < 0) {
        const vencidos = Math.abs(dias);
        return { dias, texto: `Vencido ${vencidos} ${vencidos === 1 ? 'día' : 'días'}`, severity: 'danger', vencido: true };
    }

    return {
        dias,
        texto: `${dias} ${dias === 1 ? 'día' : 'días'}`,
        severity: dias < 10 ? 'danger' : dias <= 15 ? 'warn' : 'success',
        vencido: false
    };
}
