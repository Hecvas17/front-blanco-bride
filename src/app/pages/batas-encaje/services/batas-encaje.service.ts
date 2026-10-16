import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PedidosService } from '../../pedidos/services/pedidos.service';
import { BataEncaje, BataEncajeCambios, EstatusEncaje, EstatusPedidoEncaje, TipoEncaje } from '../models/bata-encaje.model';

@Injectable({ providedIn: 'root' })
export class BatasEncajeService {
    private readonly http = inject(HttpClient);
    private readonly pedidos = inject(PedidosService);
    private readonly apiUrl = environment.apiUrl;

    getBatasEncaje(filters: { buscar?: string; estatus?: string; tipoEncajeId?: string; tallaId?: string; pedidoId?: string } = {}): Observable<BataEncaje[]> {
        let params = new HttpParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params = params.set(key, value);
        });
        return this.http.get<any[]>(`${this.apiUrl}/batas-encaje`, { params }).pipe(
            map((items) =>
                items.map((item) => ({
                    id: item.productoId,
                    productoId: item.productoId,
                    pedidoId: item.pedidoId,
                    pedidoFolio: item.pedidoFolio,
                    clienteNombre: item.clienteNombre ?? '',
                    adicionalId: item.adicionalId,
                    adicionalFolio: item.adicionalFolio,
                    terminacionTelefono: item.terminacionTelefono ?? '',
                    tipoEncajeId: item.tipoEncajeId,
                    tipoEncajeNombre: item.tipoEncajeNombre ?? null,
                    estatusEncaje: item.estatusBataEncaje,
                    estatusPedido: this.mapPedidoStatus(item.estatusPedido),
                    fechaEvento: item.fechaEvento,
                    talla: item.tallaNombre ?? item.tallaId,
                    color: item.colorNombre ?? item.colorId,
                    observaciones: item.observaciones ?? '',
                    proveedorId: item.proveedorId ?? '',
                    precio: item.precioUnitario ?? 0
                }))
            )
        );
    }
    actualizarTipoEncaje(productoId: string, tipoEncajeId: TipoEncaje): Observable<BataEncaje[]> {
        return this.http.patch(`${this.apiUrl}/batas-encaje/${productoId}/tipo-encaje`, { tipoEncajeId }).pipe(switchMap(() => this.getBatasEncaje()));
    }
    actualizarEstatusEncaje(productoId: string, estatusBataEncaje: EstatusEncaje): Observable<BataEncaje[]> {
        return this.http.patch(`${this.apiUrl}/batas-encaje/${productoId}/estatus`, { estatusBataEncaje }).pipe(switchMap(() => this.getBatasEncaje()));
    }
    actualizarEstatusPedido(productoId: string, estatus: EstatusPedidoEncaje): Observable<BataEncaje[]> {
        return this.getBatasEncaje().pipe(
            switchMap((items) => {
                const item = items.find((entry) => entry.productoId === productoId);
                const pedidoStatus = ({ entregado: 'entregado', transito: 'confirmado', en_produccion: 'en_proceso', batas_normales_listas: 'listo' } as Record<EstatusPedidoEncaje, any>)[estatus];
                return item ? this.pedidos.actualizarEstatus(item.pedidoId, pedidoStatus).pipe(switchMap(() => this.getBatasEncaje())) : this.getBatasEncaje();
            })
        );
    }
    actualizarDatos(productoId: string, _cambios: BataEncajeCambios): Observable<BataEncaje[]> {
        return this.getBatasEncaje();
    }

    private mapPedidoStatus(value: string): EstatusPedidoEncaje {
        return value === 'entregado' ? 'entregado' : value === 'en_proceso' ? 'en_produccion' : value === 'listo' ? 'batas_normales_listas' : 'transito';
    }
}
