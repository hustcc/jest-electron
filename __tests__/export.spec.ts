import { name } from '../src';

describe('jest-electron', () => {
  test('export', () => {
    expect(name).toBe('jest-electron');
  });
});
