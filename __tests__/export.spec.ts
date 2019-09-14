import { Version, Package } from '../src';

describe('jest-electron', () => {
  test('export', () => {
    expect(Version).toBe('0.1.2');
    expect(Package).toBe('jest-electron');
  });
});
