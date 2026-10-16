import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    submit(): void {
        this.error.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.loading.set(true);
        const { email, password } = this.form.getRawValue();
        this.auth.login(email, password).subscribe({
            next: () => { this.loading.set(false); void this.router.navigateByUrl('/'); },
            error: () => { this.loading.set(false); this.error.set('Correo o contraseña incorrectos'); }
        });
    }
}
