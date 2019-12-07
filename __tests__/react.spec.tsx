import * as React from 'react';
import * as ReactDOM from 'react-dom';

describe('jest-electron', () => {
  test('react', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    ReactDOM.render(<div>jest electron run with react</div>, div);

    expect(div.innerHTML).toBe('<div>jest electron run with react</div>');
  });
});
