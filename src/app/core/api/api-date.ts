export function dateToApiDate(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function apiDateToLocal(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
}
