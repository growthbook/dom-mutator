import mutate from '../src';

let _cleanup: (() => void)[] = [];
function cleanup(f: () => void) {
  _cleanup.push(f);
}
function revertAll() {
  _cleanup.forEach(f => f());
  _cleanup = [];
}

describe('mutate', () => {
  beforeEach(() => {
    revertAll();
    document.body.innerHTML = '';
  });

  it('mutates existing elements and reverts', () => {
    const initial = '<h1>title</h1><p class="text green">wor</p>';
    document.body.innerHTML = initial;

    cleanup(mutate('h1', 'setHTML', 'hello'));
    expect(document.body.innerHTML).toEqual(
      '<h1>hello</h1><p class="text green">wor</p>'
    );

    cleanup(mutate('h1', 'addClass', 'title'));
    expect(document.body.innerHTML).toEqual(
      '<h1 class="title">hello</h1><p class="text green">wor</p>'
    );

    cleanup(mutate('.text', 'removeClass', 'green'));
    expect(document.body.innerHTML).toEqual(
      '<h1 class="title">hello</h1><p class="text">wor</p>'
    );

    cleanup(mutate('.text', 'appendHTML', 'ld!'));
    expect(document.body.innerHTML).toEqual(
      '<h1 class="title">hello</h1><p class="text">world!</p>'
    );

    cleanup(mutate('h1.title', 'setAttribute', 'title="title"'));
    expect(document.body.innerHTML).toEqual(
      '<h1 class="title" title="title">hello</h1><p class="text">world!</p>'
    );

    revertAll();
    expect(document.body.innerHTML).toEqual(initial);
  });

  it('reapplies changes quickly when mutation occurs', () => {
    document.body.innerHTML = '<p>original</p>';
    const el = document.querySelector('p');
    if (!el) return;
    cleanup(mutate('p', 'setHTML', 'new'));

    expect(el.innerHTML).toEqual('new');
    el.innerHTML = 'original';
    setTimeout(() => {
      expect(el.innerHTML).toEqual('new');
    }, 17);
  });

  it('reverts correctly after reapplying changes', () => {
    document.body.innerHTML = '<p>original</p>';
    const el = document.querySelector('p');
    if (!el) return;
    cleanup(mutate('p', 'setHTML', 'new'));
    expect(el.innerHTML).toEqual('new');

    el.innerHTML = 'new normal';
    setTimeout(() => {
      expect(el.innerHTML).toEqual('new');

      revertAll();
      expect(el.innerHTML).toEqual('new normal');
    }, 17);
  });
});
