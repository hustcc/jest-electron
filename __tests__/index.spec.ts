describe('jest-electron', () => {
  test('document env', () => {
    expect(document).toBeDefined()
  });

  test('create dom', () => {
    const div = document.createElement('div');
    div.innerHTML = 'hello jest-electron';

    document.body.appendChild(div);

    expect(document.querySelector('div').innerHTML).toBe('hello jest-electron');
  });
});
