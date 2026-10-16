import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { getApiErrorMessage } from '../../core/api/api-error';
import { ActualizarUsuarioRequest, Usuario } from './models/usuario.model';
import { UsuariosService } from './services/usuarios.service';

type EstadoFiltro = 'todos' | 'activos' | 'inactivos';

@Component({
    selector: 'app-usuarios',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, PasswordModule, TableModule, TagModule, ToastModule, TooltipModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent {
    private readonly fb = inject(FormBuilder);
    private readonly usuariosService = inject(UsuariosService);
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);

    readonly usuarios = signal<Usuario[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly mostrarCrear = signal(false);
    readonly mostrarEditar = signal(false);
    readonly mostrarPassword = signal(false);
    busqueda = '';
    estadoFiltro: EstadoFiltro = 'activos';
    seleccionado: Usuario | null = null;

    readonly crearForm = this.fb.nonNullable.group({
        nombre: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmarPassword: ['', Validators.required]
    });
    readonly editarForm = this.fb.nonNullable.group({
        nombre: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]]
    });
    readonly passwordForm = this.fb.nonNullable.group({
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmarPassword: ['', Validators.required]
    });

    constructor() {
        this.cargar();
    }

    get items(): Usuario[] {
        const query = this.busqueda.trim().toLowerCase();
        return this.usuarios().filter((usuario) => {
            const matchesQuery = !query || `${usuario.nombre} ${usuario.email}`.toLowerCase().includes(query);
            const matchesStatus = this.estadoFiltro === 'todos' || (this.estadoFiltro === 'activos' ? usuario.activo : !usuario.activo);
            return matchesQuery && matchesStatus;
        });
    }

    cargar(): void {
        this.loading.set(true);
        this.usuariosService.getUsuarios().pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (usuarios) => this.usuarios.set(usuarios),
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'Usuarios', detail: this.mensajeError(error) })
        });
    }

    abrirCrear(): void {
        this.crearForm.reset({ nombre: '', email: '', password: '', confirmarPassword: '' });
        this.crearForm.markAsPristine();
        this.crearForm.markAsUntouched();
        this.mostrarCrear.set(true);
    }

    abrirEditar(usuario: Usuario): void {
        this.seleccionado = usuario;
        this.editarForm.reset({ nombre: usuario.nombre, email: usuario.email });
        this.editarForm.markAsPristine();
        this.editarForm.markAsUntouched();
        this.mostrarEditar.set(true);
    }

    abrirPassword(usuario: Usuario): void {
        this.seleccionado = usuario;
        this.passwordForm.reset({ password: '', confirmarPassword: '' });
        this.passwordForm.markAsPristine();
        this.passwordForm.markAsUntouched();
        this.mostrarPassword.set(true);
    }

    crear(): void {
        this.crearForm.markAllAsTouched();
        if (this.crearForm.invalid || !this.passwordsCoinciden(this.crearForm.controls.password.value, this.crearForm.controls.confirmarPassword.value)) return;
        const { nombre, email, password } = this.crearForm.getRawValue();
        this.ejecutarGuardado(this.usuariosService.crearUsuario({ nombre: nombre.trim(), email: email.trim(), password }), 'Usuario creado', () => this.mostrarCrear.set(false));
    }

    editar(): void {
        this.editarForm.markAllAsTouched();
        if (this.editarForm.invalid || !this.seleccionado) return;
        const values = this.editarForm.getRawValue();
        const payload: ActualizarUsuarioRequest = { nombre: values.nombre.trim(), email: values.email.trim() };
        this.ejecutarGuardado(this.usuariosService.actualizarUsuario(this.seleccionado.id, payload), 'Usuario actualizado', () => this.mostrarEditar.set(false));
    }

    cambiarPassword(): void {
        this.passwordForm.markAllAsTouched();
        if (this.passwordForm.invalid || !this.seleccionado) return;
        const { password, confirmarPassword } = this.passwordForm.getRawValue();
        if (!this.passwordsCoinciden(password, confirmarPassword)) return;
        this.ejecutarGuardado(this.usuariosService.cambiarPassword(this.seleccionado.id, { password }), 'Contraseña actualizada', () => this.mostrarPassword.set(false));
    }

    cambiarEstado(usuario: Usuario): void {
        const activar = !usuario.activo;
        this.confirmation.confirm({
            message: activar ? `¿Activar a ${usuario.nombre}?` : `¿Desactivar a ${usuario.nombre}?`,
            header: activar ? 'Activar usuario' : 'Desactivar usuario',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Confirmar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.saving.set(true);
                this.usuariosService.cambiarActivo(usuario.id, activar).pipe(finalize(() => this.saving.set(false))).subscribe({
                    next: () => { this.messages.add({ severity: 'success', summary: 'Estado actualizado', detail: 'El cambio quedó guardado.' }); this.cargar(); },
                    error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo actualizar', detail: this.mensajeError(error) })
                });
            }
        });
    }

    esUsuarioActual(usuario: Usuario): boolean { return usuario.id === this.auth.getCurrentUser()?.id; }

    fecha(value: string | Date): Date { return value instanceof Date ? value : new Date(value); }

    passwordsCoinciden(password: string, confirmacion: string): boolean {
        if (password === confirmacion) return true;
        this.messages.add({ severity: 'warn', summary: 'Contraseñas diferentes', detail: 'La confirmación debe coincidir con la contraseña.' });
        return false;
    }

    private ejecutarGuardado(request: ReturnType<UsuariosService['crearUsuario']>, resumen: string, onSuccess: () => void): void {
        this.saving.set(true);
        request.pipe(finalize(() => this.saving.set(false))).subscribe({
            next: () => { onSuccess(); this.messages.add({ severity: 'success', summary: resumen, detail: 'El cambio quedó guardado.' }); this.cargar(); },
            error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo guardar', detail: this.mensajeError(error) })
        });
    }

    private mensajeError(error: unknown): string {
        if (error instanceof HttpErrorResponse && error.status === 409) return 'El correo ya está registrado';
        return getApiErrorMessage(error, 'No fue posible completar la operación.');
    }
}
