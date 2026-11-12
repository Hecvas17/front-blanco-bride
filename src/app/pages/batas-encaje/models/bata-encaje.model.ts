export type TipoEncaje = 'manga_encaje' | 'manga_holanes' | 'manga_encaje_largo' | 'manga_encaje_2';
export type EstatusEncaje = 'SIN_SOLICITAR' | 'SOLICITADA' | 'YA_LLEGO' | 'EN_PRODUCCION' | 'LISTA';
export type EstatusPedidoEncaje = 'EN_PRODUCCION' | 'BATAS_NORMALES_LISTAS';

export interface BataEncaje {
    id: string;
    productoId: string;
    pedidoId: string;
    pedidoFolio: string;
    clienteNombre: string;
    adicionalId?: string | null;
    adicionalFolio?: string | null;
    terminacionTelefono: string;
    tipoEncajeId: TipoEncaje;
    tipoEncajeNombre?: string | null;
    estatusEncaje: EstatusEncaje;
    estatusPedido: EstatusPedidoEncaje;
    estatusPedidoPrincipal?: string | null;
    fechaEvento: Date | string | null;
    talla: string | null;
    color: string | null;
    observaciones: string;
    proveedorId: string;
    precio: number;
}

export interface BataEncajeCambios {
    terminacionTelefono?: string;
    fechaEvento?: Date | string | null;
    talla?: string | null;
    precio?: number;
}
