import { afterEach } from 'node:test';

import { vi } from 'vitest';

afterEach(() => {
  // Like the Vite `mockRest` option, but _AFTER_ each test, which prevents
  // vi.mock factories from being reset.
  vi.resetAllMocks();
});
