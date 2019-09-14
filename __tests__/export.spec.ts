import { name } from '../src';
import { delay } from '../src/utils/delay';

describe('jest-electron', () => {
  test('async', async () => {
    await delay();
    expect(name).toBe('jest-electron');
  });
});
