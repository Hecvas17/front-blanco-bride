import { dateToApiDate } from '../../../core/api/api-date';
import { FormularioPedido, PersonalizacionBata, ProductoAdicionalPedido, EstatusProveedorProducto } from '../../formulario/models/formulario.model';
import { Pedido, PedidoAdicional, PedidoComplemento, PedidoPersonalizacion, PedidoProductoAdicional } from '../models/pedido.model';

export interface CrearProductoRequest {
    tipo: string;
    cantidad: number;
    precioUnitario: number;
    proveedorId?: string;
    estatusProveedor?: string;
    colorId?: string;
    colorTextoId?: string;
    tallaId?: string;
    texto?: string;
    bordadoFrontal?: string;
    bordadoPosterior?: string;
    observaciones?: string;
    tipoEncajeId?: string;
    estatusBataEncaje?: string;
    tallaMascota?: string;
    opcionPantufla?: string;
}

export interface CrearPedidoRequest {
    clienteId: string | null;
    clienteNombre: string;
    fechaEvento: string;
    ubicacion: string;
    terminacionContacto: string;
    tipoCliente: string;
    tipoClienteOtro?: string | null;
    anticipo: number;
    tipografiaId: string;
    dualTexto: string;
    productos: CrearProductoRequest[];
}

const upperEnum = (value: string | null | undefined): string | undefined => (value ? value.toUpperCase() : undefined);
const tipoCliente = (value: string | null | undefined): string => ({ Novia: 'novia', Quinceañera: 'quinceanera', Negocio: 'negocio', Otro: 'otro' })[value ?? 'Otro'] ?? 'otro';
const dual = (value: string | null | undefined): string =>
    ({ centrado: 'DUAL_CENTRADO', lado: 'DUAL_LADO', ninguno: 'NINGUNO', 'Dual Centrado': 'DUAL_CENTRADO', 'Dual de Lado': 'DUAL_LADO', 'Ningún Dual': 'NINGUNO' })[value ?? 'ninguno'] ?? 'NINGUNO';
const tipoProducto = (tipo: string): string =>
    ({
        bata: 'BATA_NORMAL',
        adulto: 'BATA_NORMAL',
        infantil: 'BATA_INFANTIL',
        encaje: 'BATA_ENCAJE',
        bata_encaje: 'BATA_ENCAJE',
        pantalon: 'PANTALON',
        toalla: 'TOALLA',
        panuelo: 'PANUELO',
        panuelo_mascota: 'PANUELO_MASCOTA',
        pantuflas: 'PANTUFLAS',
        playera_hombre: 'PLAYERA_HOMBRE'
    })[tipo] ?? tipo.toUpperCase();
const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function mapFormularioToCrearPedidoRequest(formulario: FormularioPedido): CrearPedidoRequest {
    const batas: CrearProductoRequest[] = formulario.personalizaciones.map((bata) => mapBata(bata));
    const productos = formulario.productosAdicionales.map((producto) => mapProducto(producto));
    const complementos = formulario.complementos
        .filter((item) => item.cantidad > 0)
        .map((item) => mapComplemento(item))
        .filter((item): item is CrearProductoRequest => item !== null);
    const request: CrearPedidoRequest = {
        clienteId: formulario.clienteId,
        clienteNombre: formulario.clienteNombre,
        fechaEvento: dateToApiDate(formulario.fechaEvento) ?? '',
        ubicacion: formulario.ubicacion,
        terminacionContacto: formulario.terminacionContacto,
        tipoCliente: tipoCliente(formulario.tipoCliente),
        tipoClienteOtro: formulario.tipoClienteOtro || null,
        anticipo: formulario.anticipo,
        tipografiaId: formulario.tipografiaId ?? '',
        dualTexto: dual(formulario.dualTexto),
        productos: [...batas, ...productos, ...complementos]
    };
    validateUuidRelations(request);
    return request;
}

function mapBata(bata: PersonalizacionBata): CrearProductoRequest {
    return {
        tipo: tipoProducto(bata.tipo),
        cantidad: 1,
        precioUnitario: bata.precio,
        proveedorId: bata.proveedorId ?? undefined,
        estatusProveedor: upperEnum(bata.estatusProveedor),
        colorId: bata.colorId ?? undefined,
        tallaId: bata.tallaId ?? undefined,
        colorTextoId: bata.colorBordadoId ?? undefined,
        bordadoFrontal: bata.bordadoFrontal,
        bordadoPosterior: bata.bordadoPosterior,
        observaciones: bata.observaciones,
        tipoEncajeId: bata.tipo === 'encaje' ? (bata.tipoBataId ?? undefined) : undefined,
        estatusBataEncaje: bata.tipo === 'encaje' ? upperEnum('solicitada') : undefined
    };
}

function validateUuidRelations(request: CrearPedidoRequest): void {
    const relations: Array<[string, string | null | undefined]> = [
        ['clienteId', request.clienteId],
        ['tipografiaId', request.tipografiaId]
    ];
    request.productos.forEach((product, index) => {
        relations.push(
            [`productos.${index}.proveedorId`, product.proveedorId],
            [`productos.${index}.colorId`, product.colorId],
            [`productos.${index}.colorTextoId`, product.colorTextoId],
            [`productos.${index}.tallaId`, product.tallaId],
            [`productos.${index}.tipoEncajeId`, product.tipoEncajeId]
        );
    });
    const invalid = relations.find(([, value]) => value !== null && value !== undefined && value !== '' && !isUuid(value));
    if (invalid) throw new Error(`${invalid[0]} debe contener un UUID real del catálogo.`);
}

function mapProducto(producto: ProductoAdicionalPedido): CrearProductoRequest {
    return {
        tipo: upperEnum(producto.tipo) ?? producto.tipo,
        cantidad: producto.cantidad,
        precioUnitario: producto.precio,
        proveedorId: producto.proveedorId ?? undefined,
        estatusProveedor: upperEnum(producto.estatusProveedor),
        colorId: producto.colorProductoId ?? undefined,
        colorTextoId: producto.colorTextoId ?? undefined,
        tallaId: producto.tallaId ?? undefined,
        texto: producto.texto,
        observaciones: producto.observaciones,
        tipoEncajeId: producto.tipoEncajeId ?? undefined,
        estatusBataEncaje: upperEnum(producto.estatusBataEncaje),
        tallaMascota: upperEnum(producto.tallaMascota),
        opcionPantufla: upperEnum(producto.opcionPantufla)
    };
}

function mapComplemento(complemento: FormularioPedido['complementos'][number]): CrearProductoRequest | null {
    const tipo = ({ pantuflas: 'pantuflas', playeras: 'playera_hombre', toallas: 'toalla', panuelos: 'panuelo', 'panuelos-mascotas': 'panuelo_mascota' } as Record<string, string>)[complemento.tipo ?? complemento.complementoId];
    if (!tipo) return null;
    return {
        tipo,
        cantidad: complemento.cantidad,
        precioUnitario: complemento.precio,
        proveedorId: complemento.proveedorId ?? undefined,
        estatusProveedor: upperEnum(complemento.estatusProveedor ?? 'pendiente'),
        colorId: complemento.colorProductoId ?? undefined,
        colorTextoId: complemento.colorTextoId ?? undefined,
        tallaId: complemento.tallaId ?? undefined,
        texto: complemento.texto,
        observaciones: complemento.observaciones,
        tallaMascota: upperEnum(complemento.tallaMascota),
        opcionPantufla: upperEnum(complemento.opcionPantufla)
    };
}

export function mapApiPedidoToViewModel(api: any): Pedido {
    const productos = (api.productos ?? []) as any[];
    const adicionales = (api.adicionales ?? []) as any[];
    const original = productos.map(mapProductToAdditional);
    const personalizaciones = original.filter((item) => (item.tipo as string) === 'bata_normal' || (item.tipo as string) === 'bata_infantil').map(mapProductToPersonalizacion);
    const productosAdicionales = original.filter((item) => (item.tipo as string) !== 'bata_normal' && (item.tipo as string) !== 'bata_infantil');
    return {
        id: api.id,
        folio: api.folio,
        clienteId: api.clienteId ?? null,
        clienteNombre: api.clienteNombre,
        fechaEvento: api.fechaEvento,
        tipoCliente: api.tipoCliente,
        ubicacion: api.ubicacion,
        terminacionContacto: api.terminacionContacto,
        cantidadBatas: api.cantidadBatas ?? personalizaciones.reduce((sum, item) => sum + 1, 0),
        cantidadComplementos: api.cantidadComplementos ?? productosAdicionales.reduce((sum, item) => sum + item.cantidad, 0),
        cantidadAdicionales: api.cantidadAdicionales ?? api.adicionalesCount ?? api._count?.adicionales ?? api.adicionales?.length ?? 0,
        subtotalPersonalizaciones: api.totalOriginal ?? api.total ?? 0,
        subtotalComplementos: api.totalAdicionales ?? 0,
        totalOriginal: api.totalOriginal ?? api.total ?? 0,
        total: api.total ?? api.totalOriginal ?? 0,
        anticipo: api.anticipo ?? 0,
        restante: api.restante ?? api.restanteOriginal ?? 0,
        estatus: api.estatus,
        creadoEn: api.creadoEn,
        actualizadoEn: api.actualizadoEn,
        personalizaciones,
        complementos: [],
        tipografia: api.tipografia?.nombre ?? api.tipografiaId ?? '',
        dualTexto: api.dualTexto ?? '',
        referencias: api.referencias ?? [],
        adicionales: adicionales.map(mapAdditional),
        productosAdicionales
    };
}

function mapProductToAdditional(product: any): PedidoProductoAdicional {
    return {
        idTemporal: product.id,
        tipo: product.tipo,
        cantidad: product.cantidad,
        precio: product.precioUnitario ?? 0,
        colorProductoId: product.colorId,
        tallaId: product.tallaId,
        tipoEncajeId: product.tipoEncajeId,
        estatusBataEncaje: product.estatusBataEncaje,
        texto: product.texto,
        observaciones: product.observaciones,
        proveedorId: product.proveedorId ?? '',
        estatusProveedor: product.estatusProveedor ?? 'pendiente',
        colorNombre: product.color?.nombre ?? null,
        colorTextoNombre: product.colorTexto?.nombre ?? null,
        tallaNombre: product.talla?.nombre ?? null,
        proveedorNombre: product.proveedor?.nombre ?? null,
        tipoEncajeNombre: product.tipoEncaje?.nombre ?? null
    };
}
function mapProductToPersonalizacion(product: PedidoProductoAdicional): PedidoPersonalizacion {
    return {
        id: product.idTemporal,
        tipo: (product.tipo as string) === 'bata_infantil' ? 'infantil' : 'adulto',
        color: product.colorNombre ?? product.colorProductoId ?? '',
        talla: product.tallaNombre ?? product.tallaId ?? '',
        bordadoFrontal: '',
        bordadoPosterior: '',
        colorBordado: product.colorTextoNombre ?? product.colorNombre ?? '',
        precio: product.precio,
        observaciones: product.observaciones ?? '',
        proveedorId: product.proveedorId,
        estatusProveedor: product.estatusProveedor
    };
}
function mapAdditional(api: any): PedidoAdicional {
    return {
        id: api.id,
        folio: api.folio,
        pedidoId: api.pedidoId ?? '',
        creadoEn: api.creadoEn,
        productos: (api.productos ?? []).map((product: any) => ({ ...mapProductToAdditional(product), colorProductoId: product.colorId, tallaId: product.tallaId, color: product.color?.nombre, talla: product.talla?.nombre })),
        observaciones: api.observaciones ?? undefined,
        total: api.total ?? 0
    };
}

export function mapApiProductToViewModel(api: any): PedidoProductoAdicional {
    return mapProductToAdditional(api);
}
export function mapApiAdditionalProductToComplemento(api: any): PedidoComplemento {
    return { nombre: api.tipo, cantidad: api.cantidad, precio: api.precioUnitario ?? 0, proveedorId: api.proveedorId ?? '', estatusProveedor: api.estatusProveedor ?? 'pendiente' };
}
