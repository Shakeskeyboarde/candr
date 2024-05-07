import os from 'node:os';

/**
 * Escape arguments for execution in a shell. Assume `sh` on nix-like systems
 * and `cmd.exe` on Windows.
 *
 * Borrowed from NPM's promise-spawn package:
 * https://github.com/npm/promise-spawn/blob/main/lib/escape.js
 */
export const escapeArgs = os.platform().startsWith('win')
  // cmd.exe
  ? (args: string[]): string[] => args.map((arg) => {
    // Bail out early with a simple double quote for zero length strings.
    if (!arg.length) return '""';

    // Quote only if necessary. This is simplified from the promise-spawn
    // implementation. Interpreting their code seems to indicate that quotes
    // and backslashes inside double quotes should be escaped with backslashes.
    // This apparently gets discrete arguments through the windows
    // CreateProcess function.
    if (/[ \t\n\v"]/u.test(arg)) {
      arg = `"${arg.replaceAll(/[+\\]/gu, '\\$&')}"`;
    }

    // Prefix meta chars with a ^, so that they have no special meaning to CMD.
    arg = arg.replace(/[ !%^&()|"<>]/gu, '^$&');

    return arg;
  })
  // bash
  : (args: string[]): string[] => args.map((arg) => {
    if (!arg.length) return `''`;
    if (!/[\t\n\r ~`#$&*()\\|;"'<>?]/u.test(arg)) return arg;

    // Wrap single quotes around all segments that do not contain single
    // quotes, and backslash escape any existing single quotes. The reason for
    // handling single quotes separately from other special characters is that
    // single quoted strings cannot contain single quotes (there is no
    // backslash escaping inside single quotes).
    return arg.replaceAll(/[^']+|(')/gu, (match, singleQuote) => singleQuote ? "\\'" : `'${match}'`);
  });
