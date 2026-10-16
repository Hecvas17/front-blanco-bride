import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CatalogosService } from '../../catalogos/services/catalogos.service';
import { CatalogoOpcion, Cliente, Proveedor } from '../models/formulario.model';

@Injectable({ providedIn: 'root' })
export class FormularioCatalogosService {
    private readonly catalogos = inject(CatalogosService);

    getClientes(): Observable<Cliente[]> {
        return this.catalogos.getClientes().pipe(map((items) => items.filter((item) => item.activo)));
    }
    getColores(): Observable<CatalogoOpcion[]> {
        return this.catalogos.getColoresProducto();
    }
    getTallas(): Observable<CatalogoOpcion[]> {
        return this.catalogos.getTallas();
    }
    getTiposEncaje(): Observable<CatalogoOpcion[]> {
        return this.catalogos.getTiposEncaje().pipe(map((items) => items.map((item) => ({ id: item.id, nombre: item.nombre }))));
    }
    getColoresBordado(): Observable<CatalogoOpcion[]> {
        return this.catalogos.getColoresBordado();
    }
    getTipografias(): Observable<CatalogoOpcion[]> {
        return this.catalogos.getTipografias();
    }
    getComplementos() {
        return this.catalogos.getComplementos();
    }
    getProductosAdicionales() {
        return this.catalogos.getTiposProducto().pipe(map((items) => items.map((item) => ({ tipo: item.clave as any, nombre: item.nombre, precioSugerido: item.precioSugerido }))));
    }
    getProveedores(): Observable<Proveedor[]> {
        return this.catalogos.getProveedores().pipe(map((items) => items.filter((item) => item.activo)));
    }
    getProveedorSugerido(tipo: string): string | null {
        const nombre =
            tipo === 'normal' || tipo === 'adulto' || tipo === 'infantil' || tipo === 'encaje'
                ? 'Proveedor de Batas'
                : tipo === 'panuelo' || tipo === 'panuelo_mascota'
                  ? 'Proveedor de Pañuelos'
                  : tipo === 'playera_hombre'
                    ? 'Proveedor de Playeras'
                    : 'Proveedor General';
        return this.catalogos.proveedores().find((item) => item.nombre === nombre)?.id ?? null;
    }

    agregarCliente(cliente: Cliente) {
        return this.catalogos.crearCliente({ ...cliente, activo: true });
    }

    getTiposProducto() {
        return this.catalogos.getTiposProducto();
    }
    getTiposCliente() {
        return this.catalogos.getTiposCliente();
    }
    getOpcionesPantufla() {
        return this.catalogos.getOpcionesPantufla();
    }
    getTallasMascota() {
        return this.catalogos.getTallasMascota();
    }
    getOpcionesDual() {
        return this.catalogos.getOpcionesDual();
    }
    getEstatusPedido() {
        return this.catalogos.getEstatusPedido();
    }
    getEstatusProveedor() {
        return this.catalogos.getEstatusProveedor();
    }
    getEstatusBataEncaje() {
        return this.catalogos.getEstatusBataEncaje();
    }
}
