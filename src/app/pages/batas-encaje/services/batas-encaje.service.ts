import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BataEncaje, BataEncajeCambios } from '../models/bata-encaje.model';

@Injectable({ providedIn: 'root' })
export class BatasEncajeService {
    private readonly http = inject(HttpClient);
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
                    estatusPedido: item.estatusPedidoEncaje ?? 'EN_PRODUCCION',
                    estatusPedidoPrincipal: item.estatusPedido ?? null,
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
    actualizarDatos(productoId: string, _cambios: BataEncajeCambios): Observable<BataEncaje[]> {
        return this.getBatasEncaje();
    }

}
