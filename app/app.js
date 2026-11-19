/* Leonida Legend — GTA VI trophy guide & tracker.
   Plain ES module, no dependencies, no network at run time:
   it fetches only data/trophies.json from its own folder and
   keeps the checklist in the browser's localStorage. */

const DATA_URL = 'data/trophies.json';
const STORAGE_KEY = 'leonida-legend-v1';

const KIND_LABELS = {
  all: 'All',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  robbery: 'Robbery',
  exploration: 'Exploration',
  side: 'Side quests',
  combat: 'Combat',
  misc: 'Misc',
  online: 'Online',
};

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

const ROADMAP_STAGES = [
  {
    stage: 1,
    title: 'Chapter 1 — First steps',
    when: 'the opening hours',
    text: 'Play the opening chapter. Do Lucia’s balcony meditation the morning after Down to Earth — the one moment in the game that may not come back — and start Cal’s fishing quests and Kenton’s treasure hunt.',
  },
  {
    stage: 2,
    title: 'Chapter 2 — The duo',
    when: 'after Breakfast Run',
    text: 'Breakfast Run unlocks switching between Jason and Lucia, and most of the list opens with it. Start the side strands, the Kingpin Bowling robbery, the garages and the Scooter Bros registrations.',
  },
  {
    stage: 3,
    title: 'Chapter 3 — Vice City opens up',
    when: 'the middle of the story',
    text: 'The city opens up: the cartel heist, the Snap Gun jewelry jobs, partner robberies, Randy’s wish list and Tyrone’s labs. Do Yago’s race the moment it appears — it is time-sensitive.',
  },
  {
    stage: 4,
    title: 'Chapter 4 — The big jobs',
    when: 'the late story',
    text: 'The big jobs: the Chapter 4 story missions, bank vaults once That’s Where The Money Is opens them, armored trucks, and one gang operation per gang.',
  },
  {
    stage: 5,
    title: 'Chapter 5 & the finale',
    when: 'the end of the story',
    text: 'The last chapter and the finale. Keep an untouched manual save from just before the final mission — there is no mission replay.',
  },
  {
    stage: 6,
    title: 'After the credits — cleanup & 100%',
    when: 'free roam, as long as it takes',
    text: 'Free roam carries on after the credits. Finish the 100% checklist, the Strangers & Freaks strands, the side-story finales and every grind trophy, and the platinum pops.',
  },
];

const state = {
  trophies: [],
  earned: new Set(),
  openGuides: new Set(),
  kind: 'all',
  grade: 'all',
  query: '',
  sort: 'roadmap',
  spoiler: true,
  earnedOnly: false,
  view: 'checklist',
};

const els = {};
['progress-fill', 'progress-text', 'stat-row', 'kind-filters', 'search',
 'grade-filter', 'sort-order', 'spoiler-toggle', 'earned-only', 'export-btn',
 'import-btn', 'import-file', 'reset-btn', 'list-count', 'spoiler-note',
 'trophy-list', 'empty-state', 'roadmap', 'missable-list'].forEach((id) => {
  els[id] = document.getElementById(id);
});

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) state.earned = new Set(saved.earned);
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch (err) {
    // A corrupt save is ignored; the checklist just starts empty.
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: [...state.earned],
      spoiler: state.spoiler,
    }));
  } catch (err) {
    // Private mode or a full store: progress still works for this visit.
  }
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isHiddenFromSpoilers(trophy) {
  return state.spoiler && trophy.hidden && !state.earned.has(trophy.id);
}

function trophyMatchesFilters(trophy) {
  if (state.earnedOnly && !state.earned.has(trophy.id)) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'online') return false;
  if (state.kind !== 'all' && state.kind !== 'missable' && trophy.kind !== state.kind) return false;
  if (state.query) {
    const hay = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide + ' ' + trophy.kind).toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function sortedTrophies(list) {
  const copy = [...list];
  if (state.sort === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === 'grade') {
    copy.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => a.roadmap - b.roadmap || a.id - b.id);
  }
  return copy;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderProgress() {
  const total = state.trophies.length;
  const done = state.earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  els['progress-fill'].style.width = pct + '%';
  els['progress-text'].innerHTML = '';
  const strong = el('strong', null, done + ' of ' + total + ' trophies earned');
  els['progress-text'].append(strong, document.createTextNode(' — ' + pct + '% to the platinum'));
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  state.trophies.forEach((t) => { counts[t.grade] += 1; });
  const hidden = state.trophies.filter((t) => t.hidden).length;
  els['stat-row'].innerHTML = '';
  [
    ['55 trophies', total + ' in the official list'],
    ['Platinum', counts.platinum + ' — Vice Got a Price!'],
    ['Gold', String(counts.gold)],
    ['Silver', String(counts.silver)],
    ['Bronze', String(counts.bronze)],
    ['Hidden', hidden + ' stay secret until earned'],
    ['Online', 'none — all single-player'],
  ].forEach(([label, value]) => {
    const pill = el('span', 'stat');
    pill.append(el('strong', null, label + ': '), document.createTextNode(value));
    els['stat-row'].append(pill);
  });
}

function renderKindFilters() {
  els['kind-filters'].innerHTML = '';
  Object.entries(KIND_LABELS).forEach(([kind, label]) => {
    let count;
    if (kind === 'all') count = state.trophies.length;
    else if (kind === 'missable') count = state.trophies.filter((t) => t.missable).length;
    else if (kind === 'online') count = 0;
    else count = state.trophies.filter((t) => t.kind === kind).length;
    const chip = el('button', 'chip' + (state.kind === kind ? ' active' : ''), label + ' ');
    chip.type = 'button';
    chip.append(el('span', 'count', '(' + count + ')'));
    chip.addEventListener('click', () => {
      state.kind = kind;
      renderKindFilters();
      renderList();
    });
    els['kind-filters'].append(chip);
  });
}

function renderGuideSources(trophy, container) {
  const line = el('p', 'guide-sources', 'Sources: ');
  trophy.sources.forEach((source, i) => {
    if (i > 0) line.append(document.createTextNode(' · '));
    const link = el('a', null, source.name);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    line.append(link);
  });
  container.append(line);
}

function renderTrophyCard(trophy) {
  const li = el('li', 'trophy' + (state.earned.has(trophy.id) ? ' earned' : ''));
  const head = el('div', 'trophy-head');
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'trophy-check';
  check.checked = state.earned.has(trophy.id);
  check.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
  check.addEventListener('change', () => {
    if (check.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    saveState();
    renderProgress();
    renderList();
    renderRoadmap();
  });
  const main = el('div', 'trophy-main');
  const name = el('h3', 'trophy-name');
  const dot = el('span', 'grade-dot', '●');
  dot.style.color = trophy.grade === 'platinum' ? 'var(--platinum)'
    : trophy.grade === 'gold' ? 'var(--gold)'
    : trophy.grade === 'silver' ? 'var(--silver)' : 'var(--bronze)';
  name.append(dot);
  if (isHiddenFromSpoilers(trophy)) {
    name.append(document.createTextNode('Hidden trophy'));
    main.append(name);
    main.append(el('p', 'trophy-desc hidden-mask', 'This trophy is hidden on PlayStation until you earn it. Turn spoilers off, or tick it earned, to reveal its name and description.'));
  } else {
    name.append(document.createTextNode(trophy.name));
    main.append(name);
    main.append(el('p', 'trophy-desc', trophy.description));
  }
  const meta = el('div', 'trophy-meta');
  meta.append(el('span', 'tag grade-' + trophy.grade, gradeLabel(trophy.grade)));
  if (trophy.hidden) meta.append(el('span', 'tag hidden-flag', 'Hidden'));
  if (trophy.missable) meta.append(el('span', 'tag missable', '⚠ Missable'));
  meta.append(el('span', 'tag kind', KIND_LABELS[trophy.kind] || trophy.kind));
  if (trophy.count) {
    meta.append(el('span', 'tag count', 'Target: ' + trophy.count.toLocaleString('en-US') + ' ' + trophy.countLabel));
  }
  main.append(meta);
  if (!isHiddenFromSpoilers(trophy)) {
    const toggle = el('button', 'guide-toggle', state.openGuides.has(trophy.id) ? 'Hide the guide ▲' : 'How to unlock it ▼');
    toggle.type = 'button';
    const guideBox = el('div', 'trophy-guide');
    guideBox.hidden = !state.openGuides.has(trophy.id);
    guideBox.append(el('p', null, trophy.guide));
    renderGuideSources(trophy, guideBox);
    toggle.addEventListener('click', () => {
      if (state.openGuides.has(trophy.id)) state.openGuides.delete(trophy.id);
      else state.openGuides.add(trophy.id);
      toggle.textContent = state.openGuides.has(trophy.id) ? 'Hide the guide ▲' : 'How to unlock it ▼';
      guideBox.hidden = !state.openGuides.has(trophy.id);
    });
    main.append(toggle, guideBox);
  }
  head.append(check, main);
  li.append(head);
  return li;
}

function renderList() {
  const visible = sortedTrophies(state.trophies.filter(trophyMatchesFilters));
  els['trophy-list'].innerHTML = '';
  visible.forEach((trophy) => els['trophy-list'].append(renderTrophyCard(trophy)));
  els['empty-state'].hidden = visible.length > 0;
  if (state.kind === 'online') {
    els['empty-state'].hidden = false;
    els['empty-state'].textContent = 'No online trophies: all 55 unlock in single-player. There is nothing to earn online, and no DLC trophy at launch.';
  } else {
    els['empty-state'].textContent = 'No trophies match these filters. Try clearing the search or choosing another kind.';
  }
  const earnedShown = visible.filter((t) => state.earned.has(t.id)).length;
  els['list-count'].textContent = 'Showing ' + visible.length + ' of ' + state.trophies.length + ' trophies (' + earnedShown + ' earned here)';
  els['spoiler-note'].textContent = state.spoiler
    ? 'Spoilers on: hidden trophies stay masked until you earn them. Turn the toggle off to reveal every name.'
    : 'Spoilers off: every hidden trophy name and description is shown.';
}

function renderRoadmap() {
  els.roadmap.innerHTML = '';
  ROADMAP_STAGES.forEach((stage) => {
    const items = state.trophies.filter((t) => t.roadmap === stage.stage);
    const li = el('li', 'stage');
    const heading = el('h3', null, 'Stage ' + stage.stage + ': ' + stage.title + ' ');
    heading.append(el('span', 'stage-when', '— ' + stage.when));
    li.append(heading);
    li.append(el('p', null, stage.text));
    const list = el('ul');
    items.forEach((trophy) => {
      const row = el('li');
      const mark = state.earned.has(trophy.id) ? '✓ ' : '○ ';
      row.append(document.createTextNode(mark));
      const strong = el('strong', null, isHiddenFromSpoilers(trophy) ? 'Hidden trophy' : trophy.name);
      row.append(strong);
      row.append(document.createTextNode(' — ' + gradeLabel(trophy.grade) + (trophy.missable ? ' — ⚠ missable' : '')));
      list.append(row);
    });
    li.append(list);
    const earnedHere = items.filter((t) => state.earned.has(t.id)).length;
    li.append(el('p', 'stage-trophies', earnedHere + ' of ' + items.length + ' earned in this stage'));
    els.roadmap.append(li);
  });
}

function renderMissables() {
  els['missable-list'].innerHTML = '';
  state.trophies.filter((t) => t.missable).forEach((trophy) => {
    const card = el('article', 'missable-card');
    card.append(el('span', 'risk', 'Possibly missable'));
    card.append(el('h3', null, trophy.name + ' — ' + gradeLabel(trophy.grade)));
    card.append(el('p', null, trophy.description));
    card.append(el('p', null, trophy.missableNote || ''));
    card.append(el('p', null, trophy.guide));
    renderGuideSources(trophy, card);
    els['missable-list'].append(card);
  });
  const yago = el('article', 'missable-card');
  yago.append(el('span', 'risk', 'Time-sensitive'));
  yago.append(el('h3', null, 'Race Against Yago — Chapter 3'));
  yago.append(el('p', null, 'This Chapter 3 race in Yago’s street racing strand is time-sensitive (hourglass icon). It feeds the Strangers & Freaks strand count, so do it the moment it appears and save first.'));
  const src = el('p', 'guide-sources', 'Source: ');
  const link = el('a', null, 'Output Lag — GTA 6 Trophy List');
  link.href = 'https://outputlag.com/guides/gta-6-trophy-list/';
  link.target = '_blank';
  link.rel = 'noopener';
  src.append(link);
  yago.append(src);
  els['missable-list'].append(yago);
}

function exportProgress() {
  const payload = {
    guide: 'Leonida Legend — GTA VI trophy tracker',
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort((a, b) => a - b),
    total: state.trophies.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophies-progress.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importProgressFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(state.trophies.map((t) => t.id));
      const imported = ids.filter((id) => valid.has(id));
      state.earned = new Set(imported);
      saveState();
      renderProgress();
      renderList();
      renderRoadmap();
      alert('Imported ' + imported.length + ' earned trophies.');
    } catch (err) {
      alert('That file is not a Leonida Legend export. Pick the JSON file this guide exported.');
    }
  };
  reader.readAsText(file);
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === 'view-' + view);
  });
}

function readHashRoute() {
  const hash = location.hash.replace(/^#/, '');
  if (hash.startsWith('trophy-')) {
    const id = Number(hash.slice('trophy-'.length));
    if (Number.isInteger(id)) {
      state.openGuides.add(id);
      state.spoiler = false;
      els['spoiler-toggle'].checked = false;
      saveState();
      switchView('checklist');
      renderList();
      renderRoadmap();
      requestAnimationFrame(() => {
        const card = els['trophy-list'].children[
          sortedTrophies(state.trophies.filter(trophyMatchesFilters)).findIndex((t) => t.id === id)
        ];
        if (card) card.scrollIntoView({ block: 'center' });
      });
      return;
    }
  }
  if (['checklist', 'roadmap', 'missables', 'sources'].includes(hash)) switchView(hash);
}

async function initGuide() {
  loadSavedState();
  els['spoiler-toggle'].checked = state.spoiler;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('Could not load ' + DATA_URL);
  const data = await response.json();
  state.trophies = data.trophies;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchView(tab.dataset.view);
      history.replaceState(null, '', '#' + tab.dataset.view);
    });
  });
  els.search.addEventListener('input', () => {
    state.query = els.search.value.trim().toLowerCase();
    renderList();
  });
  els['grade-filter'].addEventListener('change', () => {
    state.grade = els['grade-filter'].value;
    renderList();
  });
  els['sort-order'].addEventListener('change', () => {
    state.sort = els['sort-order'].value;
    renderList();
  });
  els['spoiler-toggle'].addEventListener('change', () => {
    state.spoiler = els['spoiler-toggle'].checked;
    saveState();
    renderList();
    renderRoadmap();
  });
  els['earned-only'].addEventListener('change', () => {
    state.earnedOnly = els['earned-only'].checked;
    renderList();
  });
  els['export-btn'].addEventListener('click', exportProgress);
  els['import-btn'].addEventListener('click', () => els['import-file'].click());
  els['import-file'].addEventListener('change', () => {
    const file = els['import-file'].files[0];
    if (file) importProgressFile(file);
    els['import-file'].value = '';
  });
  els['reset-btn'].addEventListener('click', () => {
    if (confirm('Clear every tick on your checklist? This cannot be undone.')) {
      state.earned.clear();
      saveState();
      renderProgress();
      renderList();
      renderRoadmap();
    }
  });
  window.addEventListener('hashchange', readHashRoute);

  renderProgress();
  renderKindFilters();
  renderList();
  renderRoadmap();
  renderMissables();
  readHashRoute();
}

initGuide().catch((err) => {
  els['progress-text'].textContent = 'Could not load the trophy list. Open this guide from its own folder (for example, serve app/ over HTTP) and try again.';
  console.error(err);
});
