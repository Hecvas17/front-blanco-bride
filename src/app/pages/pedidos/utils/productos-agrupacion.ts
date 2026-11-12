export interface ProductoAgrupable {
    grupoProductoId?: string | null;
    cantidad?: number | null;
}

export interface GrupoProductoVisual<T> {
    grupoProductoId: string | null;
    cantidad: number;
    productoRepresentativo: T;
    piezas: T[];
}

/** Agrupa por grupoProductoId y después separa variantes visuales dentro del grupo. */
export function agruparProductosVisualmente<T extends ProductoAgrupable>(items: readonly T[], claveVisual: (item: T) => string): GrupoProductoVisual<T>[] {
    const grupos = new Map<string, Map<string, GrupoProductoVisual<T>>>();

    items.forEach((item, index) => {
        const grupoProductoId = item.grupoProductoId?.trim() || null;
        const grupoKey = grupoProductoId ?? `legacy-${index}`;
        const visualKey = claveVisual(item);
        const grupoVisuales = grupos.get(grupoKey) ?? new Map<string, GrupoProductoVisual<T>>();
        const actual = grupoVisuales.get(visualKey);
        const cantidad = Math.max(1, Number(item.cantidad ?? 1));

        if (actual) {
            actual.cantidad += cantidad;
            actual.piezas.push(item);
        } else {
            grupoVisuales.set(visualKey, { grupoProductoId, cantidad, productoRepresentativo: item, piezas: [item] });
        }
        grupos.set(grupoKey, grupoVisuales);
    });

    return Array.from(grupos.values()).flatMap((variantes) => Array.from(variantes.values()));
}

export function claveVisual(...values: readonly unknown[]): string {
    return JSON.stringify(values.map((value) => value ?? ''));
}

export function etiquetaConCantidad(nombre: string, cantidad: number): string {
    return cantidad > 1 ? `${nombre} ×${cantidad}` : nombre;
}
