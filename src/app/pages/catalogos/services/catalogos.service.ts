import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { COMPLEMENTOS_CATALOGO_MOCK, CONFIG_CATALOGOS_MOCK, TIPOS_PRODUCTO_CATALOGO_MOCK } from '../data/catalogos.mock';
import { CatalogoConfig, ClienteCatalogo, ColorCatalogo, ProveedorCatalogo, TallaCatalogo, TipografiaCatalogo, TipoEncajeCatalogo, TipoProductoCatalogo } from '../models/catalogo.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;
    readonly clientes = signal<ClienteCatalogo[]>([]);
    readonly proveedores = signal<ProveedorCatalogo[]>([]);
    readonly colores = signal<ColorCatalogo[]>([]);
    readonly tallas = signal<TallaCatalogo[]>([]);
    readonly tipografias = signal<TipografiaCatalogo[]>([]);
    readonly tiposEncaje = signal<TipoEncajeCatalogo[]>([]);
    // El backend actual todavía no expone estos catálogos menores.
    readonly tiposProducto = signal(TIPOS_PRODUCTO_CATALOGO_MOCK.map((item) => ({ ...item })));
    readonly complementos = signal(COMPLEMENTOS_CATALOGO_MOCK.map((item) => ({ ...item })));
    readonly configuraciones = signal<CatalogoConfig>(structuredClone(CONFIG_CATALOGOS_MOCK));

    cargarCatalogos(): Observable<void> {
        return forkJoin([
            this.getClientes({ incluirInactivos: true }),
            this.getProveedores({ incluirInactivos: true }),
            this.getColores({ incluirInactivos: true }),
            this.getTallas({ incluirInactivos: true }),
            this.getTipografias({ incluirInactivos: true }),
            this.getTiposEncaje({ incluirInactivos: true })
        ]).pipe(map(() => void 0));
    }
    getClientes(options: { incluirInactivos?: boolean } = {}) {
        return this.http.get<ClienteCatalogo[]>(`${this.apiUrl}/clientes`, { params: this.params(options.incluirInactivos) }).pipe(tap((items) => this.clientes.set(items)));
    }
    getProveedores(options: { incluirInactivos?: boolean } = {}) {
        return this.http.get<ProveedorCatalogo[]>(`${this.apiUrl}/proveedores`, { params: this.params(options.incluirInactivos) }).pipe(tap((items) => this.proveedores.set(items)));
    }
    getColores(options: { incluirInactivos?: boolean; disponibleProducto?: boolean; disponibleBordado?: boolean } = {}) {
        let params = this.params(options.incluirInactivos);
        if (options.disponibleProducto !== undefined) params = params.set('disponibleProducto', options.disponibleProducto);
        if (options.disponibleBordado !== undefined) params = params.set('disponibleBordado', options.disponibleBordado);
        return this.http.get<ColorCatalogo[]>(`${this.apiUrl}/catalogos/colores`, { params }).pipe(tap((items) => this.colores.set(items)));
    }
    getColoresProducto() {
        return this.getColores({ disponibleProducto: true }).pipe(map((items) => items.filter((item) => item.activo && item.disponibleProducto)));
    }
    getColoresBordado() {
        return this.getColores({ disponibleBordado: true }).pipe(map((items) => items.filter((item) => item.activo && item.disponibleBordado)));
    }
    getTallas(options: { incluirInactivos?: boolean } = {}) {
        return this.http.get<TallaCatalogo[]>(`${this.apiUrl}/catalogos/tallas`, { params: this.params(options.incluirInactivos) }).pipe(tap((items) => this.tallas.set(items)));
    }
    getTipografias(options: { incluirInactivos?: boolean } = {}) {
        return this.http.get<TipografiaCatalogo[]>(`${this.apiUrl}/catalogos/tipografias`, { params: this.params(options.incluirInactivos) }).pipe(tap((items) => this.tipografias.set(items)));
    }
    getTiposEncaje(options: { incluirInactivos?: boolean } = {}) {
        return this.http.get<TipoEncajeCatalogo[]>(`${this.apiUrl}/catalogos/tipos-encaje`, { params: this.params(options.incluirInactivos) }).pipe(tap((items) => this.tiposEncaje.set(items)));
    }
    getTiposProducto() {
        return of(this.tiposProducto().filter((item) => item.activo));
    }
    getComplementos() {
        return of(this.complementos());
    }
    getConfiguraciones() {
        return of(this.configuraciones());
    }
    getTiposCliente() {
        return of(this.configuraciones().tiposCliente.filter((item) => item.activo));
    }
    getOpcionesPantufla() {
        return of(this.configuraciones().opcionesPantufla.filter((item) => item.activo));
    }
    getTallasMascota() {
        return of(this.configuraciones().tallasMascota.filter((item) => item.activo));
    }
    getOpcionesDual() {
        return of(this.configuraciones().opcionesDual.filter((item) => item.activo));
    }
    getEstatusPedido() {
        return of(this.configuraciones().estatusPedido.filter((item) => item.activo));
    }
    getEstatusProveedor() {
        return of(this.configuraciones().estatusProveedor.filter((item) => item.activo));
    }
    getEstatusBataEncaje() {
        return of(this.configuraciones().estatusBataEncaje.filter((item) => item.activo));
    }

    crearCliente(data: Partial<ClienteCatalogo>) {
        const payload: CrearClienteRequest = { nombre: data.nombre?.trim() ?? '', telefono: this.optionalText(data.telefono), correo: this.optionalText(data.correo) };
        return this.http.post<ClienteCatalogo>(`${this.apiUrl}/clientes`, payload).pipe(switchMap(() => this.getClientes({ incluirInactivos: true })));
    }
    actualizarCliente(id: string, cambios: Partial<ClienteCatalogo>) {
        const payload: ActualizarClienteRequest = { nombre: cambios.nombre?.trim(), telefono: this.optionalText(cambios.telefono), correo: this.optionalText(cambios.correo) };
        return this.http.patch<ClienteCatalogo>(`${this.apiUrl}/clientes/${id}`, payload).pipe(switchMap(() => this.getClientes({ incluirInactivos: true })));
    }
    cambiarEstadoCliente(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/clientes/${id}/activo`, { activo }).pipe(switchMap(() => this.getClientes({ incluirInactivos: true })));
    }
    crearProveedor(data: Partial<ProveedorCatalogo>) {
        const payload: CrearProveedorRequest = { nombre: data.nombre?.trim() ?? '', observaciones: this.optionalText(data.observaciones) };
        return this.http.post<ProveedorCatalogo>(`${this.apiUrl}/proveedores`, payload).pipe(switchMap(() => this.getProveedores({ incluirInactivos: true })));
    }
    actualizarProveedor(id: string, cambios: Partial<ProveedorCatalogo>) {
        const payload: ActualizarProveedorRequest = { nombre: cambios.nombre?.trim(), observaciones: this.optionalText(cambios.observaciones) };
        return this.http.patch<ProveedorCatalogo>(`${this.apiUrl}/proveedores/${id}`, payload).pipe(switchMap(() => this.getProveedores({ incluirInactivos: true })));
    }
    cambiarEstadoProveedor(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/proveedores/${id}/activo`, { activo }).pipe(switchMap(() => this.getProveedores({ incluirInactivos: true })));
    }
    crearColor(data: Partial<ColorCatalogo>) {
        const payload: CrearColorRequest = { nombre: data.nombre?.trim() ?? '', disponibleProducto: Boolean(data.disponibleProducto), disponibleBordado: Boolean(data.disponibleBordado), orden: data.orden };
        return this.http.post<ColorCatalogo>(`${this.apiUrl}/catalogos/colores`, payload).pipe(switchMap(() => this.getColores({ incluirInactivos: true })));
    }
    actualizarColor(id: string, cambios: Partial<ColorCatalogo>) {
        const payload: ActualizarColorRequest = { nombre: cambios.nombre?.trim(), disponibleProducto: cambios.disponibleProducto, disponibleBordado: cambios.disponibleBordado, orden: cambios.orden };
        return this.http.patch<ColorCatalogo>(`${this.apiUrl}/catalogos/colores/${id}`, payload).pipe(switchMap(() => this.getColores({ incluirInactivos: true })));
    }
    cambiarEstadoColor(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/catalogos/colores/${id}/activo`, { activo }).pipe(switchMap(() => this.getColores({ incluirInactivos: true })));
    }
    crearTalla(data: Partial<TallaCatalogo>) {
        const payload: CrearTallaRequest = { nombre: data.nombre?.trim() ?? '', orden: data.orden };
        return this.http.post<TallaCatalogo>(`${this.apiUrl}/catalogos/tallas`, payload).pipe(switchMap(() => this.getTallas({ incluirInactivos: true })));
    }
    actualizarTalla(id: string, cambios: Partial<TallaCatalogo>) {
        const payload: ActualizarTallaRequest = { nombre: cambios.nombre?.trim(), orden: cambios.orden };
        return this.http.patch<TallaCatalogo>(`${this.apiUrl}/catalogos/tallas/${id}`, payload).pipe(switchMap(() => this.getTallas({ incluirInactivos: true })));
    }
    cambiarEstadoTalla(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/catalogos/tallas/${id}/activo`, { activo }).pipe(switchMap(() => this.getTallas({ incluirInactivos: true })));
    }
    crearTipografia(data: Partial<TipografiaCatalogo>) {
        const payload: CrearTipografiaRequest = { nombre: data.nombre?.trim() ?? '', muestra: this.optionalText(data.muestra), orden: data.orden };
        return this.http.post<TipografiaCatalogo>(`${this.apiUrl}/catalogos/tipografias`, payload).pipe(switchMap(() => this.getTipografias({ incluirInactivos: true })));
    }
    actualizarTipografia(id: string, cambios: Partial<TipografiaCatalogo>) {
        const payload: ActualizarTipografiaRequest = { nombre: cambios.nombre?.trim(), muestra: this.optionalText(cambios.muestra), orden: cambios.orden };
        return this.http.patch<TipografiaCatalogo>(`${this.apiUrl}/catalogos/tipografias/${id}`, payload).pipe(switchMap(() => this.getTipografias({ incluirInactivos: true })));
    }
    cambiarEstadoTipografia(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/catalogos/tipografias/${id}/activo`, { activo }).pipe(switchMap(() => this.getTipografias({ incluirInactivos: true })));
    }
    crearTipoEncaje(data: Partial<TipoEncajeCatalogo>) {
        const payload: CrearTipoEncajeRequest = { nombre: data.nombre?.trim() ?? '', orden: data.orden };
        return this.http.post<TipoEncajeCatalogo>(`${this.apiUrl}/catalogos/tipos-encaje`, payload).pipe(switchMap(() => this.getTiposEncaje({ incluirInactivos: true })));
    }
    actualizarTipoEncaje(id: string, cambios: Partial<TipoEncajeCatalogo>) {
        const payload: ActualizarTipoEncajeRequest = { nombre: cambios.nombre?.trim(), orden: cambios.orden };
        return this.http.patch<TipoEncajeCatalogo>(`${this.apiUrl}/catalogos/tipos-encaje/${id}`, payload).pipe(switchMap(() => this.getTiposEncaje({ incluirInactivos: true })));
    }
    cambiarEstadoTipoEncaje(id: string, activo: boolean) {
        return this.http.patch(`${this.apiUrl}/catalogos/tipos-encaje/${id}/activo`, { activo }).pipe(switchMap(() => this.getTiposEncaje({ incluirInactivos: true })));
    }

    private params(incluirInactivos?: boolean): HttpParams {
        return incluirInactivos ? new HttpParams() : new HttpParams().set('activo', true);
    }
    private optionalText(value: string | undefined): string | undefined {
        const normalized = value?.trim();
        return normalized || undefined;
    }
}

interface CrearClienteRequest {
    nombre: string;
    telefono?: string;
    correo?: string;
}
interface ActualizarClienteRequest {
    nombre?: string;
    telefono?: string;
    correo?: string;
}
interface CrearProveedorRequest {
    nombre: string;
    observaciones?: string;
}
interface ActualizarProveedorRequest {
    nombre?: string;
    observaciones?: string;
}
interface CrearColorRequest {
    nombre: string;
    disponibleProducto: boolean;
    disponibleBordado: boolean;
    orden?: number;
}
interface ActualizarColorRequest {
    nombre?: string;
    disponibleProducto?: boolean;
    disponibleBordado?: boolean;
    orden?: number;
}
interface CrearTallaRequest {
    nombre: string;
    orden?: number;
}
interface ActualizarTallaRequest {
    nombre?: string;
    orden?: number;
}
interface CrearTipografiaRequest {
    nombre: string;
    muestra?: string;
    orden?: number;
}
interface ActualizarTipografiaRequest {
    nombre?: string;
    muestra?: string;
    orden?: number;
}
interface CrearTipoEncajeRequest {
    nombre: string;
    orden?: number;
}
interface ActualizarTipoEncajeRequest {
    nombre?: string;
    orden?: number;
}
