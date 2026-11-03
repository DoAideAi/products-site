(() => {
  const search = document.getElementById('blog-search');
  if (!search) return;
  const cards = [...document.querySelectorAll('[data-blog-article]')];
  const filters = [...document.querySelectorAll('[data-blog-filter]')];
  const count = document.getElementById('blog-count');
  const empty = document.getElementById('blog-empty');
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const contents = cards.map(card => normalize(card.textContent));
  let topic = 'all';
  function update() {
    const terms = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
    let visible = 0;
    cards.forEach((card, index) => {
      const matches = (topic === 'all' || card.dataset.category === topic)
        && terms.every(term => contents[index].includes(term));
      card.hidden = !matches;
      if (matches) visible++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.blogFilter === topic)));
    count.textContent = `${visible} ${visible === 1 ? 'article' : 'articles'}`;
    empty.hidden = visible !== 0;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    topic = button.dataset.blogFilter;
    update();
  }));
  search.addEventListener('input', update);
  document.getElementById('blog-reset').addEventListener('click', () => {
    search.value = '';
    topic = 'all';
    update();
    search.focus();
  });
  document.querySelectorAll('[data-blog-controls]').forEach(control => { control.hidden = false; });
  update();
})();
