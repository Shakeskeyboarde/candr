import { getNestedValue } from './get-nested-value.js';
import { isObject } from './is-object.js';

export const getNestedDict = <T>(
  value: any,
  pathParts: [string | number, ...(string | number)[]],
  predicate?: (value: unknown, key: string) => value is T,
): Record<string, T> | undefined => {
  const dict = getNestedValue(value, pathParts, isObject);

  if (!dict) return;
  if (!predicate) return dict as Record<string, T>;

  return Object.fromEntries(Object.entries(dict)
    .filter((entry): entry is [string, T] => predicate(entry[1], entry[0])));
};
