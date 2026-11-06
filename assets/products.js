(() => {
  const form = document.getElementById('catalog-filters');
  if (!form) return;
  const search = document.getElementById('product-search');
  const category = document.getElementById('product-category');
  const cards = [...document.querySelectorAll('.catalog-card')];
  const empty = document.getElementById('catalog-empty');
  const count = document.getElementById('catalog-count');
  function filter() {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const matches = (category.value === 'all' || card.dataset.category === category.value) &&
        words.every(word => card.textContent.toLocaleLowerCase().includes(word));
      card.hidden = !matches;
      if (matches) shown++;
    }
    count.textContent = `${shown} of ${cards.length} projects`;
    empty.hidden = shown !== 0;
  }
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  form.addEventListener('reset', () => {
    search.value = '';
    category.value = 'all';
    filter();
  });
  document.getElementById('empty-reset').addEventListener('click', () => {
    form.reset();
    search.focus();
  });
  // A featured-project anchor should remain reachable after filtering.
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    const card = cards.find(item => item.id === id);
    if (card?.hidden) {
      form.reset();
      card.scrollIntoView();
    }
  });
  filter();
})();
