export const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
