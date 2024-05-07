export const tryJson = <T>(text: string | undefined, predicate?: (value: unknown) => value is T): T | undefined => {
  if (text == null) return undefined;

  let parsed: any;

  try {
    parsed = JSON.parse(text);
  }
  catch {
    return;
  }

  if (!predicate || predicate(parsed)) return parsed;
};
