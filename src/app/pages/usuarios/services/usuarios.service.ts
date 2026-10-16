import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarPasswordRequest, ActualizarUsuarioRequest, CrearUsuarioRequest, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`);
    }

    getUsuarioById(id: string): Observable<Usuario> {
        return this.http.get<Usuario>(`${this.apiUrl}/usuarios/${id}`);
    }

    crearUsuario(payload: CrearUsuarioRequest): Observable<Usuario> {
        return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, payload);
    }

    actualizarUsuario(id: string, payload: ActualizarUsuarioRequest): Observable<Usuario> {
        return this.http.patch<Usuario>(`${this.apiUrl}/usuarios/${id}`, payload);
    }

    cambiarActivo(id: string, activo: boolean): Observable<Usuario> {
        return this.http.patch<Usuario>(`${this.apiUrl}/usuarios/${id}/activo`, { activo });
    }

    cambiarPassword(id: string, payload: ActualizarPasswordRequest): Observable<Usuario> {
        return this.http.patch<Usuario>(`${this.apiUrl}/usuarios/${id}/password`, payload);
    }
}
