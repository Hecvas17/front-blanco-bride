import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepperModule } from 'primeng/stepper';
import { ToastModule } from 'primeng/toast';
import { Router } from '@angular/router';
import { FormularioCatalogosService } from './services/formulario-catalogos.service';
import { FormularioStateService } from './services/formulario-state.service';
import { PedidosService } from '../pedidos/services/pedidos.service';
import { CatalogoOpcion, Cliente, EstatusBataEncaje, FormularioPedido, ProductoAdicionalPedido, Proveedor, TipoBata, TipoCliente, TipoProductoAdicional } from './models/formulario.model';
import { getApiErrorMessage } from '../../core/api/api-error';

type BataGroup = FormGroup<{
    tipo: FormControl<TipoBata>;
    tipoBataId: FormControl<string | null>;
    proveedorId: FormControl<string | null>;
    estatusProveedor: FormControl<'pendiente'>;
    colorId: FormControl<string | null>;
    tallaId: FormControl<string | null>;
    bordadoFrontal: FormControl<string>;
    bordadoPosterior: FormControl<string>;
    colorBordadoId: FormControl<string | null>;
    precio: FormControl<number>;
    observaciones: FormControl<string>;
}>;

@Component({
    selector: 'app-formulario',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, AutoCompleteModule, ButtonModule, DatePickerModule, DialogModule, InputNumberModule, InputTextModule, RadioButtonModule, StepperModule, ToastModule],
    providers: [MessageService],
    templateUrl: './formulario.component.html',
    styleUrl: './formulario.component.scss'
})
export class FormularioComponent {
    private readonly fb = inject(FormBuilder);
    private readonly catalogos = inject(FormularioCatalogosService);
    private readonly state = inject(FormularioStateService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly pedidosService = inject(PedidosService);
    private readonly router = inject(Router);

    activeStep = 1;
    private readonly clientesState = signal<Cliente[]>([]);
    private readonly clientesFiltradosState = signal<Cliente[]>([]);
    private readonly coloresState = signal<CatalogoOpcion[]>([]);
    private readonly tallasState = signal<CatalogoOpcion[]>([]);
    private readonly coloresBordadoState = signal<CatalogoOpcion[]>([]);
    private readonly tipografiasState = signal<CatalogoOpcion[]>([]);
    private readonly tiposEncajeState = signal<CatalogoOpcion[]>([]);
    private readonly proveedoresState = signal<Proveedor[]>([]);
    private readonly productosCatalogoState = signal<Array<{ tipo: TipoProductoAdicional; nombre: string; precioSugerido: number }>>([]);
    get clientes(): Cliente[] { return this.clientesState(); }
    set clientes(value: Cliente[]) { this.clientesState.set(value); }
    get clientesFiltrados(): Cliente[] { return this.clientesFiltradosState(); }
    set clientesFiltrados(value: Cliente[]) { this.clientesFiltradosState.set(value); }
    get colores(): CatalogoOpcion[] { return this.coloresState(); }
    set colores(value: CatalogoOpcion[]) { this.coloresState.set(value); }
    get tallas(): CatalogoOpcion[] { return this.tallasState(); }
    set tallas(value: CatalogoOpcion[]) { this.tallasState.set(value); }
    get coloresBordado(): CatalogoOpcion[] { return this.coloresBordadoState(); }
    set coloresBordado(value: CatalogoOpcion[]) { this.coloresBordadoState.set(value); }
    get tipografias(): CatalogoOpcion[] { return this.tipografiasState(); }
    set tipografias(value: CatalogoOpcion[]) { this.tipografiasState.set(value); }
    get tiposEncaje(): CatalogoOpcion[] { return this.tiposEncajeState(); }
    set tiposEncaje(value: CatalogoOpcion[]) { this.tiposEncajeState.set(value); }
    get proveedores(): Proveedor[] { return this.proveedoresState(); }
    set proveedores(value: Proveedor[]) { this.proveedoresState.set(value); }
    get productosCatalogo(): Array<{ tipo: TipoProductoAdicional; nombre: string; precioSugerido: number }> { return this.productosCatalogoState(); }
    set productosCatalogo(value: Array<{ tipo: TipoProductoAdicional; nombre: string; precioSugerido: number }>) { this.productosCatalogoState.set(value); }
    tiposClienteCatalogo: string[] = [];
    opcionesPantufla: Array<{ id: string; nombre: string }> = [];
    tallasMascota: Array<{ id: string; nombre: string }> = [];
    opcionesDual: Array<{ id: string; nombre: string }> = [];
    readonly saving = signal(false);
    complementos: Array<{ id: string; nombre: string; precioSugerido: number }> = [];
    mostrarProductoDialog = false;
    navegacionDesbloqueada = false;
    clienteIdSeleccionado: string | null = null;
    referencias: File[] = [];
    readonly maxFileSize = 10 * 1024 * 1024;
    readonly pasos = ['Datos generales', 'Batas', 'Productos adicionales', 'Diseño', 'Resumen'];

    readonly form = this.fb.group({
        cliente: this.fb.control<Cliente | string | null>(null, Validators.required),
        fechaEvento: this.fb.control<Date | null>(null, Validators.required),
        ubicacion: ['', Validators.required],
        terminacionContacto: ['', Validators.required],
        tipoCliente: this.fb.control<TipoCliente | null>(null, Validators.required),
        tipoClienteOtro: [''],
        anticipo: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
        batas: this.fb.array<BataGroup>([]),
        complementos: this.fb.array<FormGroup>([]),
        productos: this.fb.array<FormGroup>([]),
        tipografiaId: this.fb.control<string | null>(null, Validators.required),
        dualTexto: this.fb.control<string | null>(null, Validators.required),
        detallesComplementos: ['']
    });

    constructor() {
        this.catalogos
            .getClientes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.clientes = items;
                this.clientesFiltrados = items;
            });
        this.catalogos
            .getColores()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.colores = items));
        this.catalogos
            .getTallas()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tallas = items));
        this.catalogos
            .getTiposEncaje()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tiposEncaje = items));
        this.catalogos
            .getColoresBordado()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.coloresBordado = items));
        this.catalogos
            .getTipografias()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tipografias = items));
        this.catalogos
            .getComplementos()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.complementos = items;
                items.forEach((item) => this.complementosForm.push(this.fb.group({ id: [item.id], cantidad: [0, [Validators.min(0)]], precio: [{ value: item.precioSugerido, disabled: true }, [Validators.min(0)]] })));
            });
        this.catalogos
            .getProveedores()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => {
                this.proveedores = items;
                this.batasForm.controls.forEach((bata) => {
                    if (!bata.controls.proveedorId.value) bata.controls.proveedorId.setValue(this.catalogos.getProveedorSugerido(bata.controls.tipo.value));
                });
            });
        this.catalogos
            .getProductosAdicionales()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.productosCatalogo = items));
        this.catalogos
            .getTiposCliente()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tiposClienteCatalogo = items.map((item) => item.nombre)));
        this.catalogos
            .getOpcionesPantufla()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.opcionesPantufla = items.map((item) => ({ id: item.clave, nombre: item.nombre }))));
        this.catalogos
            .getTallasMascota()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.tallasMascota = items.map((item) => ({ id: item.clave, nombre: item.nombre }))));
        this.catalogos
            .getOpcionesDual()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((items) => (this.opcionesDual = items.map((item) => ({ id: item.clave, nombre: item.nombre }))));
        this.agregarBata('adulto');
        this.form.controls.cliente.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            this.clienteIdSeleccionado = typeof value === 'object' && value ? value.id : null;
        });
        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.actualizarDesbloqueo();
            this.sincronizarEstado();
        });
    }

    get batasForm(): FormArray<BataGroup> {
        return this.form.controls.batas;
    }
    get complementosForm(): FormArray<FormGroup> {
        return this.form.controls.complementos;
    }
    get productosForm(): FormArray<FormGroup> {
        return this.form.controls.productos;
    }
    get pedido(): FormularioPedido {
        return this.state.pedido();
    }

    control(name: 'ubicacion' | 'terminacionContacto' | 'tipoClienteOtro' | 'detallesComplementos') {
        return this.form.controls[name];
    }
    bataForm(index: number): BataGroup {
        return this.batasForm.at(index);
    }
    complementoForm(index: number): FormGroup {
        return this.complementosForm.at(index);
    }

    buscarCliente(event: { query: string }): void {
        const query = event.query.toLowerCase().trim();
        this.clientesFiltrados = this.clientes.filter((cliente) => cliente.nombre.toLowerCase().includes(query));
    }

    nombreClienteCapturado(): string {
        const value = this.form.controls.cliente.value;
        return typeof value === 'string' ? value : (value?.nombre ?? '');
    }

    crearBata(tipo: TipoBata): BataGroup {
        return this.fb.group({
            tipo: this.fb.nonNullable.control(tipo),
            tipoBataId: this.fb.control<string | null>(tipo === 'infantil' ? 'infantil' : 'normal'),
            proveedorId: this.fb.control<string | null>(this.catalogos.getProveedorSugerido(tipo), Validators.required),
            estatusProveedor: this.fb.nonNullable.control<'pendiente'>('pendiente'),
            colorId: this.fb.control<string | null>(null, Validators.required),
            tallaId: this.fb.control<string | null>(null, Validators.required),
            bordadoFrontal: this.fb.nonNullable.control(''),
            bordadoPosterior: this.fb.nonNullable.control(''),
            colorBordadoId: this.fb.control<string | null>(null, Validators.required),
            precio: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
            observaciones: this.fb.nonNullable.control('')
        });
    }

    agregarBata(tipo: TipoBata): void {
        this.batasForm.push(this.crearBata(tipo));
    }
    eliminarBata(index: number): void {
        if (this.batasForm.length > 1) this.batasForm.removeAt(index);
    }

    onComplementoCantidad(index: number): void {
        const group = this.complementoForm(index);
        const cantidad = Number(group.get('cantidad')?.value ?? 0);
        const precio = group.get('precio');
        cantidad > 0 ? precio?.enable({ emitEvent: false }) : precio?.disable({ emitEvent: false });
        this.sincronizarEstado();
    }

    seleccionarTipo(tipo: TipoCliente): void {
        this.form.controls.tipoCliente.setValue(tipo);
    }

    agregarProducto(tipo: TipoProductoAdicional): void {
        const catalogo = this.productosCatalogo.find((item) => item.tipo === tipo);
        const group = this.fb.group({
            tipo: [tipo],
            idTemporal: [`producto-${Date.now()}`],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            precio: [catalogo?.precioSugerido ?? 0, [Validators.required, Validators.min(0)]],
            proveedorId: [this.catalogos.getProveedorSugerido(tipo), Validators.required],
            estatusProveedor: ['pendiente'],
            texto: [''],
            observaciones: [''],
            colorProductoId: [null as string | null],
            colorTextoId: [null as string | null],
            tallaId: [null as string | null],
            tallaMascota: [null as 'chica' | 'mediana' | 'grande' | null],
            opcionPantufla: [null as 'xv_plata' | 'xv_dorado' | 'bride_bordado' | 'sin_bordado' | null],
            tipoEncajeId: [null as string | null],
            estatusBataEncaje: ['solicitada' as EstatusBataEncaje]
        });
        if (tipo === 'panuelo' || tipo === 'panuelo_mascota') {
            group.get('colorProductoId')?.addValidators(Validators.required);
            group.get('colorTextoId')?.addValidators(Validators.required);
        }
        if (tipo === 'panuelo_mascota') group.get('tallaMascota')?.addValidators(Validators.required);
        if (tipo === 'pantuflas') group.get('opcionPantufla')?.addValidators(Validators.required);
        if (tipo === 'playera_hombre') {
            group.get('colorProductoId')?.addValidators(Validators.required);
            group.get('tallaId')?.addValidators(Validators.required);
        }
        if (tipo === 'pantalon') {
            group.get('colorProductoId')?.addValidators(Validators.required);
            group.get('tallaId')?.addValidators(Validators.required);
        }
        if (tipo === 'bata_encaje') {
            group.get('tipoEncajeId')?.addValidators(Validators.required);
            group.get('colorProductoId')?.addValidators(Validators.required);
            group.get('tallaId')?.addValidators(Validators.required);
        }
        group.updateValueAndValidity();
        this.productosForm.push(group);
        this.mostrarProductoDialog = false;
    }
    eliminarProducto(index: number): void {
        this.productosForm.removeAt(index);
        this.sincronizarEstado();
    }
    nombreProducto(tipo: TipoProductoAdicional | string): string {
        return this.productosCatalogo.find((item) => item.tipo === tipo)?.nombre ?? tipo;
    }
    nombreProveedor(id: string | null | undefined): string {
        return this.proveedores.find((item) => item.id === id)?.nombre ?? 'Sin proveedor asignado';
    }
    proveedorSugerido(tipo: string): string | null {
        return this.catalogos.getProveedorSugerido(tipo === 'normal' ? 'adulto' : tipo);
    }
    actualizarTipoBata(bata: BataGroup, tipo: string): void {
        bata.controls.tipoBataId.setValue(tipo);
        bata.controls.tipo.setValue(tipo === 'infantil' ? 'infantil' : tipo === 'encaje' ? 'encaje' : 'adulto');
        bata.controls.proveedorId.setValue(this.proveedorSugerido(tipo));
    }
    numero(value: unknown): number {
        return Number(value ?? 0);
    }
    tieneProveedor(proveedorId: string): boolean {
        return this.productosForm.controls.some((producto) => producto.get('proveedorId')?.value === proveedorId) || this.batasForm.controls.some((bata) => bata.controls.proveedorId.value === proveedorId);
    }
    tieneSinProveedor(): boolean {
        return this.batasForm.controls.some((bata) => !bata.controls.proveedorId.value) || this.productosForm.controls.some((producto) => !producto.get('proveedorId')?.value);
    }
    productoForm(index: number): FormGroup {
        return this.productosForm.at(index);
    }
    productoTipo(index: number): TipoProductoAdicional {
        return this.productoForm(index).get('tipo')?.value as TipoProductoAdicional;
    }
    nombreOpcionPantufla(opcion: string | null): string {
        return ({ xv_plata: 'XV con bordado plata', xv_dorado: 'XV con bordado dorado', bride_bordado: 'Bride con bordado', sin_bordado: 'Sin bordado' } as Record<string, string>)[opcion ?? ''] ?? 'Selecciona una opción';
    }
    subtotalProductos(): number {
        return this.productosForm.controls.reduce((total, group) => total + Number(group.get('cantidad')?.value ?? 0) * Number(group.get('precio')?.value ?? 0), 0);
    }

    archivoSeleccionado(event: Event): void {
        const input = event.target as HTMLInputElement;
        for (const file of Array.from(input.files ?? [])) {
            const extensionValida = file.type.startsWith('image/') || file.type === 'application/pdf';
            if (!extensionValida || file.size > this.maxFileSize) {
                this.messages.add({ severity: 'warn', summary: 'Archivo no válido', detail: `${file.name} debe ser imagen/PDF y pesar máximo 10 MB.` });
                continue;
            }
            if (this.referencias.length < 2 && !this.referencias.some((item) => item.name === file.name)) this.referencias.push(file);
        }
        input.value = '';
        this.sincronizarEstado();
    }

    quitarReferencia(index: number): void {
        this.referencias.splice(index, 1);
        this.sincronizarEstado();
    }
    formatoTamano(bytes: number): string {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    nombreCatalogo(items: CatalogoOpcion[], id: string | null): string {
        return items.find((item) => item.id === id)?.nombre ?? 'Sin seleccionar';
    }
    nombreCliente(id: string | null): string {
        return this.clientes.find((item) => item.id === id)?.nombre ?? 'Sin seleccionar';
    }

    esInvalido(control: { invalid: boolean; touched: boolean }): boolean {
        return control.invalid && control.touched;
    }
    siguiente(): void {
        if (!this.navegacionDesbloqueada && this.activeStep > 1) return;
        if (!this.validarPaso(this.activeStep)) return;
        if (this.activeStep < 5) this.activeStep++;
    }

    anterior(): void {
        if (this.activeStep > 1) this.activeStep--;
    }

    validarPaso(paso: number): boolean {
        if (paso === 1) return this.validarDatosCliente(true);
        return true;
    }

    guardarBorrador(): void {
        this.messages.add({ severity: 'info', summary: 'Borrador guardado', detail: 'Guardado local simulado. Aún no se ha enviado nada.' });
    }
    finalizarPedido(): void {
        if (!this.validarFormularioCompleto()) {
            this.messages.add({ severity: 'warn', summary: 'Pedido incompleto', detail: 'Completa los campos obligatorios pendientes antes de finalizar.' });
            return;
        }
        this.sincronizarEstado();
        this.saving.set(true);
        this.pedidosService
            .crearPedido(this.pedido)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (pedido) => {
                    this.messages.add({ severity: 'success', summary: 'Pedido creado', detail: `${pedido.folio} se guardó correctamente.` });
                    this.router.navigate(['/pedidos', pedido.id]);
                },
                error: (error: unknown) => this.messages.add({ severity: 'error', summary: 'No se pudo crear el pedido', detail: getApiErrorMessage(error) })
            });
    }

    onStepChange(value: number | string | null | undefined): void {
        const paso = Number(value ?? 1);
        if (paso > 1 && !this.navegacionDesbloqueada) {
            this.activeStep = 1;
            this.messages.add({ severity: 'info', summary: 'Completa los datos del cliente', detail: 'Ese paso es necesario para desbloquear el resto del formulario.' });
            return;
        }
        this.activeStep = paso;
    }

    marcarPaso(paso: number): void {
        this.onStepChange(paso);
    }

    validarDatosClienteVisual(): boolean {
        return this.validarDatosCliente(false);
    }

    private actualizarDesbloqueo(): void {
        if (!this.navegacionDesbloqueada && this.validarDatosCliente(false)) this.navegacionDesbloqueada = true;
    }

    private validarDatosCliente(marcarControles: boolean): boolean {
        if (this.form.controls.tipoCliente.value === 'Otro') this.form.controls.tipoClienteOtro.setValidators(Validators.required);
        else this.form.controls.tipoClienteOtro.clearValidators();
        this.form.controls.tipoClienteOtro.updateValueAndValidity({ emitEvent: false });
        const controls = [
            this.form.controls.cliente,
            this.form.controls.fechaEvento,
            this.form.controls.ubicacion,
            this.form.controls.terminacionContacto,
            this.form.controls.tipoCliente,
            this.form.controls.anticipo,
            this.form.controls.tipoClienteOtro
        ];
        if (marcarControles) controls.forEach((control) => control.markAsTouched());
        const valido = controls.every((control) => control.valid);
        if (!valido && marcarControles) this.messages.add({ severity: 'warn', summary: 'Revisa los datos del cliente', detail: 'Completa los campos obligatorios para continuar.' });
        return valido;
    }

    private validarFormularioCompleto(): boolean {
        const datosValidos = this.validarDatosCliente(true);
        this.batasForm.controls.forEach((group) => Object.values(group.controls).forEach((control) => control.markAsTouched()));
        this.productosForm.controls.forEach((group) => Object.values(group.controls).forEach((control) => control.markAsTouched()));
        this.form.controls.tipografiaId.markAsTouched();
        this.form.controls.dualTexto.markAsTouched();
        const batasValidas = this.batasForm.valid;
        const productosValidos = this.productosForm.controls.every((group) => group.valid);
        const diseñoValido = this.form.controls.tipografiaId.valid && this.form.controls.dualTexto.valid;
        if (!datosValidos) this.activeStep = 1;
        else if (!batasValidas) this.activeStep = 2;
        else if (!productosValidos) this.activeStep = 3;
        else if (!diseñoValido) this.activeStep = 4;
        return datosValidos && batasValidas && productosValidos && diseñoValido;
    }

    subtotalBatas(): number {
        return this.batasForm.controls.reduce((total, group) => total + Number(group.controls.precio.value || 0), 0);
    }
    subtotalComplementos(): number {
        return this.complementosForm.controls.reduce((total, group) => total + Number(group.get('cantidad')?.value || 0) * Number(group.get('precio')?.value || 0), 0);
    }
    total(): number {
        return this.subtotalBatas() + this.subtotalProductos();
    }
    restante(): number {
        return this.total() - Number(this.form.controls.anticipo.value || 0);
    }
    cantidadComplementos(): number {
        return this.productosForm.controls.reduce((total, group) => total + Number(group.get('cantidad')?.value || 0), 0);
    }

    private sincronizarEstado(): void {
        const value = this.form.getRawValue();
        this.state.actualizar({
            clienteId: this.clienteIdSeleccionado,
            clienteNombre: this.nombreClienteCapturado(),
            fechaEvento: value.fechaEvento,
            ubicacion: value.ubicacion ?? '',
            terminacionContacto: value.terminacionContacto ?? '',
            tipoCliente: value.tipoCliente as TipoCliente | null,
            tipoClienteOtro: value.tipoClienteOtro ?? '',
            anticipo: Number(value.anticipo ?? 0),
            personalizaciones: value.batas.map((bata, index) => ({ idTemporal: `bata-${index + 1}`, ...bata, proveedorId: bata.proveedorId ?? null, estatusProveedor: 'pendiente' as const })),
            complementos: value.complementos.map((item) => ({ complementoId: String(item['id']), cantidad: Number(item['cantidad'] ?? 0), precio: Number(item['precio'] ?? 0) })),
            productosAdicionales: value.productos.map(
                (item, index) =>
                    ({
                        ...item,
                        idTemporal: String(item['idTemporal'] ?? `producto-${index + 1}`),
                        tipo: item['tipo'] as TipoProductoAdicional,
                        cantidad: Number(item['cantidad'] ?? 0),
                        precio: Number(item['precio'] ?? 0),
                        proveedorId: item['proveedorId'] ?? null,
                        estatusProveedor: 'pendiente' as const
                    }) as ProductoAdicionalPedido
            ),
            tipografiaId: value.tipografiaId,
            dualTexto: value.dualTexto,
            detallesComplementos: value.detallesComplementos ?? '',
            referencias: this.referencias.map((file, index) => ({ id: `ref-${index + 1}`, file, nombre: file.name, tamano: file.size }))
        });
    }
}
