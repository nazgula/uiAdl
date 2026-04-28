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
let compareMode = false;
let nextTabId = 1;

function getActiveTab() { return tabs.find(t => t.id === activeTabId) || null; }
function findTabByRenderId(renderId) { return tabs.find(t => t.renderId === renderId) || null; }
function liveTab() { return tabs.find(t => t.kind === 'live') || null; }

const MODELS = {
  haiku:  { id: 'claude-haiku-4-5-20251001', inputPer1M: 0.80,  outputPer1M: 4.00 },
  sonnet: { id: 'claude-sonnet-4-6',         inputPer1M: 3.00,  outputPer1M: 15.00 }
};

// ─── Project serialization ────────────────────────────────────
const DEFAULT_PROMPT = `Before writing HTML, plan the structure in a <reasoning> block:
- Container type and main layout (panel, full-page, modal-driven)
- Which tabs / pages / states exist and how navigation works between them
- What data entities need sample values and what they look like
- Interaction patterns: what triggers what, what shows/hides, what state is tracked

<reasoning>
[your structural plan here]
</reasoning>

Then immediately write the complete HTML.

---

Generate a complete, interactive HTML wireframe based on these project decisions.

Visual style — wireframe (Balsamiq-like):
- Font: "Comic Sans MS", cursive
- Colors: black, white, and grays only (#f4f4f4, #ddd, #aaa, #555, #111)
- No gradients, no shadows, no border-radius, no icons, no images
- Borders: solid 1-2px #aaa or #333
- Buttons: plain bordered rectangles with text labels
- Where an icon would appear, use a bracketed text label: [✕] [+] [≡] [▶]
- Placeholder images/previews: gray rectangle (#ddd) with a centered label in #888
- Inputs and selects: plain bordered boxes

Wireframe CSS classes available — use these, do not redefine them:
- Layout: .panel, .panel-header, .scroll-area
- Navigation: .tab-bar, .tab, .tab.active
- Content: .card, .card-header, .card-body
- Controls: .btn, .btn-primary, .btn-block, .input, .select, .form-group
- Special: .upload-area, .placeholder, .badge, .toast, .modal, .modal-overlay
- States: .hidden, .active, .disabled, .empty-state, .loading
- Data: .score-bar-wrap, .score-bar-fill, .check-item, .table

Functional requirements:
- Implement every ui element in the PDL as a visible component
- Implement every flow as an interactive sequence. Flows with action gates must branch (success path and error/invalid path)
- Every navigation target in the PDL must be reachable
- Every element with an extended or alternate mode must be togglable
- Use placeholder content for entities — fake names, sample data — sized to feel real
- Do not fetch external URLs. Fully self-contained HTML, vanilla JS only
- Do not redefine CSS classes listed above; use them as-is

Return: the <reasoning> block followed immediately by the HTML. No markdown, no code fences.`;

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
  document.getElementById('prompt-text').value = data.prompt || DEFAULT_PROMPT;
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
    document.getElementById('prompt-text').value = DEFAULT_PROMPT;
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
  if (compareMode) return; // view buttons inactive in compare mode
  const t = getActiveTab();
  if (t && v !== 'history') t.view = v;
  applyView(v);
  if (v === 'history') loadHistory();
}

// Render the active tab's content into the singleton preview elements,
// and reflect the tab's chosen view (preview/source/reasoning/history).
function applyView(v) {
  const views = ['render', 'source', 'reasoning', 'history'];
  views.forEach(name => {
    document.getElementById('preview-' + name).classList.toggle('hidden', name !== v);
    if (name === 'render') document.getElementById('preview-render').classList.toggle('flex', v === 'render');
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

// Render whichever tab is active into the singleton preview/source/reasoning elements.
function renderActiveTab() {
  const t = getActiveTab();
  const frame = document.getElementById('preview-frame');
  const empty = document.getElementById('preview-empty');
  if (!t) {
    frame.classList.add('hidden');
    frame.srcdoc = '';
    empty.classList.remove('hidden');
    document.getElementById('source-code').textContent = '';
    showReasoning('');
    updateSaveButton();
    return;
  }
  // Preview
  if (t.html) {
    empty.classList.add('hidden');
    renderPreview(t.html);
  } else {
    frame.classList.add('hidden');
    frame.srcdoc = '';
    empty.classList.remove('hidden');
  }
  // Source
  document.getElementById('source-code').textContent = t.html || '';
  // Reasoning
  showReasoning(
    t.reasoning ? '[REASONING]\n\n' + t.reasoning : '',
    t.kind === 'saved' ? 'No reasoning saved for this render.' : 'No reasoning yet — generate a render to see one.'
  );
  // View toggle reflects this tab's view
  applyView(t.view || 'render');
  updateSaveButton();
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
  const content = document.getElementById('reasoning-content');
  const msg = document.getElementById('reasoning-empty-msg');
  if (text && text.trim()) {
    empty.classList.add('hidden');
    content.textContent = text;
    content.classList.remove('hidden');
  } else {
    content.classList.add('hidden');
    content.textContent = '';
    empty.classList.remove('hidden');
    if (msg) msg.textContent = emptyMsg || 'No reasoning yet — generate a render to see one.';
  }
}

// ─── Tab management ───────────────────────────────────────────
function addTab(t) {
  const tab = Object.assign({ id: nextTabId++, view: 'render', compareChecked: false }, t);
  tabs.push(tab);
  return tab;
}

function setActiveTabId(id) {
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
  const idx = tabs.indexOf(tab);
  tabs.splice(idx, 1);
  if (activeTabId === tabId) {
    const next = tabs[idx] || tabs[idx - 1] || null;
    activeTabId = next ? next.id : null;
  }
  renderTabStrip();
  renderActiveTab();
  refreshCompareUI();
}

function toggleCompareCheck(tabId, ev) {
  if (ev) { ev.stopPropagation(); }
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  tab.compareChecked = !tab.compareChecked;
  renderTabStrip();
  refreshCompareUI();
}

function refreshCompareUI() {
  const checked = tabs.filter(t => t.compareChecked);
  const btn = document.getElementById('compare-btn');
  if (compareMode) {
    btn.classList.add('hidden');
  } else if (checked.length >= 2) {
    btn.classList.remove('hidden');
    btn.textContent = `Compare (${checked.length})`;
  } else {
    btn.classList.add('hidden');
  }
}

function renderTabStrip() {
  const strip = document.getElementById('tab-strip');
  if (!tabs.length) {
    strip.classList.add('hidden');
    strip.innerHTML = '';
    refreshCompareUI();
    return;
  }
  strip.classList.remove('hidden');
  strip.classList.add('flex');
  strip.innerHTML = tabs.map(t => {
    const isActive = t.id === activeTabId;
    const cls = ['render-tab'];
    if (isActive) cls.push('active');
    if (t.kind === 'live') cls.push('live');
    const checkbox = `<input type="checkbox" ${t.compareChecked ? 'checked' : ''}
      onclick="toggleCompareCheck(${t.id}, event)"
      class="w-3 h-3 accent-indigo-600 cursor-pointer" title="Include in compare" />`;
    const x = `<span class="tab-x" onclick="closeTab(${t.id}, event)" title="Close">✕</span>`;
    const liveDot = t.kind === 'live' ? '<span class="text-indigo-500" title="Unsaved live render">●</span>' : '';
    return `<div class="${cls.join(' ')}" onclick="setActiveTabId(${t.id})">
      ${checkbox}${liveDot}<span class="tab-name">${escHtml(t.name)}</span>${x}
    </div>`;
  }).join('');
  refreshCompareUI();
}

function updateSaveButton() {
  const btn = document.getElementById('save-render-btn');
  const t = getActiveTab();
  if (!compareMode && t && (t.kind === 'live' || t.kind === 'unsaved')) {
    btn.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Save Render';
  } else {
    btn.classList.add('hidden');
  }
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
        max_tokens: 8192,
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

    // Create a new live tab and focus it
    const stamp = new Date();
    const defaultName = `New render ${stamp.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}`;
    const tab = addTab({
      kind: 'live',
      renderId: null,
      name: defaultName,
      html,
      reasoning,
      view: 'render'
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
      body: JSON.stringify({ html: t.html, reasoning: t.reasoning, name: t.name })
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
    if (!meta.length) { emptyEl.classList.remove('hidden'); listEl.classList.add('hidden'); return; }
    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = meta.map(r => {
      const label = r.name || defaultRenderLabel(r);
      const ratingClass = r.rating === 'good' ? 'text-green-600 font-semibold' :
                          r.rating === 'bad'  ? 'text-red-500 font-semibold' : 'text-gray-400';
      const safeLabel = escHtml(label).replace(/'/g, "\\'");
      return `<div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition group" data-render-id="${r.id}">
        <button onclick="viewRender('${slug}','${r.id}', '${safeLabel}')"
          class="flex-1 text-left text-sm text-gray-700 font-mono history-label">${escHtml(label)}</button>
        <button onclick="renderRenameStart('${slug}','${r.id}', this)" title="Rename"
          class="text-xs px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 hover:text-indigo-500 transition text-gray-300 opacity-0 group-hover:opacity-100">✎</button>
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
  const tab = addTab({
    kind: 'saved',
    renderId: id,
    name: displayName || id,
    html,
    reasoning,
    view: 'render'
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

// ─── Compare mode ─────────────────────────────────────────────
function enterCompare() {
  const checked = tabs.filter(t => t.compareChecked);
  if (checked.length < 2) return;
  compareMode = true;

  // Hide single-tab views, show compare container
  ['render','source','reasoning','history'].forEach(v => {
    document.getElementById('preview-' + v).classList.add('hidden');
  });
  const container = document.getElementById('preview-compare');
  container.classList.remove('hidden');

  // Hide single-tab view buttons + Save while comparing
  document.querySelectorAll('#view-render,#view-source,#view-reasoning,#view-history')
    .forEach(b => b.classList.add('opacity-40', 'pointer-events-none'));
  document.getElementById('save-render-btn').classList.add('hidden');
  document.getElementById('compare-btn').classList.add('hidden');
  document.getElementById('exit-compare-btn').classList.remove('hidden');

  // Build columns
  container.innerHTML = '';
  checked.forEach(tab => {
    const col = document.createElement('div');
    col.className = 'compare-col';
    col.dataset.tabId = tab.id;
    col.innerHTML = `
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span class="text-xs font-mono text-gray-700 truncate">${escHtml(tab.name)}</span>
        <div class="flex gap-1 bg-white rounded p-0.5 border border-gray-200">
          <button data-cmp-view="render" class="text-[10px] px-2 py-0.5 rounded">P</button>
          <button data-cmp-view="source" class="text-[10px] px-2 py-0.5 rounded">S</button>
          <button data-cmp-view="reasoning" class="text-[10px] px-2 py-0.5 rounded">R</button>
        </div>
      </div>
      <div class="flex-1 relative overflow-hidden" data-cmp-body>
        <iframe data-cmp-frame class="w-full h-full bg-white hidden" sandbox="allow-scripts allow-same-origin"></iframe>
        <pre data-cmp-source class="hidden text-xs font-mono p-3 h-full overflow-auto text-gray-700 whitespace-pre-wrap"></pre>
        <div data-cmp-reasoning class="hidden text-sm text-gray-700 whitespace-pre-wrap p-4 overflow-auto h-full"></div>
      </div>`;
    container.appendChild(col);

    const setColView = (v) => {
      tab.view = v;
      col.querySelectorAll('[data-cmp-view]').forEach(b => {
        const active = b.dataset.cmpView === v;
        b.className = 'text-[10px] px-2 py-0.5 rounded ' +
          (active ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-100');
      });
      const frame = col.querySelector('[data-cmp-frame]');
      const src = col.querySelector('[data-cmp-source]');
      const reas = col.querySelector('[data-cmp-reasoning]');
      frame.classList.toggle('hidden', v !== 'render');
      src.classList.toggle('hidden', v !== 'source');
      reas.classList.toggle('hidden', v !== 'reasoning');
      if (v === 'render' && tab.html) renderPreview(tab.html, frame);
      if (v === 'source') src.textContent = tab.html || '';
      if (v === 'reasoning') {
        reas.textContent = tab.reasoning ? tab.reasoning : '(no reasoning saved for this render)';
      }
    };
    col.querySelectorAll('[data-cmp-view]').forEach(b => {
      b.addEventListener('click', () => setColView(b.dataset.cmpView));
    });
    setColView(tab.view || 'render');
  });
}

function exitCompare() {
  compareMode = false;
  document.getElementById('preview-compare').classList.add('hidden');
  document.getElementById('preview-compare').innerHTML = '';
  document.getElementById('exit-compare-btn').classList.add('hidden');
  document.querySelectorAll('#view-render,#view-source,#view-reasoning,#view-history')
    .forEach(b => b.classList.remove('opacity-40', 'pointer-events-none'));
  refreshCompareUI();
  renderActiveTab();
}

// ─── Init ─────────────────────────────────────────────────────
const saved = localStorage.getItem('pdl_state');
if (saved) {
  try { loadProjectData(JSON.parse(saved)); } catch(e) {
    document.getElementById('prompt-text').value = DEFAULT_PROMPT;
  }
} else {
  document.getElementById('prompt-text').value = DEFAULT_PROMPT;
}
updatePromptPreview();
renderTabStrip();
applyView('render');
updateSaveButton();
