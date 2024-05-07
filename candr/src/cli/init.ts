import { supportsColor } from 'chalk';

import { Logger } from '../logger/logger.js';
import { isBoolean } from '../util/is-boolean.js';
import { isInteger } from '../util/is-integer.js';
import { isNumber } from '../util/is-number.js';
import { isString } from '../util/is-string.js';
import { tryJson } from '../util/try-json.js';
import { type GlobalOptions } from './global-options.js';

const KEY_TO_ENV = {
  filter: 'CANDR_CONFIG_FILTER',
  filterAllowRoot: 'CANDR_CONFIG_FILTER_ALLOW_ROOT',
  stream: 'CANDR_CONFIG_STREAM',
  parallel: 'CANDR_CONFIG_PARALLEL',
  concurrency: 'CANDR_CONFIG_CONCURRENCY',
  delay: 'CANDR_CONFIG_DELAY_SECONDS',
} as const satisfies Record<Exclude<keyof GlobalOptions, 'logLevel' | 'color'>, string>;

const get = <K extends keyof typeof KEY_TO_ENV>(
  partialOptions: Partial<GlobalOptions>,
  key: K,
  predicate: (value: unknown) => value is GlobalOptions[K],
  defaultValue: GlobalOptions[K],
): GlobalOptions[K] => {
  return partialOptions[key] ?? tryJson(process.env[KEY_TO_ENV[key]], predicate) ?? defaultValue;
};

const isFilter = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isConcurrency = (value: unknown): value is number | 'auto' => value === 'auto' || (isInteger(value) && value >= 1);
const isPositiveNumber = (value: unknown): value is number => isNumber(value) && value >= 0;

export const init = (partialOptions: Partial<GlobalOptions>): GlobalOptions => {
  const filter = get(partialOptions, 'filter', isFilter, []);
  const filterAllowRoot = get(partialOptions, 'filterAllowRoot', isBoolean, false);
  const stream = get(partialOptions, 'stream', isBoolean, false);
  const parallel = !stream && get(partialOptions, 'parallel', isBoolean, false);
  const concurrency = get(partialOptions, 'concurrency', isConcurrency, 'auto');
  const delay = get(partialOptions, 'delay', isPositiveNumber, 0);

  process.env.CANDR_CONFIG_FILTER = JSON.stringify(filter);
  process.env.CANDR_CONFIG_FILTER_ALLOW_ROOT = JSON.stringify(filterAllowRoot);
  process.env.CANDR_CONFIG_PARALLEL = JSON.stringify(parallel);
  process.env.CANDR_CONFIG_STREAM = JSON.stringify(stream);
  process.env.CANDR_CONFIG_CONCURRENCY = JSON.stringify(concurrency);
  process.env.CANDR_CONFIG_DELAY_SECONDS = JSON.stringify(delay);

  if (partialOptions.logLevel) {
    Logger.setLevel(partialOptions.logLevel);
  }

  if (!supportsColor || !partialOptions.color) {
    process.env.FORCE_COLOR = '0';
    process.env.NO_COLOR = '1';
  }

  const globalOptions: GlobalOptions = {
    filter,
    filterAllowRoot,
    parallel,
    stream,
    concurrency,
    delay,
    logLevel: Logger.level,
    color: Boolean(supportsColor),
  };

  return globalOptions;
};
