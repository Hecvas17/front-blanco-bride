import { Pedido, PedidoAdicional, PedidoAdicionalProducto, PedidoComplemento, PedidoProductoAdicional } from '../models/pedido.model';

export type PedidoDocumentoTipo = 'cliente' | 'produccion';

export interface LineaDocumentoPedido {
    cantidad: number;
    articulo: string;
    textoBordado: string;
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
    const batas: LineaDocumentoPedido[] = pedido.personalizaciones.map((bata) => ({
        cantidad: 1,
        articulo: bata.tipo === 'infantil' ? 'Bata infantil' : 'Bata',
        textoBordado: textoBordado(bata.bordadoFrontal, bata.bordadoPosterior),
        color: bata.color || '—',
        colorTexto: bata.colorBordado || '—',
        talla: bata.talla || '—',
        observacion: bata.observaciones || '—',
        subtotal: bata.precio
    }));

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
    const productosAdicionales: LineaDocumentoPedido[] = pedido.productosAdicionales.map((producto) => adaptarProductoPedido(producto));

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
    return adicional.productos.map((producto) => adaptarProductoAdicional(producto));
}

function adaptarProductoAdicional(producto: PedidoAdicionalProducto): LineaDocumentoPedido {
    return {
        cantidad: producto.cantidad,
        articulo: producto.tipo === 'bata_encaje' ? 'Bata de encaje' : producto.nombre || articuloLegible(producto.tipo),
        textoBordado: producto.texto || '—',
        color: producto.colorNombre || producto.color || '—',
        colorTexto: '—',
        talla: producto.tallaNombre || producto.talla || '—',
        observacion: producto.tipo === 'bata_encaje' ? `Tipo de encaje: ${tipoEncajeLegible(producto.tipoEncajeId)}${producto.observaciones ? ` · ${producto.observaciones}` : ''}` : producto.observaciones || '—',
        subtotal: producto.cantidad * producto.precio
    };
}

function adaptarProductoPedido(producto: PedidoProductoAdicional): LineaDocumentoPedido {
    return {
        cantidad: producto.cantidad,
        articulo: articuloProducto(producto.tipo, producto.tipoEncajeNombre),
        textoBordado: '—',
        color: producto.colorNombre || etiquetaId(producto.colorProductoId),
        colorTexto: '—',
        talla: producto.tallaNombre || etiquetaId(producto.tallaId),
        observacion: producto.tipo === 'bata_encaje' ? `Tipo de encaje: ${producto.tipoEncajeNombre || tipoEncajeLegible(producto.tipoEncajeId)}${producto.observaciones ? ` · ${producto.observaciones}` : ''}` : producto.observaciones || '—',
        subtotal: producto.cantidad * producto.precio
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
    const textos = [frontal && `Frontal: ${frontal}`, posterior && `Posterior: ${posterior}`].filter(Boolean);
    return textos.length ? textos.join(' · ') : '—';
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
