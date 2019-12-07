import { sum } from './test';

describe('jest-electron', () => {
  test('sum', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
