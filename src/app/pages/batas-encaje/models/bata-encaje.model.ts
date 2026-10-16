export type TipoEncaje = 'manga_encaje' | 'manga_holanes' | 'manga_encaje_largo' | 'manga_encaje_2';
export type EstatusEncaje = 'solicitada' | 'ya_llego' | 'lista';
export type EstatusPedidoEncaje = 'entregado' | 'transito' | 'en_produccion' | 'batas_normales_listas';

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
