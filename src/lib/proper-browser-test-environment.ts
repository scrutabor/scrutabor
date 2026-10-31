/** The browser the Proper store expects, with nothing stored: `$app/environment` reports a
 * browser and `$lib/storage` reads null and keeps nothing. Vitest registers both mocks when this
 * module runs, so a test file imports it before any module that reaches either. */
import { vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true, dev: false }));
vi.mock('$lib/storage', () => ({ readStored: () => null, writeStored: () => {} }));
