import { EstatusBataEncaje, EstatusProveedorProducto, TipoProductoAdicional } from '../../formulario/models/formulario.model';

export type PedidoEstatus = 'borrador' | 'confirmado' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado';

export interface PedidoPersonalizacion {
    id?: string;
    tipo: 'adulto' | 'infantil';
    color: string;
    talla: string;
    bordadoFrontal: string;
    bordadoPosterior: string;
    colorBordado: string;
    precio: number;
    observaciones: string;
    proveedorId: string;
    estatusProveedor: EstatusProveedorProducto;
}

export interface PedidoComplemento {
    nombre: string;
    cantidad: number;
    precio: number;
    proveedorId: string;
    estatusProveedor: EstatusProveedorProducto;
}

export interface PedidoAdicionalProducto {
    idTemporal?: string;
    tipo: string;
    nombre: string;
    cantidad: number;
    color?: string;
    talla?: string;
    colorNombre?: string | null;
    tallaNombre?: string | null;
    tipoEncajeNombre?: string | null;
    colorProductoId?: string | null;
    tallaId?: string | null;
    colorTextoId?: string | null;
    texto?: string;
    observaciones?: string;
    precio: number;
    proveedorId: string;
    estatusProveedor: EstatusProveedorProducto;
    tipoEncajeId?: string | null;
    estatusBataEncaje?: EstatusBataEncaje;
}

export interface PedidoProductoAdicional {
    idTemporal: string;
    tipo: TipoProductoAdicional;
    cantidad: number;
    precio: number;
    colorProductoId?: string | null;
    tallaId?: string | null;
    tipoEncajeId?: string | null;
    estatusBataEncaje?: EstatusBataEncaje;
    texto?: string;
    observaciones?: string;
    proveedorId: string;
    estatusProveedor: EstatusProveedorProducto;
    colorNombre?: string | null;
    colorTextoNombre?: string | null;
    tallaNombre?: string | null;
    proveedorNombre?: string | null;
    tipoEncajeNombre?: string | null;
}

export interface PedidoAdicional {
    id: string;
    folio: string;
    pedidoId: string;
    creadoEn: Date | string;
    productos: PedidoAdicionalProducto[];
    observaciones?: string;
    total: number;
}

export interface PedidoReferencia {
    nombre: string;
    tipo: string;
}

export interface Pedido {
    id: string;
    folio: string;
    clienteId: string | null;
    clienteNombre: string;
    fechaEvento: Date | string;
    tipoCliente: string;
    ubicacion: string;
    terminacionContacto: string;
    cantidadBatas: number;
    cantidadComplementos: number;
    cantidadAdicionales: number;
    subtotalPersonalizaciones: number;
    subtotalComplementos: number;
    totalOriginal?: number;
    total: number;
    anticipo: number;
    restante: number;
    estatus: PedidoEstatus;
    creadoEn: Date | string;
    actualizadoEn?: Date | string;
    personalizaciones: PedidoPersonalizacion[];
    complementos: PedidoComplemento[];
    tipografia: string;
    dualTexto: string;
    referencias: PedidoReferencia[];
    detallesComplementos?: string;
    adicionales: PedidoAdicional[];
    productosAdicionales: PedidoProductoAdicional[];
}
