export type TipoCliente = 'Novia' | 'Quinceañera' | 'Negocio' | 'Otro';
export type TipoBata = 'adulto' | 'infantil' | 'encaje';
export type EstatusProveedorProducto = 'pendiente' | 'por_solicitar' | 'solicitado' | 'en_produccion' | 'listo_proveedor' | 'recibido' | 'cancelado';
export type TipoProductoAdicional = 'bata_encaje' | 'toalla' | 'panuelo' | 'panuelo_mascota' | 'pantuflas' | 'playera_hombre' | 'pantalon';
export type EstatusBataEncaje = 'SIN_SOLICITAR' | 'SOLICITADA' | 'YA_LLEGO' | 'EN_PRODUCCION' | 'LISTA';
export type AlineacionBordado = 'IZQUIERDA' | 'CENTRO' | 'DERECHA';

export interface Cliente {
    id: string;
    nombre: string;
    telefono: string;
    correo?: string;
}

export interface CatalogoOpcion {
    id: string;
    nombre: string;
    muestra?: string;
}

export interface PersonalizacionBata {
    idTemporal: string;
    grupoProductoId?: string | null;
    piezasIds?: string[];
    cantidad: number;
    tipo: TipoBata;
    colorId: string | null;
    tallaId: string | null;
    bordadoFrontal: string;
    bordadoPosterior: string;
    alineacionBordado?: AlineacionBordado;
    colorBordadoId: string | null;
    precio: number;
    observaciones: string;
    tipoBataId?: string | null;
    proveedorId: string | null;
    estatusProveedor: EstatusProveedorProducto;
}

export interface ComplementoPedido {
    complementoId: string;
    cantidad: number;
    precio: number;
    tipo?: TipoProductoAdicional;
    proveedorId?: string | null;
    estatusProveedor?: EstatusProveedorProducto;
    texto?: string;
    observaciones?: string;
    colorProductoId?: string | null;
    colorTextoId?: string | null;
    tallaId?: string | null;
    tallaMascota?: 'chica' | 'mediana' | 'grande' | null;
    opcionPantufla?: 'xv_plata' | 'xv_dorado' | 'bride_bordado' | 'sin_bordado' | null;
}

export type ProductoAdicionalPedido = ComplementoPedido & {
    tipo: TipoProductoAdicional;
    idTemporal: string;
    grupoProductoId?: string | null;
    piezasIds?: string[];
    proveedorId: string | null;
    estatusProveedor: EstatusProveedorProducto;
    tipoEncajeId?: string | null;
    estatusBataEncaje?: EstatusBataEncaje;
};
export interface Proveedor {
    id: string;
    nombre: string;
}

export interface ArchivoReferencia {
    id: string;
    file: File;
    nombre: string;
    tamano: number;
}

export interface FormularioPedido {
    numeroPedido: string;
    esUrgente: boolean;
    clienteId: string | null;
    clienteNombre: string;
    fechaEvento: Date | null;
    ubicacion: string;
    terminacionContacto: string;
    tipoCliente: TipoCliente | null;
    tipoClienteOtro?: string;
    anticipo: number;
    personalizaciones: PersonalizacionBata[];
    complementos: ComplementoPedido[];
    productosAdicionales: ProductoAdicionalPedido[];
    tipografiaId: string | null;
    dualTexto: string | null;
    detallesComplementos: string;
    referencias: ArchivoReferencia[];
    referenciasPersistidas?: Array<{ id: string; nombre: string; tipo: string }>;
}

export const pedidoInicial = (): FormularioPedido => ({
    numeroPedido: '',
    esUrgente: false,
    clienteId: null,
    clienteNombre: '',
    fechaEvento: null,
    ubicacion: '',
    terminacionContacto: '',
    tipoCliente: null,
    tipoClienteOtro: '',
    anticipo: 0,
    personalizaciones: [],
    complementos: [],
    productosAdicionales: [],
    tipografiaId: null,
    dualTexto: null,
    detallesComplementos: '',
    referencias: []
});
