import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
    id: string;
    email: string;
    nombre: string;
    activo: boolean;
}

interface LoginResponse {
    access_token: string;
    usuario: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly apiUrl = environment.apiUrl;
    private hydrationRequest$: Observable<boolean> | null = null;

    readonly accessToken = signal<string | null>(null);
    readonly usuario = signal<AuthUser | null>(null);
    readonly isAuthenticated = computed(() => !!this.accessToken() && !!this.usuario());
    private readonly hydrated = signal(false);

    login(email: string, password: string): Observable<AuthUser> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
            tap(({ access_token, usuario }) => this.setSession(access_token, usuario)),
            map(({ usuario }) => usuario)
        );
    }

    logout(): void {
        this.clearSession();
        void this.router.navigateByUrl('/login');
    }

    hydrateSession(): Observable<boolean> {
        if (this.hydrated()) return of(this.isAuthenticated());
        if (this.hydrationRequest$) return this.hydrationRequest$;

        const token = localStorage.getItem('access_token');
        const storedUser = this.readStoredUser();
        if (!token || !storedUser) {
            this.clearSession();
            this.hydrated.set(true);
            return of(false);
        }

        this.accessToken.set(token);
        this.usuario.set(storedUser);
        this.hydrationRequest$ = this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
            tap((user) => {
                this.usuario.set(user);
                localStorage.setItem('auth_user', JSON.stringify(user));
                this.hydrated.set(true);
            }),
            map(() => true),
            catchError(() => {
                this.clearSession();
                this.hydrated.set(true);
                return of(false);
            }),
            tap(() => (this.hydrationRequest$ = null)),
            shareReplay(1)
        );
        return this.hydrationRequest$;
    }

    getCurrentUser(): AuthUser | null {
        return this.usuario();
    }

    private setSession(token: string, user: AuthUser): void {
        this.accessToken.set(token);
        this.usuario.set(user);
        this.hydrated.set(true);
        localStorage.setItem('access_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
    }

    private clearSession(): void {
        this.accessToken.set(null);
        this.usuario.set(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
    }

    private readStoredUser(): AuthUser | null {
        try {
            const value = localStorage.getItem('auth_user');
            return value ? (JSON.parse(value) as AuthUser) : null;
        } catch {
            return null;
        }
    }
}
