import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const isLoginRequest = req.url.endsWith('/auth/login');
    const token = auth.accessToken();
    const request = token && !isLoginRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next(request).pipe(
        catchError((error) => {
            if (error.status === 401 && !isLoginRequest && router.url !== '/login') auth.logout();
            return throwError(() => error);
        })
    );
};
