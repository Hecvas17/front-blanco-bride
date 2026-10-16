export interface Usuario {
    id: string;
    nombre: string;
    email: string;
    activo: boolean;
    creadoEn: string | Date;
    actualizadoEn: string | Date;
}

export interface CrearUsuarioRequest {
    nombre: string;
    email: string;
    password: string;
    activo?: boolean;
}

export interface ActualizarUsuarioRequest {
    nombre?: string;
    email?: string;
}

export interface ActualizarPasswordRequest {
    password: string;
}
