export type SpawnArgsMapArray = (string | number | bigint | false | null | undefined | SpawnArgsMapArray)[];
export type SpawnArgsMap = Record<string, string | number | bigint | boolean | null | undefined | SpawnArgsMapArray>;
export type SpawnArgs = SpawnArgsMap | (
  | string | number | bigint | false | null | undefined
  | SpawnArgs
  | SpawnArgsMap
)[];
