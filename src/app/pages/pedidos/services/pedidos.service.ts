import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, map, switchMap, concatMap, defaultIfEmpty } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EstatusProveedorProducto, FormularioPedido } from '../../formulario/models/formulario.model';
import { Pedido, PedidoAdicional, PedidoEstatus, PedidoProductoAdicional } from '../models/pedido.model';
import { EstatusPedidoEncaje } from '../../batas-encaje/models/bata-encaje.model';
import { CrearProductoRequest, mapApiAdditionalProductToComplemento, mapApiPedidoToViewModel, mapApiProductToViewModel, mapFormularioToCrearPedidoRequest } from '../api/pedido-api.adapter';

export interface ProductoEdicionOriginal {
    piezaIds: string[];
    cantidad: number;
    payload: CrearProductoRequest;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getPedidos(): Observable<Pedido[]> {
        return this.http.get<any[]>(`${this.apiUrl}/pedidos`).pipe(map((items) => items.map(mapApiPedidoToViewModel)));
    }
    getPedidoById(id: string): Observable<Pedido | undefined> {
        return this.http.get<any>(`${this.apiUrl}/pedidos/${id}`).pipe(map(mapApiPedidoToViewModel));
    }
    crearPedido(formulario: FormularioPedido): Observable<Pedido> {
        return defer(() => this.http.post<any>(`${this.apiUrl}/pedidos`, mapFormularioToCrearPedidoRequest(formulario))).pipe(map(mapApiPedidoToViewModel));
    }
    actualizarPedido(id: string, cambios: unknown): Observable<Pedido> {
        return this.http.patch<any>(`${this.apiUrl}/pedidos/${id}`, cambios).pipe(map(mapApiPedidoToViewModel));
    }
    actualizarEstatus(id: string, estatus: PedidoEstatus, estatusPedidoEncaje?: EstatusPedidoEncaje, observaciones?: string): Observable<Pedido | undefined> {
        return this.http.patch<any>(`${this.apiUrl}/pedidos/${id}/estatus`, { estatus, estatusPedidoEncaje, observaciones }).pipe(switchMap(() => this.getPedidoById(id)));
    }

    crearProducto(pedidoId: string, producto: CrearProductoRequest): Observable<PedidoProductoAdicional> {
        return this.http.post<any>(`${this.apiUrl}/pedidos/${pedidoId}/productos`, producto).pipe(map(mapApiProductToViewModel));
    }
    actualizarProducto(pedidoId: string, productoId: string, producto: CrearProductoRequest): Observable<PedidoProductoAdicional> {
        return this.http.patch<any>(`${this.apiUrl}/pedidos/${pedidoId}/productos/${productoId}`, producto).pipe(map(mapApiProductToViewModel));
    }
    sincronizarProductosOriginales(pedidoId: string, productos: ProductoEdicionOriginal[], idsAEliminar: string[]): Observable<void> {
        const operaciones: Observable<unknown>[] = [];
        const idsConservados = new Set<string>();
        productos.forEach((producto) => {
            const existentes = producto.piezaIds.slice(0, producto.cantidad);
            existentes.forEach((productoId) => {
                idsConservados.add(productoId);
                operaciones.push(this.actualizarProducto(pedidoId, productoId, { ...producto.payload, cantidad: 1 }));
            });
            const faltantes = producto.cantidad - existentes.length;
            if (faltantes > 0) operaciones.push(this.crearProducto(pedidoId, { ...producto.payload, cantidad: faltantes }));
            producto.piezaIds.slice(producto.cantidad).forEach((productoId) => {
                idsAEliminar.push(productoId);
            });
        });
        const eliminaciones = idsAEliminar.filter((id) => !idsConservados.has(id)).map((id) => this.eliminarProducto(pedidoId, id));
        operaciones.push(...eliminaciones);
        return from(operaciones).pipe(concatMap((operacion) => operacion), defaultIfEmpty(undefined), map(() => undefined));
    }
    eliminarProducto(pedidoId: string, productoId: string) {
        return this.http.delete<void>(`${this.apiUrl}/pedidos/${pedidoId}/productos/${productoId}`);
    }
    actualizarEstatusProveedor(pedidoId: string, productoId: string, estatusProveedor: EstatusProveedorProducto) {
        return this.http.patch(`${this.apiUrl}/pedidos/${pedidoId}/productos/${productoId}/estatus-proveedor`, { estatusProveedor });
    }

    getAdicionales(pedidoId: string): Observable<PedidoAdicional[]> {
        return this.http.get<any[]>(`${this.apiUrl}/pedidos/${pedidoId}/adicionales`).pipe(map((items) => items.map((item) => ({ ...item, pedidoId, productos: (item.productos ?? []).map(mapApiProductToViewModel) }))));
    }
    getAdicionalById(pedidoId: string, adicionalId: string): Observable<PedidoAdicional | undefined> {
        return this.http.get<any>(`${this.apiUrl}/pedidos/${pedidoId}/adicionales/${adicionalId}`).pipe(map((item) => ({ ...item, pedidoId, productos: (item.productos ?? []).map(mapApiProductToViewModel) })));
    }
    crearAdicional(pedidoId: string, adicional: Omit<PedidoAdicional, 'id' | 'folio'>): Observable<PedidoAdicional> {
        return this.http
            .post<any>(`${this.apiUrl}/pedidos/${pedidoId}/adicionales`, { observaciones: adicional.observaciones, productos: adicional.productos.map((item) => this.mapLegacyProduct(item)) })
            .pipe(map((item) => ({ ...item, pedidoId, productos: (item.productos ?? []).map(mapApiProductToViewModel) })));
    }
    actualizarAdicional(pedidoId: string, adicional: PedidoAdicional): Observable<PedidoAdicional> {
        return this.http
            .patch<any>(`${this.apiUrl}/pedidos/${pedidoId}/adicionales/${adicional.id}`, { observaciones: adicional.observaciones, productos: adicional.productos.map((item) => this.mapLegacyProduct(item)) })
            .pipe(map((item) => ({ ...item, pedidoId, productos: (item.productos ?? []).map(mapApiProductToViewModel) })));
    }
    eliminarAdicional(pedidoId: string, adicionalId: string): Observable<Pedido | undefined> {
        return this.http.delete<void>(`${this.apiUrl}/pedidos/${pedidoId}/adicionales/${adicionalId}`).pipe(switchMap(() => this.getPedidoById(pedidoId)));
    }

    actualizarEstatusProducto(id: string, tipo: 'bata' | 'complemento', index: number, estatus: EstatusProveedorProducto): Observable<Pedido | undefined> {
        return this.getPedidoById(id).pipe(
            switchMap((pedido) => {
                const producto = tipo === 'bata' ? pedido?.personalizaciones[index] : pedido?.complementos[index];
                const productId = (producto as { id?: string } | undefined)?.id ?? (tipo === 'complemento' ? pedido?.productosAdicionales[index]?.idTemporal : undefined);
                return productId ? this.actualizarEstatusProveedor(id, productId, estatus).pipe(switchMap(() => this.getPedidoById(id))) : this.getPedidoById(id);
            })
        );
    }
    actualizarProductoAdicional(pedidoId: string, productoId: string, cambios: Partial<PedidoProductoAdicional>) {
        return this.actualizarProducto(pedidoId, productoId, this.mapLegacyProduct({ ...cambios, idTemporal: productoId } as PedidoProductoAdicional)).pipe(switchMap(() => this.getPedidoById(pedidoId)));
    }
    actualizarProductoAdicionalEnAdicional(pedidoId: string, _adicionalId: string, productoId: string, cambios: Partial<PedidoAdicional['productos'][number]>) {
        return this.actualizarProductoAdicional(pedidoId, productoId, cambios as Partial<PedidoProductoAdicional>);
    }

    private mapLegacyProduct(producto: any): CrearProductoRequest {
        return {
            tipo: producto.tipo,
            cantidad: producto.cantidad,
            precioUnitario: producto.precio,
            proveedorId: producto.proveedorId || undefined,
            estatusProveedor: producto.estatusProveedor,
            colorId: producto.colorProductoId ?? undefined,
            tallaId: producto.tallaId ?? undefined,
            tipoEncajeId: producto.tipoEncajeId ?? undefined,
            estatusBataEncaje: producto.estatusBataEncaje,
            texto: producto.texto,
            observaciones: producto.observaciones
        };
    }
}
