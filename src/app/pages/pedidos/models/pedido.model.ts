import { AlineacionBordado, EstatusBataEncaje, EstatusProveedorProducto, TipoProductoAdicional } from '../../formulario/models/formulario.model';
import type { EstatusPedidoEncaje } from '../../batas-encaje/models/bata-encaje.model';

export type PedidoEstatus = 'EN_PRODUCCION' | 'SALIO_DE_PRODUCCION' | 'POR_LIQUIDAR' | 'GENERAR_GUIA' | 'EN_TRANSITO' | 'ENTREGADO' | 'SITUACION';

export interface PedidoPersonalizacion {
    id?: string;
    grupoProductoId?: string | null;
    piezasIds?: string[];
    colorId?: string | null;
    tallaId?: string | null;
    colorTextoId?: string | null;
    tipoBataId?: string | null;
    cantidad: number;
    tipo: 'adulto' | 'infantil';
    color: string;
    talla: string;
    bordadoFrontal: string;
    bordadoPosterior: string;
    alineacionBordado?: AlineacionBordado;
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
    id?: string;
    idTemporal?: string;
    grupoProductoId?: string | null;
    piezasIds?: string[];
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
    alineacionBordado?: AlineacionBordado;
}

export interface PedidoProductoAdicional {
    id?: string;
    idTemporal: string;
    grupoProductoId?: string | null;
    tipo: TipoProductoAdicional;
    cantidad: number;
    precio: number;
    colorProductoId?: string | null;
    colorTextoId?: string | null;
    tallaId?: string | null;
    tipoEncajeId?: string | null;
    estatusBataEncaje?: EstatusBataEncaje;
    tallaMascota?: string | null;
    opcionPantufla?: string | null;
    bordadoFrontal?: string;
    bordadoPosterior?: string;
    alineacionBordado?: AlineacionBordado;
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
    numeroPedido?: number | null;
    esUrgente: boolean;
    clienteId: string | null;
    clienteNombre: string;
    fechaEvento: Date | string;
    tipoCliente: string;
    tipoClienteOtro?: string | null;
    tipografiaId?: string | null;
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
    estatusPedidoEncaje?: EstatusPedidoEncaje | null;
    observaciones?: string;
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
