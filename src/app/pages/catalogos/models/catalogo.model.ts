export interface CatalogoBase {
    id: string;
    nombre: string;
    activo: boolean;
    orden?: number;
}

export interface ClienteCatalogo extends CatalogoBase {
    telefono: string;
    correo?: string;
}

export interface ProveedorCatalogo extends CatalogoBase {
    observaciones?: string;
}

export interface ColorCatalogo extends CatalogoBase {
    disponibleProducto: boolean;
    disponibleBordado: boolean;
}

export interface TallaCatalogo extends CatalogoBase {
    aplicaBata: boolean;
    aplicaPlayera: boolean;
    aplicaPantalon: boolean;
}

export interface TipografiaCatalogo extends CatalogoBase {
    muestra: string;
}

export interface TipoEncajeCatalogo extends CatalogoBase {
    clave: string;
}

export interface TipoProductoCatalogo extends CatalogoBase {
    clave: string;
    precioSugerido: number;
    proveedorSugeridoId: string | null;
}

export interface OpcionCatalogo {
    id: string;
    clave: string;
    nombre: string;
    activo: boolean;
    orden: number;
    severity?: 'secondary' | 'info' | 'warn' | 'success' | 'danger';
}

export interface CatalogoConfig {
    tiposCliente: OpcionCatalogo[];
    opcionesPantufla: OpcionCatalogo[];
    tallasMascota: OpcionCatalogo[];
    opcionesDual: OpcionCatalogo[];
    estatusPedido: OpcionCatalogo[];
    estatusProveedor: OpcionCatalogo[];
    estatusBataEncaje: OpcionCatalogo[];
}
