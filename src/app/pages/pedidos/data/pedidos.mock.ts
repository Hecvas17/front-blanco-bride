import { Pedido } from '../models/pedido.model';

const encaje = (id: number, indice: number): Pedido['productosAdicionales'][number] => ({
    idTemporal: `encaje-${id}-${indice}`,
    tipo: 'bata_encaje',
    cantidad: 1,
    precio: 459 + indice * 31,
    colorProductoId: ['color-rosa-gaby', 'color-blanco', 'color-ivory'][indice % 3],
    tallaId: ['talla-xl', 'talla-xl', 'talla-ch'][indice % 3],
    tipoEncajeId: ['manga_encaje', 'manga_holanes', 'manga_encaje_largo', 'manga_encaje_2'][indice % 4],
    estatusBataEncaje: (['SOLICITADA', 'YA_LLEGO', 'LISTA'] as const)[indice % 3],
    observaciones: 'Confirmar disponibilidad del encaje.',
    proveedorId: 'prov-1',
    estatusProveedor: indice % 2 === 0 ? 'solicitado' : 'en_produccion'
});

const detalle = (tipo: 'adulto' | 'infantil', color: string, talla: string, precio: number, index: number): Pedido['personalizaciones'][number] => ({
    cantidad: 1,
    tipo,
    color,
    talla,
    bordadoFrontal: 'Nombre personalizado',
    bordadoPosterior: 'Bride team',
    colorBordado: 'Dorado',
    precio,
    observaciones: 'Confirmar posición del bordado antes de producir.',
    proveedorId: 'prov-1',
    estatusProveedor: index % 2 === 0 ? 'en_produccion' : 'solicitado'
});

const pedido = (
    id: number,
    clienteNombre: string,
    fechaEvento: string,
    total: number,
    anticipo: number,
    estatus: Pedido['estatus'],
    tipoCliente: string,
    cantidadBatas: number,
    cantidadComplementos: number,
    ubicacion: string,
    adicionales: Pedido['adicionales'] = []
): Pedido => ({
    id: `pedido-${id}`,
    folio: `PED-${String(id).padStart(4, '0')}`,
    esUrgente: false,
    clienteId: `cli-${id}`,
    clienteNombre,
    fechaEvento,
    tipoCliente,
    ubicacion,
    terminacionContacto: String(5800 + id * 137).slice(-4),
    cantidadBatas,
    cantidadComplementos,
    subtotalPersonalizaciones: total - cantidadComplementos * 185,
    subtotalComplementos: cantidadComplementos * 185,
    total,
    anticipo,
    restante: total - anticipo,
    estatus,
    creadoEn: '2026-09-01',
    actualizadoEn: '2026-09-10',
    personalizaciones: Array.from({ length: cantidadBatas }, (_, index) =>
        detalle(
            index === cantidadBatas - 1 && id % 3 === 0 ? 'infantil' : 'adulto',
            ['Azul petróleo', 'Verde Olivo', 'Rosa Gaby', 'Ivory'][id % 4],
            ['CH', 'Unitalla', 'XL', '2XL'][index % 4],
            Math.round((total - cantidadComplementos * 185) / cantidadBatas),
            index
        )
    ),
    complementos: quantityComplementos(cantidadComplementos, id),
    tipografia: ['Moderna', 'Dulce', 'Clásica', 'Bailarina'][id % 4],
    dualTexto: id % 3 === 0 ? 'Dual de Lado' : 'Dual Centrado',
    referencias: id % 2 === 0 ? [{ nombre: 'referencia-diseno.pdf', tipo: 'PDF' }] : [{ nombre: 'inspiracion-bordado.jpg', tipo: 'Imagen' }],
    detallesComplementos: 'Empaque individual por pieza.',
    adicionales,
    productosAdicionales: id <= 3 ? [encaje(id, id - 1)] : []
});

const quantityComplementos = (cantidad: number, pedidoId: number): Pedido['complementos'] =>
    cantidad
        ? Array.from({ length: Math.min(2, cantidad) }, (_, index) => {
              const opciones = [
                  { nombre: 'Pantuflas', proveedorId: 'prov-4', estatusProveedor: 'pendiente' as const },
                  { nombre: 'Pañuelos personalizados', proveedorId: 'prov-2', estatusProveedor: 'recibido' as const },
                  { nombre: 'Playeras para hombre', proveedorId: 'prov-3', estatusProveedor: 'solicitado' as const },
                  { nombre: 'Toallas', proveedorId: 'prov-4', estatusProveedor: 'por_solicitar' as const },
                  { nombre: 'Pañuelos para mascota', proveedorId: 'prov-2', estatusProveedor: 'listo_proveedor' as const }
              ];
              const opcion = opciones[(pedidoId + index) % opciones.length];
              return { ...opcion, cantidad: index === 0 ? cantidad : Math.max(1, cantidad - 1), precio: 185 };
          })
        : [];

export const PEDIDOS_MOCK: Pedido[] = [
    pedido(1, 'Ana Martínez', '2026-10-05', 2950, 1500, 'EN_PRODUCCION', 'Novia', 2, 3, 'Monterrey'),
    pedido(2, 'Fernanda López', '2026-10-06', 1800, 900, 'POR_LIQUIDAR', 'Quinceañera', 1, 2, 'San Pedro Garza García', [
        {
            id: 'adicional-2-1',
            folio: 'PED-0002-AD01',
            pedidoId: 'pedido-2',
            creadoEn: '2026-10-13',
            total: 740,
            observaciones: 'Agregar al embarque de la semana.',
            productos: [{ idTemporal: 'adicional-2-1-prod-1', tipo: 'pantalon', nombre: 'Pantalón', cantidad: 2, color: 'Negro', talla: 'XL', precio: 370, proveedorId: 'prov-4', estatusProveedor: 'pendiente' }]
        }
    ]),
    pedido(3, 'María González', '2026-10-09', 4200, 1000, 'SITUACION', 'Novia', 3, 4, 'Saltillo', [
        {
            id: 'adicional-3-1',
            folio: 'PED-0003-AD01',
            pedidoId: 'pedido-3',
            creadoEn: '2026-10-12',
            total: 598,
            productos: [
                {
                    idTemporal: 'adicional-3-1-prod-1',
                    tipo: 'bata_encaje',
                    nombre: 'Bata de encaje',
                    cantidad: 1,
                    color: 'Blanco',
                    talla: 'G',
                    precio: 459,
                    tipoEncajeId: 'manga_holanes',
                    estatusBataEncaje: 'SOLICITADA',
                    proveedorId: 'prov-1',
                    estatusProveedor: 'solicitado',
                    observaciones: 'Adicional para la recepción.'
                }
            ]
        },
        { id: 'adicional-3-2', folio: 'PED-0003-AD02', pedidoId: 'pedido-3', creadoEn: '2026-10-14', total: 279, productos: [{ tipo: 'toalla', nombre: 'Toalla', cantidad: 1, precio: 279, proveedorId: 'prov-4', estatusProveedor: 'pendiente' }] }
    ]),
    pedido(4, 'Sofía Hernández', '2026-10-02', 2350, 2350, 'SALIO_DE_PRODUCCION', 'Novia', 2, 1, 'Apodaca'),
    pedido(5, 'Daniela Torres', '2026-10-01', 3100, 1200, 'EN_PRODUCCION', 'Quinceañera', 2, 2, 'Cumbres'),
    pedido(6, 'Boutique Luna', '2026-10-22', 6800, 3400, 'GENERAR_GUIA', 'Negocio', 5, 6, 'Monterrey'),
    pedido(7, 'Eventos Aurora', '2026-09-18', 5100, 5100, 'ENTREGADO', 'Negocio', 4, 3, 'Santa Catarina'),
    pedido(8, 'Valeria Ramírez', '2026-10-03', 1450, 0, 'EN_TRANSITO', 'Novia', 1, 0, 'Guadalupe'),
    pedido(9, 'Mariana Castillo', '2026-10-02', 2650, 1000, 'SITUACION', 'Quinceañera', 2, 2, 'Escobedo'),
    pedido(10, 'Isabella Flores', '2026-10-20', 3900, 1950, 'SALIO_DE_PRODUCCION', 'Novia', 3, 2, 'Monterrey')
];
