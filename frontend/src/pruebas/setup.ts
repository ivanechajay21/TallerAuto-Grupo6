import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpieza del DOM entre pruebas.
afterEach(() => {
  cleanup();
});
