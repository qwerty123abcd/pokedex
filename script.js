const API = 'https://pokeapi.co/api/v2/pokemon';
const PAGE_SIZE = 48;

const TYPE_COLORS = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c',
  grass: '#7ac74c', ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1',
  ground: '#e2bf65', flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a',
  rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', dark: '#705746',
  steel: '#b7b7ce', fairy: '#d685ad'
};

const state = { pokemon: [], offset: 0, total: null, type: 'all', query: '' };

const $ = id => document.getElementById(id);
const grid = $('grid'), moreBtn = $('more'), modal = $('modal');

const color = p => TYPE_COLORS[p.types[0].type.name] || '#777';
const art = p => p.sprites.other['official-artwork'].front_default || p.sprites.front_default || '';
const pad = n => '#' + String(n).padStart(4, '0');

/* ---------- loading ---------- */
async function loadMore() {
  moreBtn.disabled = true;
  moreBtn.textContent = 'Loading…';
  try {
    const res = await fetch(`${API}?limit=${PAGE_SIZE}&offset=${state.offset}`);
    const list = await res.json();
    state.total = list.count;
    const details = await Promise.all(list.results.map(r => fetch(r.url).then(x => x.json())));
    state.pokemon.push(...details);
    state.offset += PAGE_SIZE;
    render();
  } catch (err) {
    $('count').textContent = 'Could not reach PokéAPI. Check your connection and try again.';
  }
  moreBtn.disabled = false;
  moreBtn.textContent = 'Load more';
  if (state.offset >= state.total) moreBtn.hidden = true;
}

/* ---------- rendering ---------- */
function typeTags(p) {
  return p.types.map(t => `<span class="tag">${t.type.name}</span>`).join('');
}

function render() {
  const q = state.query.trim().toLowerCase();
  const shown = state.pokemon.filter(p =>
    (state.type === 'all' || p.types.some(t => t.type.name === state.type)) &&
    (!q || p.name.includes(q) || String(p.id) === q.replace('#', ''))
  );

  grid.innerHTML = shown.map(p => `
    <button class="card" data-id="${p.id}" style="--c:${color(p)}">
      <span class="num">${pad(p.id)}</span>
      <img class="art" src="${art(p)}" alt="" loading="lazy">
      <h2>${p.name}</h2>
      <div class="types">${typeTags(p)}</div>
    </button>`).join('');

  $('empty').hidden = shown.length > 0;
  $('count').textContent = `Showing ${shown.length} of ${state.pokemon.length} loaded · ${state.total ?? '…'} total`;
}

function openDetail(p) {
  modal.style.setProperty('--c', color(p));
  const stats = p.stats.map(s => `
    <div class="stat"><span>${s.stat.name.replace('-', ' ')}</span>
      <div class="bar"><i style="width:${Math.min(s.base_stat / 255 * 100, 100)}%"></i></div>
      <b>${s.base_stat}</b></div>`).join('');
  $('detail').innerHTML = `
    <div class="d-top">
      <img src="${art(p)}" alt="${p.name}">
      <h2>${p.name} <small>${pad(p.id)}</small></h2>
      <div class="types">${typeTags(p)}</div>
    </div>
    <div class="d-body">
      <div class="facts">
        <div>Height <b>${p.height / 10} m</b></div>
        <div>Weight <b>${p.weight / 10} kg</b></div>
        <div>Base XP <b>${p.base_experience ?? '–'}</b></div>
        <div>Abilities <b>${p.abilities.map(a => a.ability.name.replace('-', ' ')).join(', ')}</b></div>
      </div>
      ${stats}
    </div>`;
  modal.showModal();
}

/* ---------- events ---------- */
function buildFilters() {
  const names = ['all', ...Object.keys(TYPE_COLORS)];
  $('filters').innerHTML = names.map(n =>
    `<button class="chip" type="button" data-type="${n}" aria-pressed="${n === 'all'}">${n}</button>`).join('');
}

$('filters').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  state.type = chip.dataset.type;
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === chip));
  render();
});

$('search').addEventListener('input', e => { state.query = e.target.value; render(); });

// Enter looks up an exact name or number straight from the API
$('search').addEventListener('keydown', async e => {
  if (e.key !== 'Enter' || !state.query.trim()) return;
  const term = state.query.trim().toLowerCase().replace('#', '');
  try {
    const res = await fetch(`${API}/${encodeURIComponent(term)}`);
    if (!res.ok) throw new Error();
    openDetail(await res.json());
  } catch {
    $('empty').hidden = false;
    $('empty').textContent = 'No Pokémon found with that name or number.';
  }
});

grid.addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (card) openDetail(state.pokemon.find(p => p.id === +card.dataset.id));
});

$('close').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
moreBtn.addEventListener('click', loadMore);

buildFilters();
loadMore();
