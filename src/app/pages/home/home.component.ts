import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { finalize } from 'rxjs';
import { getApiErrorMessage } from '../../core/api/api-error';
import { BataEncaje, EstatusEncaje } from '../batas-encaje/models/bata-encaje.model';
import { Pedido, PedidoEstatus } from '../pedidos/models/pedido.model';
import { getUrgenciaEvento, UrgenciaEvento } from '../pedidos/utils/evento-urgencia';
import { DashboardService } from './services/dashboard.service';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, SkeletonModule, TagModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent {
    private readonly dashboard = inject(DashboardService);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pedidos = signal<Pedido[]>([]);
    readonly batasEncaje = signal<BataEncaje[]>([]);

    readonly pedidosAbiertos = computed(() => this.pedidos().filter((pedido) => !this.esCerrado(pedido)).length);
    readonly urgentes = computed(() => this.pedidos().filter((pedido) => !this.esCerrado(pedido) && this.urgencia(pedido).dias >= 0 && this.urgencia(pedido).dias < 10).length);
    readonly batasPendientes = computed(() => this.batasEncaje().filter((bata) => bata.estatusEncaje === 'SOLICITADA' || bata.estatusEncaje === 'YA_LLEGO' || bata.estatusEncaje === 'EN_PRODUCCION').length);
    readonly pedidosListos = computed(() => this.pedidos().filter((pedido) => pedido.estatus === 'SALIO_DE_PRODUCCION').length);

    readonly proximosEventos = computed(() => this.pedidos().filter((pedido) => !this.esCerrado(pedido) && this.urgencia(pedido).dias >= 0).sort((a, b) => this.fechaCalendario(a.fechaEvento).getTime() - this.fechaCalendario(b.fechaEvento).getTime()).slice(0, 6));
    readonly batasPorAtender = computed(() => this.batasEncaje().filter((bata) => bata.estatusEncaje === 'SOLICITADA' || bata.estatusEncaje === 'YA_LLEGO' || bata.estatusEncaje === 'EN_PRODUCCION').sort((a, b) => this.prioridadBata(a.estatusEncaje) - this.prioridadBata(b.estatusEncaje) || this.fechaCalendario(a.fechaEvento).getTime() - this.fechaCalendario(b.fechaEvento).getTime()).slice(0, 6));
    readonly pedidosRecientes = computed(() => [...this.pedidos()].sort((a, b) => this.fechaCreacion(b.creadoEn).getTime() - this.fechaCreacion(a.creadoEn).getTime()).slice(0, 6));

    constructor() { this.cargar(); }

    cargar(): void {
        this.loading.set(true);
        this.error.set(null);
        this.dashboard.getDashboardData().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
            next: (data) => { this.pedidos.set(data.pedidos); this.batasEncaje.set(data.batasEncaje); },
            error: (error: unknown) => this.error.set(getApiErrorMessage(error, 'No se pudo cargar el resumen.'))
        });
    }

    urgencia(pedido: Pedido): UrgenciaEvento { return getUrgenciaEvento(pedido.fechaEvento, pedido.estatus); }

    etiquetaEstatus(estatus: PedidoEstatus): string {
        return ({ EN_PRODUCCION: 'En producción', SALIO_DE_PRODUCCION: 'Salió de producción', POR_LIQUIDAR: 'Por liquidar', GENERAR_GUIA: 'Generar guía', EN_TRANSITO: 'En tránsito', ENTREGADO: 'Entregado', SITUACION: 'Situación' } as const)[estatus];
    }

    severidadEstatus(estatus: PedidoEstatus): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
        return ({ EN_PRODUCCION: 'info', SALIO_DE_PRODUCCION: 'info', POR_LIQUIDAR: 'warn', GENERAR_GUIA: 'success', EN_TRANSITO: 'info', ENTREGADO: 'success', SITUACION: 'danger' } as const)[estatus];
    }

    etiquetaBata(bata: BataEncaje): string { return bata.tipoEncajeNombre ?? bata.tipoEncajeId.replaceAll('_', ' '); }

    etiquetaEstatusBata(estatus: EstatusEncaje): string { return ({ SIN_SOLICITAR: 'Sin solicitar', SOLICITADA: 'Solicitada', YA_LLEGO: 'Ya llegó', EN_PRODUCCION: 'En producción', LISTA: 'Lista' } as const)[estatus]; }

    fechaCalendario(value: Date | string | null): Date {
        if (!value) return new Date(NaN);
        if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const parsed = new Date(value);
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    fechaCreacion(value: Date | string): Date { return value instanceof Date ? value : new Date(value); }

    private esCerrado(pedido: Pedido): boolean { return pedido.estatus === 'ENTREGADO'; }
    private prioridadBata(estatus: EstatusEncaje): number { return estatus === 'SOLICITADA' ? 0 : estatus === 'YA_LLEGO' ? 1 : 2; }
}
