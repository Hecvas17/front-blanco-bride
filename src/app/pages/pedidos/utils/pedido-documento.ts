import { AlineacionBordado } from '../../formulario/models/formulario.model';
import { Pedido, PedidoAdicional, PedidoAdicionalProducto, PedidoComplemento, PedidoProductoAdicional } from '../models/pedido.model';
import { agruparProductosVisualmente, claveVisual } from './productos-agrupacion';

export type PedidoDocumentoTipo = 'cliente' | 'produccion';

export interface LineaDocumentoPedido {
    cantidad: number;
    articulo: string;
    textoBordado: string;
    alineacionBordado?: AlineacionBordado;
    color: string;
    colorTexto: string;
    talla: string;
    observacion: string;
    subtotal?: number;
}

export interface ReferenciaDocumentoPedido {
    nombre: string;
    tipo: string;
    esImagen: boolean;
}

export interface PedidoDocumentoViewModel {
    lineas: LineaDocumentoPedido[];
    referencias: ReferenciaDocumentoPedido[];
}

export function adaptarPedidoADocumento(pedido: Pedido): PedidoDocumentoViewModel {
    const batas: LineaDocumentoPedido[] = agruparProductosVisualmente(pedido.personalizaciones, (bata) => claveVisual(bata.tipo, bata.color, bata.talla, bata.bordadoFrontal, bata.bordadoPosterior, bata.colorBordado, bata.alineacionBordado, bata.observaciones, bata.proveedorId)).map((grupo) => {
        const bata = grupo.productoRepresentativo;
        const articulo = bata.tipo === 'infantil' ? 'Bata infantil' : 'Bata';
        return {
            cantidad: grupo.cantidad,
            articulo,
            textoBordado: textoBordado(bata.bordadoFrontal, bata.bordadoPosterior),
            alineacionBordado: bata.alineacionBordado,
            color: bata.color || '—',
            colorTexto: bata.colorBordado || '—',
            talla: bata.talla || '—',
            observacion: bata.observaciones || '—',
            subtotal: bata.precio * grupo.cantidad
        };
    });

    const complementos: LineaDocumentoPedido[] = pedido.complementos.map((complemento) => ({
        cantidad: complemento.cantidad,
        articulo: articuloLegible(complemento.nombre),
        textoBordado: '—',
        color: '—',
        colorTexto: '—',
        talla: '—',
        observacion: observacionComplemento(complemento),
        subtotal: complemento.cantidad * complemento.precio
    }));
    const productosAdicionales: LineaDocumentoPedido[] = agruparProductosVisualmente(pedido.productosAdicionales, (producto) => claveVisual(producto.tipo, producto.colorNombre, producto.colorProductoId, producto.tallaNombre, producto.tallaId, producto.texto, producto.bordadoFrontal, producto.bordadoPosterior, producto.colorTextoNombre, producto.colorTextoId, producto.alineacionBordado, producto.tipoEncajeNombre, producto.tipoEncajeId, producto.observaciones, producto.proveedorId)).map((grupo) => adaptarProductoPedido(grupo.productoRepresentativo, grupo.cantidad));

    return {
        lineas: [...batas, ...productosAdicionales, ...complementos],
        referencias: pedido.referencias.map((referencia) => ({
            nombre: referencia.nombre,
            tipo: referencia.tipo,
            esImagen: referencia.tipo.toLowerCase().includes('imagen') || /\.(jpe?g|png|webp|gif)$/i.test(referencia.nombre)
        }))
    };
}

export function adaptarAdicionalADocumento(adicional: PedidoAdicional): LineaDocumentoPedido[] {
    return agruparProductosVisualmente(adicional.productos, (producto) => claveVisual(producto.tipo, producto.nombre, producto.colorNombre, producto.color, producto.tallaNombre, producto.talla, producto.texto, producto.colorTextoId, producto.alineacionBordado, producto.tipoEncajeNombre, producto.tipoEncajeId, producto.observaciones, producto.proveedorId)).map((grupo) => adaptarProductoAdicional(grupo.productoRepresentativo, grupo.cantidad));
}

function adaptarProductoAdicional(producto: PedidoAdicionalProducto, cantidad: number): LineaDocumentoPedido {
    return {
        cantidad,
        articulo: producto.tipo === 'bata_encaje' ? 'Bata de encaje' : producto.nombre || articuloLegible(producto.tipo),
        textoBordado: producto.texto || '—',
        alineacionBordado: producto.alineacionBordado,
        color: producto.colorNombre || producto.color || '—',
        colorTexto: '—',
        talla: producto.tallaNombre || producto.talla || '—',
        observacion: producto.tipo === 'bata_encaje' ? `Tipo de encaje: ${tipoEncajeLegible(producto.tipoEncajeId)}${producto.observaciones ? ` · ${producto.observaciones}` : ''}` : producto.observaciones || '—',
        subtotal: cantidad * producto.precio
    };
}

function adaptarProductoPedido(producto: PedidoProductoAdicional, cantidad: number): LineaDocumentoPedido {
    return {
        cantidad,
        articulo: articuloProducto(producto.tipo, producto.tipoEncajeNombre),
        textoBordado: '—',
        color: producto.colorNombre || etiquetaId(producto.colorProductoId),
        colorTexto: '—',
        talla: producto.tallaNombre || etiquetaId(producto.tallaId),
        observacion: producto.tipo === 'bata_encaje' ? `Tipo de encaje: ${producto.tipoEncajeNombre || tipoEncajeLegible(producto.tipoEncajeId)}${producto.observaciones ? ` · ${producto.observaciones}` : ''}` : producto.observaciones || '—',
        subtotal: cantidad * producto.precio
    };
}

function articuloProducto(tipo: string, tipoEncaje?: string | null): string {
    if (tipo === 'bata_encaje' || tipoEncaje) return 'Bata de encaje';
    return articuloLegible(tipo);
}

function tipoEncajeLegible(tipo?: string | null): string {
    return ({ manga_encaje: 'Manga de encaje', manga_holanes: 'Manga de holanes', manga_encaje_largo: 'Manga de encaje largo', manga_encaje_2: 'Manga de encaje 2' } as Record<string, string>)[tipo ?? ''] ?? '—';
}

function etiquetaId(value?: string | null): string {
    return value ? value.replace(/^(color|talla)-/, '').replaceAll('-', ' ') : '—';
}

function textoBordado(frontal: string, posterior: string): string {
    const textos = [frontal, posterior].filter((texto) => texto.length > 0);
    return textos.length ? textos.join('\n') : '—';
}

function articuloLegible(nombre: string): string {
    const clave = nombre.toLowerCase();
    if (clave.includes('pañuelo') && clave.includes('mascota')) return 'Pañuelo mascota';
    if (clave.includes('pañuelo')) return 'Pañuelo';
    if (clave.includes('pantufla')) return 'Pantuflas';
    if (clave.includes('pantal')) return 'Pantalón';
    if (clave.includes('playera')) return 'Playera hombre';
    if (clave.includes('toalla')) return 'Toalla';
    return nombre || 'Producto adicional';
}

function observacionComplemento(complemento: PedidoComplemento): string {
    const clave = complemento.nombre.toLowerCase();
    if (clave.includes('pantufla')) return 'XV Dorado';
    if (clave.includes('mascota')) return 'Talla: Mediana';
    if (clave.includes('playera')) return 'Confirmar talla y distribución';
    if (clave.includes('pañuelo')) return 'Personalizado';
    return '—';
}
