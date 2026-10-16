import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { CatalogosService } from './services/catalogos.service';
import { getApiErrorMessage } from '../../core/api/api-error';

type SectionKey = 'clientes' | 'proveedores' | 'colores' | 'tallas' | 'tipografias' | 'encajes';

@Component({
    selector: 'app-catalogos',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, TableModule, TagModule, ToastModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './catalogos.component.html',
    styleUrl: './catalogos.component.scss'
})
export class CatalogosComponent {
    readonly catalogos = inject(CatalogosService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    activeSection: SectionKey = 'clientes';
    busqueda = '';
    estadoFiltro: 'todos' | 'activos' | 'inactivos' = 'activos';
    readonly mostrarDialog = signal(false);
    editando = false;
    seleccionado: any = null;
    draft: any = {};
    readonly saving = signal(false);
    readonly sections: Array<{ key: SectionKey; label: string; icon: string }> = [
        { key: 'clientes', label: 'Clientes recurrentes', icon: 'pi-users' },
        { key: 'proveedores', label: 'Proveedores', icon: 'pi-building' },
        { key: 'colores', label: 'Colores', icon: 'pi-palette' },
        { key: 'tallas', label: 'Tallas', icon: 'pi-arrows-v' },
        { key: 'tipografias', label: 'Tipografías', icon: 'pi-align-center' },
        { key: 'encajes', label: 'Tipos de encaje', icon: 'pi-star' }
    ];

    constructor() {
        this.catalogos.cargarCatalogos().subscribe({ error: (error) => this.messages.add({ severity: 'error', summary: 'Catálogos', detail: getApiErrorMessage(error, 'No fue posible cargar los catálogos.') }) });
    }

    get titulo(): string {
        return this.sections.find((section) => section.key === this.activeSection)?.label ?? 'Catálogo';
    }
    get items(): any[] {
        const source: Record<string, any[]> = {
            clientes: this.catalogos.clientes(),
            proveedores: this.catalogos.proveedores(),
            colores: this.catalogos.colores(),
            tallas: this.catalogos.tallas(),
            tipografias: this.catalogos.tipografias(),
            encajes: this.catalogos.tiposEncaje()
        };
        const query = this.busqueda.trim().toLowerCase();
        return (source[this.activeSection] ?? []).filter((item) => (!query || `${item.nombre} ${item.clave ?? ''}`.toLowerCase().includes(query)) && (this.estadoFiltro === 'todos' || (this.estadoFiltro === 'activos' ? item.activo : !item.activo)));
    }
    seleccionar(section: SectionKey): void {
        this.activeSection = section;
        this.busqueda = '';
    }
    nuevo(): void {
        this.editando = false;
        this.seleccionado = null;
        this.draft = {
            nombre: '',
            activo: true,
            orden: this.items.length + 1,
            clave: '',
            telefono: '',
            correo: '',
            muestra: '',
            disponibleProducto: true,
            disponibleBordado: true,
            aplicaBata: true,
            aplicaPlayera: true,
            aplicaPantalon: true,
            precioSugerido: 0,
            proveedorSugeridoId: null
        };
        this.mostrarDialog.set(true);
    }
    editar(item: any): void {
        this.editando = true;
        this.seleccionado = item;
        this.draft = { ...item };
        this.mostrarDialog.set(true);
    }
    guardar(): void {
        if (!String(this.draft.nombre ?? '').trim() || (this.activeSection === 'encajes' && !String(this.draft.clave ?? '').trim())) {
            this.messages.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Captura los campos obligatorios.' });
            return;
        }
        const draft = { ...this.draft, nombre: String(this.draft.nombre).trim() };
        const request =
            this.activeSection === 'clientes'
                ? this.editando
                    ? this.catalogos.actualizarCliente(this.seleccionado.id, draft)
                    : this.catalogos.crearCliente(draft)
                : this.activeSection === 'proveedores'
                  ? this.editando
                      ? this.catalogos.actualizarProveedor(this.seleccionado.id, draft)
                      : this.catalogos.crearProveedor(draft)
                  : this.activeSection === 'colores'
                    ? this.editando
                        ? this.catalogos.actualizarColor(this.seleccionado.id, draft)
                        : this.catalogos.crearColor(draft)
                    : this.activeSection === 'tallas'
                      ? this.editando
                          ? this.catalogos.actualizarTalla(this.seleccionado.id, draft)
                          : this.catalogos.crearTalla(draft)
                      : this.activeSection === 'tipografias'
                        ? this.editando
                            ? this.catalogos.actualizarTipografia(this.seleccionado.id, draft)
                            : this.catalogos.crearTipografia(draft)
                        : this.editando
                          ? this.catalogos.actualizarTipoEncaje(this.seleccionado.id, draft)
                          : this.catalogos.crearTipoEncaje(draft);
        const typedRequest = request as Observable<unknown>;
        this.saving.set(true);
        typedRequest.pipe(finalize(() => this.saving.set(false))).subscribe({
            next: () => {
                this.mostrarDialog.set(false);
                this.messages.add({ severity: 'success', summary: 'Catálogo actualizado', detail: 'El cambio quedó guardado en el backend.' });
            },
            error: (error) => this.messages.add({ severity: 'error', summary: 'No se pudo guardar', detail: getApiErrorMessage(error) })
        });
    }
    cambiarEstado(item: any): void {
        this.confirmation.confirm({
            message: `${item.activo ? 'Desactivar' : 'Activar'} “${item.nombre}”?`,
            header: 'Confirmar cambio',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Confirmar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.actualizarEstado(item, !item.activo).subscribe({
                    next: () => this.messages.add({ severity: 'success', summary: 'Estado actualizado', detail: 'El cambio quedó guardado en el backend.' }),
                    error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo actualizar', detail: getApiErrorMessage(error) })
                });
            }
        });
    }
    private actualizarEstado(item: any, activo: boolean) {
        const methods: Record<string, (id: string, value: boolean) => any> = {
            clientes: (id, value) => this.catalogos.cambiarEstadoCliente(id, value),
            proveedores: (id, value) => this.catalogos.cambiarEstadoProveedor(id, value),
            colores: (id, value) => this.catalogos.cambiarEstadoColor(id, value),
            tallas: (id, value) => this.catalogos.cambiarEstadoTalla(id, value),
            tipografias: (id, value) => this.catalogos.cambiarEstadoTipografia(id, value),
            encajes: (id, value) => this.catalogos.cambiarEstadoTipoEncaje(id, value)
        };
        return methods[this.activeSection]?.(item.id, activo);
    }
}
