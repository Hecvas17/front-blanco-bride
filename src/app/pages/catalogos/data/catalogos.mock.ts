import { CatalogoConfig, ClienteCatalogo, ColorCatalogo, OpcionCatalogo, ProveedorCatalogo, TallaCatalogo, TipografiaCatalogo, TipoEncajeCatalogo, TipoProductoCatalogo } from '../models/catalogo.model';

const slug = (value: string) => value.toLowerCase().replaceAll(' ', '-').replaceAll('í', 'i').replaceAll('ñ', 'n');
const opciones = (items: Array<[string, string]>, severity?: OpcionCatalogo['severity']): OpcionCatalogo[] => items.map(([clave, nombre], index) => ({ id: clave, clave, nombre, activo: true, orden: index + 1, severity }));
const estatusPedido = opciones([
    ['EN_PRODUCCION', 'En producción'],
    ['SALIO_DE_PRODUCCION', 'Salió de producción'],
    ['POR_LIQUIDAR', 'Por liquidar'],
    ['GENERAR_GUIA', 'Generar guía'],
    ['EN_TRANSITO', 'En tránsito'],
    ['ENTREGADO', 'Entregado'],
    ['SITUACION', 'Situación']
]);
const severidadesPedido: Record<string, OpcionCatalogo['severity']> = {
    EN_PRODUCCION: 'info',
    SALIO_DE_PRODUCCION: 'info',
    POR_LIQUIDAR: 'warn',
    GENERAR_GUIA: 'success',
    EN_TRANSITO: 'info',
    ENTREGADO: 'success',
    SITUACION: 'danger'
};
estatusPedido.forEach((item) => (item.severity = severidadesPedido[item.clave]));

export const CLIENTES_CATALOGO_MOCK: ClienteCatalogo[] = [
    { id: 'cli-001', nombre: 'Ana Pérez', telefono: '811 000 0001', correo: 'ana@example.com', activo: true, orden: 1 },
    { id: 'cli-002', nombre: 'Mariana López', telefono: '811 000 0002', activo: true, orden: 2 },
    { id: 'cli-003', nombre: 'Casa Magnolia', telefono: '811 000 0003', correo: 'compras@magnolia.example', activo: true, orden: 3 }
];

export const PROVEEDORES_CATALOGO_MOCK: ProveedorCatalogo[] = [
    { id: 'prov-1', nombre: 'Proveedor de Batas', activo: true, orden: 1 },
    { id: 'prov-2', nombre: 'Proveedor de Pañuelos', activo: true, orden: 2 },
    { id: 'prov-3', nombre: 'Proveedor de Playeras', activo: true, orden: 3 },
    { id: 'prov-4', nombre: 'Proveedor General', activo: true, orden: 4 }
];

export const COLORES_CATALOGO_MOCK: ColorCatalogo[] = [
    'Verde Olivo',
    'Rojo',
    'Azul petróleo',
    'Chedrón',
    'Azul plumbago',
    'Vino',
    'Azul marino',
    'Bugambilia',
    'Negro',
    'Celeste',
    'Turquesa',
    'Fuchsia',
    'Rosa Gaby',
    'Verde botella',
    'Ivory',
    'Rosa 1',
    'Beige',
    'Palo de rosa',
    'Rosa 2',
    'Blanco',
    'Lila',
    'Menta',
    'Morado',
    'Dorado',
    'Plateado',
    'Baby Pink',
    'Mostaza',
    'Cemento',
    'Azul rey',
    'Verde jade',
    'Hueso',
    'Café',
    'Gris rata',
    'Guinda',
    'Plata',
    'Arena'
].map((nombre, index) => ({ id: `color-${slug(nombre)}`, nombre, activo: true, orden: index + 1, disponibleProducto: !['Gris rata', 'Guinda', 'Plata', 'Arena', 'Café'].includes(nombre), disponibleBordado: true }));

export const TALLAS_CATALOGO_MOCK: TallaCatalogo[] = ['XS', 'CH', 'M', 'G', 'Unitalla', 'XL', '2XL', '3XL', '4XL', '5XL'].map((nombre, index) => ({
    id: `talla-${nombre.toLowerCase()}`,
    nombre,
    activo: true,
    orden: index + 1,
    aplicaBata: true,
    aplicaPlayera: nombre !== 'Unitalla',
    aplicaPantalon: nombre !== 'Unitalla'
}));

export const TIPOGRAFIAS_CATALOGO_MOCK: TipografiaCatalogo[] = ['Ninguna Tipografía', 'Moderna', 'Dulce', 'Sherline', 'Bailarina', 'Amelia', 'Clásica', 'Juvenil'].map((nombre, index) => ({
    id: `tipo-${index}`,
    nombre,
    muestra: index === 0 ? 'Aa' : 'Tu pedido',
    activo: true,
    orden: index + 1
}));

export const TIPOS_ENCAJE_CATALOGO_MOCK: TipoEncajeCatalogo[] = [
    ['manga_encaje', 'Manga de encaje'],
    ['manga_holanes', 'Manga de holanes'],
    ['manga_encaje_largo', 'Manga de encaje largo'],
    ['manga_encaje_2', 'Manga de encaje 2']
].map(([clave, nombre], index) => ({ id: clave, clave, nombre, activo: true, orden: index + 1 }));

const PRODUCTO_SEEDS: Array<[string, string, number, string]> = [
    ['bata', 'Bata normal', 1136, 'prov-1'],
    ['bata_infantil', 'Bata infantil', 1136, 'prov-1'],
    ['bata_encaje', 'Bata de encaje', 459, 'prov-1'],
    ['pantalon', 'Pantalón', 370, 'prov-4'],
    ['toalla', 'Toallas', 279, 'prov-4'],
    ['panuelo', 'Pañuelos', 185, 'prov-2'],
    ['panuelo_mascota', 'Pañuelos para mascota', 180, 'prov-2'],
    ['pantuflas', 'Pantuflas', 145, 'prov-4'],
    ['playera_hombre', 'Playeras para hombre', 299, 'prov-3']
];
export const TIPOS_PRODUCTO_CATALOGO_MOCK: TipoProductoCatalogo[] = PRODUCTO_SEEDS.map(([clave, nombre, precioSugerido, proveedorSugeridoId], index) => ({
    id: `producto-${clave}`,
    clave,
    nombre,
    precioSugerido,
    proveedorSugeridoId,
    activo: true,
    orden: index + 1
}));

export const COMPLEMENTOS_CATALOGO_MOCK = [
    { id: 'pantuflas', nombre: 'Pantuflas', precioSugerido: 145 },
    { id: 'playeras', nombre: 'Playeras Personalizadas', precioSugerido: 299 },
    { id: 'toallas', nombre: 'Toallas Corporales', precioSugerido: 279 },
    { id: 'panuelos', nombre: 'Pañuelos', precioSugerido: 185 },
    { id: 'panuelos-mascotas', nombre: 'Pañuelos para Mascotas', precioSugerido: 180 },
    { id: 'panaleros', nombre: 'Pañaleros', precioSugerido: 309 }
];

export const CONFIG_CATALOGOS_MOCK: CatalogoConfig = {
    tiposCliente: opciones([
        ['novia', 'Novia'],
        ['quinceanera', 'Quinceañera'],
        ['negocio', 'Negocio'],
        ['otro', 'Otro']
    ]),
    opcionesPantufla: opciones([
        ['xv_plata', 'XV con bordado plata'],
        ['xv_dorado', 'XV con bordado dorado'],
        ['bride_bordado', 'Bride con bordado'],
        ['sin_bordado', 'Sin bordado']
    ]),
    tallasMascota: opciones([
        ['chica', 'Raza chica'],
        ['mediana', 'Raza mediana'],
        ['grande', 'Raza grande']
    ]),
    opcionesDual: opciones([
        ['centrado', 'Dual Centrado'],
        ['lado', 'Dual de Lado'],
        ['ninguno', 'Ningún Dual']
    ]),
    estatusPedido,
    estatusProveedor: opciones([
        ['pendiente', 'Pendiente'],
        ['por_solicitar', 'Por solicitar'],
        ['solicitado', 'Solicitado'],
        ['en_produccion', 'En producción'],
        ['listo_proveedor', 'Listo con proveedor'],
        ['recibido', 'Recibido'],
        ['cancelado', 'Cancelado']
    ]),
    estatusBataEncaje: opciones([
        ['SIN_SOLICITAR', 'Sin solicitar'],
        ['SOLICITADA', 'Solicitada'],
        ['YA_LLEGO', 'Ya llegó'],
        ['EN_PRODUCCION', 'En producción'],
        ['LISTA', 'Lista']
    ])
};
