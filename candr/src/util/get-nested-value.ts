export const getNestedValue = <T>(
  value: any,
  pathParts: [string | number, ...(string | number)[]],
  predicate?: (value: unknown) => value is T,
): T | undefined => {
  for (const pathPart of pathParts) {
    value = value?.[pathPart];
  }

  return !predicate || predicate(value) ? value : undefined;
};
