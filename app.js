// ─── State ────────────────────────────────────────────────────
let model = 'haiku';
let editingId = null;
let decisions = [];
let project = { name: '', desc: '' };
let activeTab = 'decisions';

// Tabs: each render (live or saved) is a tab.
// { id, kind: 'live'|'unsaved'|'saved', renderId, name, html, reasoning, view, compareChecked }
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let lastHistoryMeta = []; // cached meta from /api/renders for snapshot/note/grade lookups

// Prompt versions registry (Phase 2.5)
let prompts = [];                  // [{ id, createdAt, text, parentId, summary }]
let activePromptVersionId = null;
let promptStats = {};              // { [versionId]: { avg, n } }
let pendingProposal = null;        // { proposedPrompt, grades[], limitsNotes, renders[] }

function getActiveTab() { return tabs.find(t => t.id === activeTabId) || null; }
function findTabByRenderId(renderId) { return tabs.find(t => t.renderId === renderId) || null; }
function liveTab() { return tabs.find(t => t.kind === 'live') || null; }
function checkedTabs() { return tabs.filter(t => t.compareChecked); }
function comparePair() {
  const c = checkedTabs();
  return c.length === 2 ? c : null;
}
function isInSplit() {
  const pair = comparePair();
  if (!pair) return false;
  const t = getActiveTab();
  if (!t || !t.compareChecked) return false;
  const v = t.view || 'render';
  return v === 'render' || v === 'source' || v === 'reasoning';
}

const MODELS = {
  haiku:  { id: 'claude-haiku-4-5-20251001', inputPer1M: 0.80,  outputPer1M: 4.00 },
  sonnet: { id: 'claude-sonnet-4-6',         inputPer1M: 3.00,  outputPer1M: 15.00 }
};

// ─── Project serialization ────────────────────────────────────
function getActivePromptText() {
  const v = prompts.find(p => p.id === activePromptVersionId);
  return v ? v.text : '';
}

function projectToJSON() {
  return {
    name: document.getElementById('project-name').value,
    desc: document.getElementById('project-desc').value,
    prompt: document.getElementById('prompt-text').value,
    decisions
  };
}

function loadProjectData(data) {
  project = { name: data.name || '', desc: data.desc || '' };
  decisions = data.decisions || [];
  document.getElementById('project-name').value = project.name;
  document.getElementById('project-desc').value = project.desc;
  document.getElementById('prompt-text').value = data.prompt || getActivePromptText();
  autosave();
  renderDecisions();
  updateCostEstimate();
  updatePromptPreview();
}

// ─── Autosave to localStorage ─────────────────────────────────
function autosave() {
  project.name = document.getElementById('project-name').value;
  project.desc = document.getElementById('project-desc').value;
  localStorage.setItem('pdl_state', JSON.stringify(projectToJSON()));
}

// ─── Save to file ─────────────────────────────────────────────
function saveToFile() {
  const data = projectToJSON();
  const name = (data.name || 'project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Load from file ───────────────────────────────────────────
document.getElementById('load-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      loadProjectData(JSON.parse(ev.target.result));
    } catch(err) {
      showError('Could not parse file: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ─── Model switcher ───────────────────────────────────────────
function setModel(m) {
  model = m;
  document.getElementById('btn-haiku').className =
    'text-xs px-3 py-1 rounded-md font-medium transition ' +
    (m === 'haiku' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200');
  document.getElementById('btn-sonnet').className =
    'text-xs px-3 py-1 rounded-md font-medium transition ' +
    (m === 'sonnet' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200');
  updateCostEstimate();
}

function updateCostEstimate() {
  const activeCount = decisions.filter(d => d.active).length;
  if (activeCount === 0) { document.getElementById('cost-badge').classList.add('hidden'); return; }
  const inputTokens = Math.ceil(buildFullPrompt().length / 4);
  const outputTokens = 800;
  const m = MODELS[model];
  const cost = (inputTokens / 1e6 * m.inputPer1M) + (outputTokens / 1e6 * m.outputPer1M);
  document.getElementById('cost-val').textContent = cost.toFixed(4);
  document.getElementById('cost-badge').classList.remove('hidden');
}

// ─── Decisions ────────────────────────────────────────────────
function addDecision() {
  const text = document.getElementById('new-text').value.trim();
  if (!text) return;
  const cat = document.getElementById('new-category').value;
  decisions.push({ id: Date.now(), text, category: cat, active: true });
  document.getElementById('new-text').value = '';
  autosave();
  renderDecisions();
  updateCostEstimate();
  updatePromptPreview();
}

function toggleDecision(id) {
  if (editingId !== null) return;
  const d = decisions.find(d => d.id === id);
  if (d) { d.active = !d.active; autosave(); renderDecisions(); updateCostEstimate(); updatePromptPreview(); }
}

function deleteDecision(id) {
  decisions = decisions.filter(d => d.id !== id);
  autosave();
  renderDecisions();
  updateCostEstimate();
  updatePromptPreview();
}

function startEdit(id, el) {
  const d = decisions.find(d => d.id === id);
  if (!d) return;
  editingId = id;

  const ta = document.createElement('textarea');
  ta.value = d.text;
  ta.className = 'text-sm flex-1 border border-indigo-300 rounded px-1 py-0.5 outline-none w-full resize-none overflow-hidden leading-snug';

  // Match height to the rendered span before swapping
  const renderedHeight = el.offsetHeight;
  ta.style.height = renderedHeight + 'px';

  el.replaceWith(ta);
  ta.focus();
  ta.select();

  // Auto-grow as user types
  const autosize = () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };
  ta.addEventListener('input', autosize);

  const commit = () => {
    editingId = null;
    const val = ta.value.trim();
    if (val) d.text = val;
    autosave();
    renderDecisions();
    updatePromptPreview();
  };
  const cancel = () => {
    editingId = null;
    ta.removeEventListener('blur', commit);
    renderDecisions();
  };
  ta.addEventListener('blur', commit);
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); }
    if (e.key === 'Escape') { cancel(); }
  });
}

function changeCategory(id, newCat) {
  const d = decisions.find(d => d.id === id);
  if (d) { d.category = newCat; autosave(); renderDecisions(); updatePromptPreview(); }
}

function clearAll() {
  if (!decisions.length || !confirm('Clear all decisions?')) return;
  decisions = [];
  autosave();
  renderDecisions();
  updateCostEstimate();
  updatePromptPreview();
}

function renderDecisions() {
  const list = document.getElementById('decision-list');
  const active = decisions.filter(d => d.active).length;
  document.getElementById('stats').textContent =
    decisions.length ? `${active} of ${decisions.length} active` : 'No decisions yet';

  if (!decisions.length) {
    list.innerHTML = '<p class="text-xs text-gray-400 text-center mt-8">No decisions yet.<br>Add one above to get started.</p>';
    return;
  }

  const cats = ['entity','flow','ui','constraint'];
  const catOptions = ['flow','ui','constraint'];
  list.innerHTML = cats.map(cat => {
    const group = decisions.filter(d => d.category === cat);
    if (!group.length) return '';
    return `<div class="mb-3">
      <div class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 px-1">${cat}</div>
      ${group.map(d => {
        const opts = catOptions.includes(d.category) ? catOptions : [d.category, ...catOptions];
        return `
        <div class="decision-row group px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer space-y-1"
             onclick="toggleDecision(${d.id})">
          <select class="text-[10px] uppercase tracking-wide border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-500 cursor-pointer w-fit"
            onclick="event.stopPropagation()" onchange="changeCategory(${d.id}, this.value)">
            ${opts.map(c =>
              `<option value="${c}" ${c === d.category ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
          <div class="flex items-center gap-2">
            <input type="checkbox" ${d.active ? 'checked' : ''} onclick="event.stopPropagation();toggleDecision(${d.id})"
              class="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
            <span class="text-sm flex-1 ${d.active ? 'text-gray-800' : 'text-gray-400 line-through'} hover:text-indigo-600 cursor-text"
              onclick="event.stopPropagation();startEdit(${d.id}, this)">${escHtml(d.text)}</span>
            <button class="delete-btn text-gray-300 hover:text-red-400 transition flex-shrink-0"
              onclick="event.stopPropagation();deleteDecision(${d.id})" title="Delete">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Prompt building ──────────────────────────────────────────
function buildFullPrompt() {
  const userPrompt = document.getElementById('prompt-text').value.trim();
  const active = decisions.filter(d => d.active);
  const name = document.getElementById('project-name').value.trim();
  const desc = document.getElementById('project-desc').value.trim();

  let header = '';
  if (name) header += `## Project: ${name}\n`;
  if (desc) header += `${desc}\n`;
  if (header) header += '\n';

  if (!active.length) return header + userPrompt;

  const grouped = ['entity','flow','ui','constraint'].map(cat => {
    const items = active.filter(d => d.category === cat);
    if (!items.length) return '';
    return `[${cat.toUpperCase()}]\n${items.map(d => '- ' + d.text).join('\n')}`;
  }).filter(Boolean).join('\n\n');

  return `${header}${userPrompt}\n\n## Active Project Decisions\n\n${grouped}`;
}

function updatePromptPreview() {
  document.getElementById('prompt-preview').value = buildFullPrompt();
}

function resetPrompt(which) {
  if (which === 'gen') {
    document.getElementById('prompt-text').value = getActivePromptText();
    updatePromptPreview();
  }
  autosave();
}

// ─── Tabs ─────────────────────────────────────────────────────
function showTab(tab) {
  activeTab = tab;
  const tabs = ['decisions', 'prompt'];
  tabs.forEach(t => {
    const panel = document.getElementById('panel-' + t);
    panel.classList.toggle('hidden', t !== tab);
    panel.classList.toggle('flex', t === tab);
    document.getElementById('tab-' + t).className =
      (t === tab ? 'tab-active ' : 'text-gray-500 hover:text-gray-700 ') +
      'text-sm pb-2 px-1 border-b-2 transition';
  });
  if (tab === 'prompt') updatePromptPreview();
}

// ─── Preview views ────────────────────────────────────────────
function setView(v) {
  const t = getActiveTab();
  if (t && v !== 'history') t.view = v;
  // History is single-view even when a compare pair is locked
  if (v === 'history') {
    document.getElementById('preview-compare').classList.add('hidden');
    applyView('history');
    loadHistory();
    return;
  }
  if (isInSplit()) {
    showSplit();
  } else {
    document.getElementById('preview-compare').classList.add('hidden');
    applyView(v);
    // Re-render frame/source/reasoning for current tab on view change
    if (t) renderActiveTabContent();
  }
}

// Show the single-tab preview panel for view `v`. Hides the other panels.
// Skipped when in split — showSplit() controls visibility itself.
function applyView(v) {
  const views = ['render', 'source', 'reasoning', 'history'];
  views.forEach(name => {
    document.getElementById('preview-' + name).classList.toggle('hidden', name !== v);
    if (name === 'render') document.getElementById('preview-render').classList.toggle('flex', v === 'render');
  });
  styleViewButtons(v);
}

// Highlight the active view button in the top toolbar without changing panel visibility.
function styleViewButtons(v) {
  ['render', 'source', 'reasoning', 'history'].forEach(name => {
    const btn = document.getElementById('view-' + name);
    if (!btn) return;
    const isHistory = name === 'history';
    if (isHistory) {
      btn.className = 'text-xs px-3 py-1 rounded font-medium transition ' +
        (v === 'history' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-200');
    } else {
      btn.className = 'text-xs px-3 py-1 rounded font-medium transition ' +
        (v === name ? 'bg-white shadow-sm text-gray-700' : 'text-gray-500 hover:bg-gray-200');
    }
  });
}

// Render whichever tab is active. Routes between split (compare pair) and single.
function renderActiveTab() {
  const t = getActiveTab();
  const compareStatus = document.getElementById('compare-status');
  if (comparePair()) compareStatus.classList.remove('hidden');
  else compareStatus.classList.add('hidden');

  if (isInSplit()) {
    showSplit();
    updateSaveButton();
    return;
  }
  document.getElementById('preview-compare').classList.add('hidden');
  if (!t) {
    const frame = document.getElementById('preview-frame');
    frame.classList.add('hidden');
    frame.srcdoc = '';
    document.getElementById('preview-empty').classList.remove('hidden');
    document.getElementById('source-code').textContent = '';
    showReasoning('');
    applyView('render');
    updateSaveButton();
    return;
  }
  renderActiveTabContent();
  applyView(t.view || 'render');
  updateSaveButton();
}

// Populate the singleton preview/source/reasoning elements for the active tab.
function renderActiveTabContent() {
  const t = getActiveTab();
  if (!t) return;
  const frame = document.getElementById('preview-frame');
  const empty = document.getElementById('preview-empty');
  if (t.html) {
    empty.classList.add('hidden');
    renderPreview(t.html);
  } else {
    frame.classList.add('hidden');
    frame.srcdoc = '';
    empty.classList.remove('hidden');
  }
  document.getElementById('source-code').textContent = t.html || '';
  showReasoning(
    t.reasoning ? '[REASONING]\n\n' + t.reasoning : '',
    t.kind === 'saved' ? 'No reasoning saved for this render.' : 'No reasoning yet — generate a render to see one.'
  );
}

// Render the locked compare pair into #preview-compare, two columns sharing
// whichever view (render/source/reasoning) the active tab has selected.
function showSplit() {
  const pair = comparePair();
  if (!pair) return;
  const view = (getActiveTab().view) || 'render';
  // Hide single-view panels
  ['render','source','reasoning','history'].forEach(v => {
    const el = document.getElementById('preview-' + v);
    el.classList.add('hidden');
    if (v === 'render') el.classList.remove('flex');
  });
  styleViewButtons(view);
  const container = document.getElementById('preview-compare');
  container.classList.remove('hidden');
  container.innerHTML = '';
  pair.forEach(tab => {
    const isActive = tab.id === activeTabId;
    const col = document.createElement('div');
    col.className = 'compare-col';
    col.dataset.tabId = tab.id;
    const hasAssess = (tab.note && tab.note.trim()) || Number.isInteger(tab.grade);
    const gradeStr = Number.isInteger(tab.grade) ? ' · ' + tab.grade : '';
    col.innerHTML = `
      <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between gap-2 ${isActive ? 'bg-indigo-50' : 'bg-gray-50'}">
        <span class="text-xs font-mono flex-1 truncate ${isActive ? 'text-indigo-700 font-semibold' : 'text-gray-600'}">${escHtml(tab.name)}</span>
        <button type="button" data-assess-col class="assess-btn-col ${hasAssess ? 'has-note' : ''}">Assess${gradeStr}</button>
      </div>
      <div class="flex-1 relative overflow-hidden">
        <iframe data-cmp-frame class="absolute inset-0 w-full h-full bg-white ${view === 'render' ? '' : 'hidden'}" sandbox="allow-scripts allow-same-origin"></iframe>
        <pre data-cmp-source class="absolute inset-0 ${view === 'source' ? '' : 'hidden'} text-xs font-mono p-3 overflow-auto text-gray-700 whitespace-pre-wrap m-0 bg-white"></pre>
        <div data-cmp-reasoning class="absolute inset-0 ${view === 'reasoning' ? '' : 'hidden'} text-sm text-gray-700 whitespace-pre-wrap p-4 overflow-auto bg-white"></div>
      </div>`;
    container.appendChild(col);
    if (view === 'render' && tab.html) renderPreview(tab.html, col.querySelector('[data-cmp-frame]'));
    if (view === 'source') col.querySelector('[data-cmp-source]').textContent = tab.html || '';
    if (view === 'reasoning') col.querySelector('[data-cmp-reasoning]').textContent =
      tab.reasoning || '(no reasoning saved for this render)';
    // Click on a column header focuses that tab
    col.querySelector('div').addEventListener('click', (e) => {
      // Don't focus when clicking the Assess button itself (it has its own handler)
      if (e.target.closest('[data-assess-col]')) return;
      setActiveTabId(tab.id);
    });
    const assessBtn = col.querySelector('[data-assess-col]');
    if (assessBtn) {
      assessBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAssessPopover(tab.id, e);
      });
    }
  });
}

function copySource() {
  const t = getActiveTab();
  if (!t || !t.html) return;
  const btn = document.getElementById('source-copy-btn');
  navigator.clipboard.writeText(t.html).then(() => {
    if (!btn) return;
    btn.classList.add('text-green-600', 'border-green-300');
    setTimeout(() => btn.classList.remove('text-green-600', 'border-green-300'), 1200);
  });
}

function showReasoning(text, emptyMsg) {
  const empty = document.getElementById('reasoning-empty');
  const wrap = document.getElementById('reasoning-content-wrap');
  const content = document.getElementById('reasoning-content');
  const msg = document.getElementById('reasoning-empty-msg');
  const t = getActiveTab();
  // Wrap is shown whenever there is an active tab (so note/grade/snapshot are
  // editable even before reasoning text exists). Empty placeholder only shows
  // when there is no active tab at all.
  if (t) {
    empty.classList.add('hidden');
    wrap.classList.remove('hidden');
    if (text && text.trim()) {
      content.textContent = text;
      content.classList.remove('hidden');
    } else {
      content.textContent = '';
      content.classList.add('hidden');
    }
    syncReasoningPanelControls();
  } else {
    wrap.classList.add('hidden');
    content.textContent = '';
    empty.classList.remove('hidden');
    if (msg) msg.textContent = emptyMsg || 'No reasoning yet — generate a render to see one.';
  }
}

function syncReasoningPanelControls() {
  const t = getActiveTab();
  const snap = document.getElementById('reasoning-snapshot');
  if (!snap || !t) return;
  if (Array.isArray(t.pdlSnapshot) && t.pdlSnapshot.length) {
    const cats = ['flow','ui','constraint','entity'];
    const others = t.pdlSnapshot.filter(d => !cats.includes(d.category)).map(d => d.category);
    const order = cats.concat([...new Set(others)]);
    snap.innerHTML = '<div class="pdl-snapshot-block">' +
      order.map(cat => {
        const items = t.pdlSnapshot.filter(d => d.category === cat);
        if (!items.length) return '';
        return `<div class="pdl-snapshot-cat">${escHtml(cat)}</div>` +
          items.map(d => `<div class="pdl-snapshot-item">• ${escHtml(d.text)}</div>`).join('');
      }).join('') + '</div>';
  } else if (Array.isArray(t.pdlSnapshot)) {
    snap.innerHTML = '<div class="pdl-snapshot-block text-gray-400">No active decisions at generate time.</div>';
  } else {
    snap.innerHTML = '<div class="pdl-snapshot-block text-gray-400">Snapshot not captured (pre-Phase 2 render).</div>';
  }
}

// ─── Tab management ───────────────────────────────────────────
function addTab(t) {
  const tab = Object.assign({ id: nextTabId++, view: 'render', compareChecked: false }, t);
  tabs.push(tab);
  return tab;
}

function setActiveTabId(id) {
  if (assessPopoverState && assessPopoverState.tabId !== id) closeTabNote();
  activeTabId = id;
  renderTabStrip();
  renderActiveTab();
}

function closeTab(tabId, ev) {
  if (ev) { ev.stopPropagation(); }
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  if (tab.kind === 'live') {
    if (!confirm('This render is unsaved. Close anyway?')) return;
  }
  if (assessPopoverState && assessPopoverState.tabId === tabId) closeTabNote();
  const idx = tabs.indexOf(tab);
  tabs.splice(idx, 1);
  if (activeTabId === tabId) {
    const next = tabs[idx] || tabs[idx - 1] || null;
    activeTabId = next ? next.id : null;
  }
  // If the removed tab was part of the compare pair, the pair dissolves
  // automatically since checkedTabs() now has only 1 entry — split won't render.
  renderTabStrip();
  renderActiveTab();
}

function toggleCompareCheck(tabId, ev) {
  if (ev) { ev.stopPropagation(); }
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  // While a pair is locked, only the two paired checkboxes are toggleable.
  const pair = comparePair();
  if (pair && !tab.compareChecked) return;
  tab.compareChecked = !tab.compareChecked;
  renderTabStrip();
  renderActiveTab();
}

function renderTabStrip() {
  const strip = document.getElementById('tab-strip');
  if (!tabs.length) {
    strip.classList.add('hidden');
    strip.innerHTML = '';
    return;
  }
  strip.classList.remove('hidden');
  strip.classList.add('flex');
  const pair = comparePair();
  strip.innerHTML = tabs.map(t => {
    const isActive = t.id === activeTabId;
    const cls = ['render-tab'];
    if (isActive) cls.push('active');
    if (t.kind === 'live') cls.push('live');
    // While paired, disable other tabs' checkboxes.
    const disabled = !!(pair && !t.compareChecked);
    const checkbox = `<input type="checkbox" ${t.compareChecked ? 'checked' : ''}
      ${disabled ? 'disabled' : ''}
      onclick="toggleCompareCheck(${t.id}, event)"
      class="w-3 h-3 accent-indigo-600 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}"
      title="${disabled ? 'A compare pair is already locked' : 'Include in compare'}" />`;
    const x = `<span class="tab-x" onclick="closeTab(${t.id}, event)" title="Close">✕</span>`;
    const liveDot = t.kind === 'live' ? '<span class="text-indigo-500" title="Unsaved live render">●</span>' : '';
    const gradeSet = Number.isInteger(t.grade);
    const gradeBadge = `<span class="tab-grade ${gradeSet ? 'set' : 'empty'}"
      onclick="cycleTabGrade(${t.id}, event)"
      title="${gradeSet ? 'Grade ' + t.grade + ' (click to change)' : 'Grade — click to set 1-5'}">${gradeSet ? t.grade : '·'}</span>`;
    return `<div class="${cls.join(' ')}" onclick="setActiveTabId(${t.id})">
      ${checkbox}${liveDot}<span class="tab-name">${escHtml(t.name)}</span>${gradeBadge}${x}
    </div>`;
  }).join('');
}

// ─── Per-tab note + grade (shared Assess popover) ─────────────
let assessPopoverState = null; // { tabId, el, debounceId }
// Backwards alias kept so any stale callers don't NPE
function closeTabNote() { closeAssessPopover(); }

function patchTabMeta(t, fields) {
  if (!t || t.kind !== 'saved' || !t.renderId) return;
  const slug = projectSlug();
  fetch(`/api/renders/${slug}/${t.renderId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields)
  }).catch(() => {});
}

function setTabGrade(tabId, grade) {
  const t = tabs.find(x => x.id === tabId);
  if (!t) return;
  t.grade = Number.isInteger(grade) && grade >= 1 && grade <= 5 ? grade : null;
  patchTabMeta(t, { grade: t.grade });
  renderTabStrip();
  if (assessPopoverState && assessPopoverState.tabId === tabId) {
    refreshAssessPopoverGrade();
  }
  updateAssessButtonState();
  // Keep history-meta cache + Improve threshold in sync for saved renders.
  if (t.kind === 'saved' && t.renderId && Array.isArray(lastHistoryMeta)) {
    const row = lastHistoryMeta.find(r => r.id === t.renderId);
    if (row) {
      if (Number.isInteger(t.grade)) row.grade = t.grade;
      else delete row.grade;
    }
    if (typeof updateImproveButton === 'function') updateImproveButton();
  }
}

function cycleTabGrade(tabId, ev) {
  if (ev) ev.stopPropagation();
  const t = tabs.find(x => x.id === tabId);
  if (!t) return;
  const cur = Number.isInteger(t.grade) ? t.grade : 0;
  const next = cur >= 5 ? null : cur + 1;
  setTabGrade(tabId, next);
}

function setTabNote(tabId, note) {
  const t = tabs.find(x => x.id === tabId);
  if (!t) return;
  t.note = note;
  if (t.kind === 'saved' && t.renderId
      && assessPopoverState && assessPopoverState.tabId === tabId) {
    clearTimeout(assessPopoverState.debounceId);
    assessPopoverState.debounceId = setTimeout(() => {
      patchTabMeta(t, { note: t.note || '' });
    }, 400);
  }
  updateAssessButtonState();
}

// Open the Assess popover for a tab. tabId=null means active tab.
// Anchor is taken from the click event's currentTarget (the button itself).
function openAssessPopover(tabId, ev) {
  if (ev) ev.stopPropagation();
  const targetId = tabId == null ? activeTabId : tabId;
  const tab = tabs.find(x => x.id === targetId);
  if (!tab) return;
  // Toggle close if already open for same tab
  if (assessPopoverState && assessPopoverState.tabId === targetId) {
    closeAssessPopover();
    return;
  }
  closeAssessPopover();
  const anchor = ev && ev.currentTarget;
  const pop = document.createElement('div');
  pop.className = 'assess-popover';
  pop.innerHTML = `
    <div class="ap-row">
      <span class="ap-label">Grade</span>
      <div class="ap-grade flex gap-1"></div>
      <button type="button" class="ap-clear" title="Clear grade">clear</button>
    </div>
    <div>
      <span class="ap-label" style="display:block; margin-bottom:4px;">Note</span>
      <textarea class="ap-note" placeholder="Note about this render…"></textarea>
    </div>`;
  document.body.appendChild(pop);
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    const popW = 300;
    let left = rect.right - popW; // right-align under button
    if (left < 8) left = 8;
    pop.style.top = (rect.bottom + 6) + 'px';
    pop.style.left = left + 'px';
  }
  // Wire grade buttons
  const gradeWrap = pop.querySelector('.ap-grade');
  function renderGrades() {
    const cur = Number.isInteger(tab.grade) ? tab.grade : null;
    gradeWrap.innerHTML = [1,2,3,4,5].map(n =>
      `<button type="button" data-g="${n}" class="grade-pick ${cur === n ? 'active' : ''}">${n}</button>`
    ).join('');
    gradeWrap.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const n = Number(b.dataset.g);
        const next = (Number.isInteger(tab.grade) && tab.grade === n) ? null : n;
        setTabGrade(targetId, next);
      });
    });
  }
  renderGrades();
  pop.querySelector('.ap-clear').addEventListener('click', e => {
    e.stopPropagation();
    setTabGrade(targetId, null);
  });
  // Note textarea
  const ta = pop.querySelector('.ap-note');
  ta.value = tab.note || '';
  setTimeout(() => ta.focus(), 0);
  ta.addEventListener('input', () => setTabNote(targetId, ta.value));
  ta.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeAssessPopover(); }
  });
  assessPopoverState = { tabId: targetId, el: pop, debounceId: null, renderGrades };
  setTimeout(() => document.addEventListener('mousedown', assessOutsideClick), 0);
}

function refreshAssessPopoverGrade() {
  if (assessPopoverState && assessPopoverState.renderGrades) {
    assessPopoverState.renderGrades();
  }
}

function assessOutsideClick(e) {
  if (!assessPopoverState) return;
  if (assessPopoverState.el.contains(e.target)) return;
  // Allow re-clicking the same anchor button to toggle (handled by openAssessPopover)
  closeAssessPopover();
}

function closeAssessPopover() {
  if (!assessPopoverState) {
    document.removeEventListener('mousedown', assessOutsideClick);
    return;
  }
  const tab = tabs.find(x => x.id === assessPopoverState.tabId);
  if (tab && tab.kind === 'saved' && tab.renderId) {
    clearTimeout(assessPopoverState.debounceId);
    patchTabMeta(tab, { note: tab.note || '' });
  }
  assessPopoverState.el.remove();
  assessPopoverState = null;
  document.removeEventListener('mousedown', assessOutsideClick);
}

function updateAssessButtonState() {
  const btn = document.getElementById('assess-btn');
  if (btn) {
    const t = getActiveTab();
    if (!t || isInSplit()) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
      btn.textContent = 'Assess' + (Number.isInteger(t.grade) ? ' · ' + t.grade : '');
    }
  }
  // Update split column Assess buttons in place (avoid re-rendering split, which
  // would steal focus from any open popover anchored to the button).
  document.querySelectorAll('#preview-compare .compare-col').forEach(col => {
    const tabId = Number(col.dataset.tabId);
    const tab = tabs.find(x => x.id === tabId);
    const colBtn = col.querySelector('[data-assess-col]');
    if (!tab || !colBtn) return;
    const has = (tab.note && tab.note.trim()) || Number.isInteger(tab.grade);
    colBtn.classList.toggle('has-note', !!has);
    colBtn.textContent = 'Assess' + (Number.isInteger(tab.grade) ? ' · ' + tab.grade : '');
  });
}

// Snapshot collapse/expand
function toggleSnapshot() {
  const body = document.getElementById('reasoning-snapshot');
  const caret = document.getElementById('reasoning-snapshot-caret');
  if (!body) return;
  const open = !body.classList.contains('hidden');
  if (open) {
    body.classList.add('hidden');
    if (caret) caret.textContent = '+';
  } else {
    body.classList.remove('hidden');
    if (caret) caret.textContent = '−';
  }
}

function updateSaveButton() {
  const btn = document.getElementById('save-render-btn');
  const t = getActiveTab();
  // Hide while in split (split is read-only comparison; user must click a single tab to save it).
  if (!isInSplit() && t && (t.kind === 'live' || t.kind === 'unsaved')) {
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Render';
  } else {
    btn.classList.add('hidden');
  }
  updateAssessButtonState();
}

// ─── Generate ─────────────────────────────────────────────────
async function generate() {
  const activeDecisions = decisions.filter(d => d.active);
  if (!activeDecisions.length) { showError('No active decisions. Add and enable some first.'); return; }

  setLoading(true);
  hideError();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELS[model].id,
        max_tokens: 16384,
        messages: [{ role: 'user', content: document.getElementById('prompt-preview').value.trim() || buildFullPrompt() }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error ${res.status}`);

    let rawText = data.content?.[0]?.text || '';

    // Extract <reasoning> block if present
    let reasoning = '';
    let html = rawText;
    const reasoningMatch = rawText.match(/^<reasoning>([\s\S]*?)<\/reasoning>\s*/i);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
      html = rawText.slice(reasoningMatch[0].length).trim();
    }
    html = html.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim();

    const truncated = data.stop_reason === 'max_tokens';
    if (truncated) showError('Output was truncated — try Sonnet for larger mockups, or simplify the PDL.');

    // Demote any existing live tab to a regular closeable unsaved tab
    const prevLive = liveTab();
    if (prevLive) prevLive.kind = 'unsaved';

    // Snapshot of active decisions at generate time (write-once on save)
    const pdlSnapshot = decisions
      .filter(d => d.active)
      .map(d => ({ text: d.text, category: d.category }));

    // Create a new live tab and focus it
    const stamp = new Date();
    const defaultName = `New render ${stamp.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}`;
    const tab = addTab({
      kind: 'live',
      renderId: null,
      name: defaultName,
      html,
      reasoning,
      view: 'render',
      note: '',
      grade: null,
      pdlSnapshot,
      promptVersionId: activePromptVersionId
    });
    setActiveTabId(tab.id);

    const inTok  = data.usage?.input_tokens  || 0;
    const outTok = data.usage?.output_tokens || 0;
    const m = MODELS[model];
    const cost = (inTok / 1e6 * m.inputPer1M) + (outTok / 1e6 * m.outputPer1M);
    document.getElementById('cost-val').textContent = cost.toFixed(4);
    document.getElementById('cost-badge').classList.remove('hidden');

  } catch(err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

async function renderPreview(html, frameEl) {
  const frame = frameEl || document.getElementById('preview-frame');
  if (!frameEl) document.getElementById('preview-empty').classList.add('hidden');
  frame.classList.remove('hidden');

  // Prepend wireframe.css to the rendered HTML
  let css = '';
  try {
    const r = await fetch('/wireframe.css');
    if (r.ok) css = await r.text();
  } catch(e) { /* degrade gracefully if fetch fails */ }

  let fullHtml = html;
  if (css) {
    const styleTag = `<style>\n/* wireframe.css */\n${css}\n</style>`;
    if (fullHtml.includes('<head>')) {
      fullHtml = fullHtml.replace('<head>', '<head>\n' + styleTag);
    } else {
      fullHtml = styleTag + '\n' + fullHtml;
    }
  }

  frame.srcdoc = fullHtml;
}

function setLoading(on) {
  document.getElementById('generate-btn').disabled = on;
  document.getElementById('spinner').classList.toggle('hidden', !on);
  document.getElementById('generate-label').textContent = on ? 'Generating…' : 'Generate UI';
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

// ─── Renders ─────────────────────────────────────────────────
function projectSlug() {
  return (document.getElementById('project-name').value.trim() || 'unnamed')
    .replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

async function saveRender() {
  const t = getActiveTab();
  if (!t || (t.kind !== 'live' && t.kind !== 'unsaved')) return;
  const btn = document.getElementById('save-render-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const slug = projectSlug();
    const res = await fetch(`/api/renders/${slug}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        html: t.html,
        reasoning: t.reasoning,
        name: t.name,
        note: t.note || '',
        grade: Number.isInteger(t.grade) ? t.grade : null,
        pdlSnapshot: Array.isArray(t.pdlSnapshot) ? t.pdlSnapshot : [],
        promptVersionId: t.promptVersionId || null
      })
    });
    if (!res.ok) throw new Error('Save failed');
    const { id } = await res.json();
    // Persist the tab name as the render's display name
    await fetch(`/api/renders/${slug}/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: t.name })
    });
    // Promote tab to saved
    t.kind = 'saved';
    t.renderId = id;
    renderTabStrip();
    updateSaveButton();
    setView('history');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Save Render';
    showError(e.message);
  }
}

function defaultRenderLabel(r) {
  const d = new Date(r.savedAt);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) +
         ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}

async function loadHistory() {
  const slug = projectSlug();
  const emptyEl = document.getElementById('history-empty');
  const listEl  = document.getElementById('history-list');
  try {
    const res  = await fetch(`/api/renders/${slug}`);
    const meta = await res.json();
    lastHistoryMeta = meta;
    if (!meta.length) { emptyEl.classList.remove('hidden'); listEl.classList.add('hidden'); return; }
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = meta.map(r => {
      const label = r.name || defaultRenderLabel(r);
      const ratingClass = r.rating === 'good' ? 'text-green-600 font-semibold' :
                          r.rating === 'bad'  ? 'text-red-500 font-semibold' : 'text-gray-400';
      const safeLabel = escHtml(label).replace(/'/g, "\\'");
      const gradeSet = Number.isInteger(r.grade);
      const gradeBadge = `<span class="hist-grade ${gradeSet ? 'set' : 'empty'}" title="${gradeSet ? 'Grade ' + r.grade : 'No grade'}">${gradeSet ? r.grade : '·'}</span>`;
      const noteInd = r.note && r.note.trim()
        ? `<span class="hist-note" title="Has note">◆</span>`
        : `<span class="text-gray-200 text-xs" title="No note">◇</span>`;
      const pvLabel = r.promptVersionId ? promptVersionLabel(r.promptVersionId) : '';
      const pvBadge = pvLabel ? `<span class="hist-pv" title="Generated with ${escHtml(pvLabel)}">${escHtml(pvLabel)}</span>` : '';
      return `<div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition group" data-render-id="${r.id}">
        <button onclick="viewRender('${slug}','${r.id}', '${safeLabel}')"
          class="flex-1 text-left text-sm text-gray-700 font-mono history-label">${escHtml(label)}</button>
        <button onclick="renderRenameStart('${slug}','${r.id}', this)" title="Rename"
          class="text-xs px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 hover:text-indigo-500 transition text-gray-300 opacity-0 group-hover:opacity-100">✎</button>
        ${pvBadge}
        ${gradeBadge}
        ${noteInd}
        <span class="${ratingClass} text-xs w-12 text-center">
          ${r.rating === 'good' ? 'good' : r.rating === 'bad' ? 'bad' : '—'}
        </span>
        ${r.hasReasoning ? `<span title="Has reasoning"
          class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium">R</span>` : ''}
        <button onclick="rateRender('${slug}','${r.id}','good')" title="Good"
          class="text-xs px-2 py-1 rounded border border-gray-200 hover:border-green-400 hover:text-green-600 transition ${r.rating==='good'?'border-green-400 text-green-600':'text-gray-400'}">✓</button>
        <button onclick="rateRender('${slug}','${r.id}','bad')" title="Bad"
          class="text-xs px-2 py-1 rounded border border-gray-200 hover:border-red-400 hover:text-red-500 transition ${r.rating==='bad'?'border-red-400 text-red-500':'text-gray-400'}">✕</button>
        <button onclick="deleteRender('${slug}','${r.id}')" title="Delete"
          class="text-xs px-2 py-1 rounded border border-gray-200 hover:border-red-300 hover:text-red-400 transition text-gray-300 opacity-0 group-hover:opacity-100">del</button>
      </div>`;
    }).join('');
  } catch(e) { /* server not running */ }
  if (typeof updateImproveButton === 'function') updateImproveButton();
}

function renderRenameStart(slug, id, btn) {
  const row = btn.closest('[data-render-id]');
  const labelBtn = row.querySelector('.history-label');
  const current = labelBtn.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'flex-1 text-sm font-mono border border-indigo-300 rounded px-2 py-1';
  labelBtn.replaceWith(input);
  input.focus();
  input.select();
  const commit = async () => {
    input.removeEventListener('blur', commit);
    const val = input.value.trim() || current;
    try {
      await fetch(`/api/renders/${slug}/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: val })
      });
      // Update any open tab for this render
      const t = findTabByRenderId(id);
      if (t) { t.name = val; renderTabStrip(); }
    } catch(e) { /* ignore */ }
    loadHistory();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') {
      input.removeEventListener('blur', commit);
      loadHistory();
    }
  });
}

// Open a saved render in a tab (or focus an existing tab for it)
async function viewRender(slug, id, displayName) {
  const existing = findTabByRenderId(id);
  if (existing) {
    setActiveTabId(existing.id);
    setView(existing.view || 'render');
    return;
  }
  const res = await fetch(`/api/renders/${slug}/${id}`);
  const html = res.ok ? await res.text() : '';
  let reasoning = '';
  try {
    const r = await fetch(`/api/renders/${slug}/${id}/reasoning`);
    if (r.ok) reasoning = await r.text();
  } catch(e) { /* missing reasoning is fine */ }
  // Pull note/grade/pdlSnapshot from cached meta (or refetch if absent)
  let metaEntry = lastHistoryMeta.find(r => r.id === id);
  if (!metaEntry) {
    try {
      const mr = await fetch(`/api/renders/${slug}`);
      if (mr.ok) {
        lastHistoryMeta = await mr.json();
        metaEntry = lastHistoryMeta.find(r => r.id === id);
      }
    } catch(e) { /* ignore */ }
  }
  const tab = addTab({
    kind: 'saved',
    renderId: id,
    name: displayName || id,
    html,
    reasoning,
    view: 'render',
    note: metaEntry && typeof metaEntry.note === 'string' ? metaEntry.note : '',
    grade: metaEntry && Number.isInteger(metaEntry.grade) ? metaEntry.grade : null,
    pdlSnapshot: metaEntry && Array.isArray(metaEntry.pdlSnapshot) ? metaEntry.pdlSnapshot : null
  });
  setActiveTabId(tab.id);
}

async function rateRender(slug, id, rating) {
  await fetch(`/api/renders/${slug}/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rating })
  });
  loadHistory();
}

async function deleteRender(slug, id) {
  await fetch(`/api/renders/${slug}/${id}`, { method: 'DELETE' });
  const open = findTabByRenderId(id);
  if (open) {
    const idx = tabs.indexOf(open);
    tabs.splice(idx, 1);
    if (activeTabId === open.id) {
      const next = tabs[idx] || tabs[idx - 1] || null;
      activeTabId = next ? next.id : null;
    }
    renderTabStrip();
    renderActiveTab();
  }
  loadHistory();
}

// ─── Prompt versions ──────────────────────────────────────────
function promptVersionLabel(id) {
  const idx = prompts.findIndex(p => p.id === id);
  return idx === -1 ? '' : `v${idx + 1}`;
}

async function loadPromptRegistry() {
  try {
    const [regRes, statsRes] = await Promise.all([
      fetch('/api/prompts'),
      fetch('/api/prompts/stats')
    ]);
    const reg = await regRes.json();
    prompts = reg.versions || [];
    activePromptVersionId = reg.activeVersionId || null;
    promptStats = statsRes.ok ? await statsRes.json() : {};
    renderPromptVersionSelect();
    updateImproveButton();
    const ta = document.getElementById('prompt-text');
    if (!ta.value) ta.value = getActivePromptText();
    updatePromptPreview();
  } catch(e) { /* server not running */ }
}

function renderPromptVersionSelect() {
  const sel = document.getElementById('prompt-version-select');
  if (!sel) return;
  sel.innerHTML = prompts.map((v, i) => {
    const label = `v${i + 1}`;
    const stat = promptStats[v.id];
    const statTxt = stat ? ` — avg ${stat.avg.toFixed(1)} (${stat.n})` : '';
    const date = new Date(v.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric' });
    return `<option value="${v.id}" ${v.id === activePromptVersionId ? 'selected' : ''}>${label} · ${date}${statTxt}</option>`;
  }).join('');
}

async function onPromptVersionChange(id) {
  if (!id || id === activePromptVersionId) return;
  try {
    const res = await fetch('/api/prompts/active', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error('Failed to switch version');
    activePromptVersionId = id;
    document.getElementById('prompt-text').value = getActivePromptText();
    updatePromptPreview();
    autosave();
  } catch(e) { showError(e.message); }
}

function gradedRendersForCurrentProject() {
  return (lastHistoryMeta || []).filter(r => Number.isInteger(r.grade));
}

function updateImproveButton() {
  const btn = document.getElementById('improve-prompt-btn');
  const helper = document.getElementById('improve-helper');
  if (!btn || !helper) return;
  const n = gradedRendersForCurrentProject().length;
  const need = 3;
  if (n < need) {
    btn.disabled = true;
    helper.textContent = `Grade ${need - n} more saved render${need - n === 1 ? '' : 's'} to enable Improve.`;
  } else {
    btn.disabled = false;
    helper.innerHTML = '&nbsp;';
  }
}

// ─── Improvement consult ──────────────────────────────────────
function buildConsultMessages(activePromptText, renders) {
  const blocks = [];

  blocks.push({ type: 'text', text:
    '# Task: Improve a GENERIC wireframe-generation prompt\n\n' +
    'You are improving a **project-agnostic** "Generation Prompt" that is used as a system-style instruction ' +
    'for an HTML wireframe generator. This prompt is reused across MANY different projects. ' +
    'At generation time, a separate per-project "PDL" (a list of decisions like flows, ui choices, constraints) ' +
    'is appended to this prompt. The PDL is the project-specific part; the Generation Prompt itself must remain general.\n\n' +
    '## Hard rules for the proposed prompt\n' +
    '- It MUST be project-agnostic. Do NOT mention any specific project, feature, UI component, entity, or domain ' +
      '(no "CV upload", no "Chrome extension", no "Search tab", no specific tab names or sample roles).\n' +
    '- It MUST be a direct replacement for the current Generation Prompt in the same shape and role: ' +
      'general guidance about how to plan, structure, and emit wireframe HTML from an unknown future PDL.\n' +
    '- Improvements should be GENERAL RULES extracted from the evidence: e.g. "always make checkable/actionable affordances ' +
      'visible without expanding cards", "explicitly distinguish navigation tabs from content tabs", ' +
      '"when a flow has gating, define what the disabled state looks like", "validate that every PDL item is reachable in the output", etc.\n' +
    '- Do not fold a specific project\'s PDL into the prompt body. The PDL belongs in the per-project input, not in the prompt.\n\n' +
    '## How to use the evidence below\n' +
    'You will be shown the CURRENT Generation Prompt, then several rendered outputs from one project, each with its ' +
    'PDL snapshot, the model\'s reasoning, the user\'s grade (1–5), and the user\'s note. Use these as evidence to ' +
    'identify recurring failure or success patterns and translate them into GENERAL rules in the new prompt.\n\n' +
    'Evidence from multiple projects will accumulate over time; this run is one project but the rules you propose ' +
    'must hold for any future project.'
  });

  blocks.push({ type: 'text', text: '## Current Generation Prompt (the thing to improve)\n\n' + activePromptText });

  renders.forEach((r, i) => {
    const pdlText = (r.pdlSnapshot || []).map(d => `- [${d.category}] ${d.text}`).join('\n') || '(none)';
    blocks.push({ type: 'text', text:
      `## Evidence — Render ${i + 1}: "${r.name}"\n` +
      `User grade: ${r.grade}/5\n` +
      `User note: ${r.note || '(none)'}\n\n` +
      `Project PDL at generate time (project-specific — do NOT copy into the new prompt):\n${pdlText}\n\n` +
      `Reasoning the model produced:\n${r.reasoning || '(none)'}`
    });
  });

  blocks.push({ type: 'text', text:
    '## Output format\n\n' +
    'Return a single JSON object (no prose around it, no code fences) with exactly these keys:\n\n' +
    '- "proposedPrompt": string — the full text of the improved GENERIC Generation Prompt. Project-agnostic. ' +
      'Reread the hard rules above before writing this.\n' +
    '- "grades": array of { "renderId": string, "grade": int 1–5, "rationale": string }, one per render shown ' +
      `above (renderIds: ${renders.map(r => `"${r.id}"`).join(', ')}).\n` +
    '- "limitsNotes": string — patterns you noticed that prompt wording alone cannot fix. Focus on things that suggest ' +
      'pipeline-level changes (tool use, multi-call generation, validation passes, clarification questions to the user ' +
      'before generation, etc.). This is one of the most valuable outputs — be concrete.'
  });

  return [{ role: 'user', content: blocks }];
}

function parseConsultResponse(text) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(s); } catch {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  throw new Error('Could not parse consult response as JSON');
}

async function runImprovementConsult() {
  const slug = projectSlug();
  if (!slug) { showError('Save the project first.'); return; }
  await loadHistory();
  const graded = gradedRendersForCurrentProject();
  if (graded.length < 3) { showError('Need at least 3 graded renders.'); return; }

  const btn = document.getElementById('improve-prompt-btn');
  btn.disabled = true;
  btn.textContent = 'Consulting…';
  hideError();

  try {
    const renders = await Promise.all(graded.map(async (r) => {
      let reasoning = '';
      if (r.hasReasoning) {
        try {
          const rr = await fetch(`/api/renders/${slug}/${r.id}/reasoning`);
          if (rr.ok) reasoning = await rr.text();
        } catch {}
      }
      return {
        id: r.id,
        name: r.name || defaultRenderLabel(r),
        grade: r.grade,
        note: r.note || '',
        pdlSnapshot: r.pdlSnapshot || [],
        reasoning
      };
    }));

    const messages = buildConsultMessages(getActivePromptText(), renders);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELS.sonnet.id,
        max_tokens: 16384,
        messages
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
    const rawText = data.content?.[0]?.text || '';
    const parsed = parseConsultResponse(rawText);
    pendingProposal = { ...parsed, renders };
    openImprovementModal();
  } catch(e) {
    console.error('Consult failed:', e);
    showError('Improve failed: ' + e.message);
  } finally {
    btn.textContent = 'Improve';
    updateImproveButton();
  }
}

function lineDiff(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const m = A.length, n = B.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const out = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) { out.push({ type: 'same', text: A[i - 1] }); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { out.push({ type: 'removed', text: A[i - 1] }); i--; }
    else { out.push({ type: 'added', text: B[j - 1] }); j--; }
  }
  while (i > 0) { out.push({ type: 'removed', text: A[i - 1] }); i--; }
  while (j > 0) { out.push({ type: 'added', text: B[j - 1] }); j--; }
  return out.reverse();
}

function openImprovementModal() {
  if (!pendingProposal) return;
  const current = getActivePromptText();
  const { proposedPrompt, grades, limitsNotes, renders } = pendingProposal;

  const diffEl = document.getElementById('improve-diff');
  diffEl.innerHTML = lineDiff(current, proposedPrompt || '')
    .map(d => `<div class="diff-line diff-${d.type}">${d.type === 'added' ? '+ ' : d.type === 'removed' ? '- ' : '  '}${escHtml(d.text)}</div>`)
    .join('');

  const gradesEl = document.getElementById('improve-grades');
  const gradeMap = {};
  (grades || []).forEach(g => { gradeMap[g.renderId] = g; });
  gradesEl.innerHTML =
    `<div class="grade-row head"><div>Render</div><div class="grade-cell">User</div><div class="grade-cell">Claude</div><div>Rationale</div></div>` +
    renders.map(r => {
      const g = gradeMap[r.id] || {};
      return `<div class="grade-row"><div>${escHtml(r.name)}</div><div class="grade-cell">${r.grade ?? '—'}</div><div class="grade-cell">${g.grade ?? '—'}</div><div>${escHtml(g.rationale || '')}</div></div>`;
    }).join('');

  document.getElementById('improve-limits').textContent = limitsNotes || '(none)';
  document.getElementById('improve-proposal').value = proposedPrompt || '';
  document.getElementById('improvement-modal').classList.remove('hidden');
}

function closeImprovementModal() {
  document.getElementById('improvement-modal').classList.add('hidden');
  pendingProposal = null;
}

async function saveImprovedPrompt() {
  const text = document.getElementById('improve-proposal').value;
  if (!text.trim()) { showError('Proposal is empty.'); return; }
  const limitsNotes = (pendingProposal && pendingProposal.limitsNotes) || '';
  const summary = limitsNotes ? limitsNotes.split('\n')[0].slice(0, 120) : '';
  try {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, parentId: activePromptVersionId, summary, notes: limitsNotes })
    });
    if (!res.ok) throw new Error('Save failed');
    const newVersion = await res.json();
    prompts.push(newVersion);
    activePromptVersionId = newVersion.id;
    renderPromptVersionSelect();
    document.getElementById('prompt-text').value = newVersion.text;
    updatePromptPreview();
    closeImprovementModal();
  } catch(e) { showError(e.message); }
}

// ─── Init ─────────────────────────────────────────────────────
const saved = localStorage.getItem('pdl_state');
if (saved) {
  try { loadProjectData(JSON.parse(saved)); } catch(e) { /* fall through */ }
}
loadPromptRegistry();
updatePromptPreview();
renderTabStrip();
applyView('render');
updateSaveButton();
updateAssessButtonState();
// Pre-warm history so the Improve threshold check is accurate before user opens History
loadHistory();
