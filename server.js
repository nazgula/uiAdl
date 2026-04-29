require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PROJECTS_DIR = path.join(__dirname, 'projects');
const RENDERS_DIR  = path.join(__dirname, 'renders');
const PROMPTS_FILE = path.join(__dirname, 'prompts.json');
const DEFAULT_PROMPT_FILE = path.join(__dirname, 'default-prompt.txt');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
if (!fs.existsSync(RENDERS_DIR))  fs.mkdirSync(RENDERS_DIR);

function readPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    const seedText = fs.readFileSync(DEFAULT_PROMPT_FILE, 'utf8');
    const seedId = Date.now().toString();
    const registry = {
      versions: [{ id: seedId, createdAt: new Date().toISOString(), text: seedText, parentId: null, summary: 'Seeded from default-prompt.txt' }],
      activeVersionId: seedId
    };
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(registry, null, 2));
    return registry;
  }
  return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
}
function writePrompts(registry) {
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(registry, null, 2));
}

function rendersDir(project) {
  const dir = path.join(RENDERS_DIR, project.replace(/[^a-z0-9_-]/gi, '_'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return dir;
}
function metaPath(project) { return path.join(rendersDir(project), 'meta.json'); }
function readMeta(project) {
  const p = metaPath(project);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}
function writeMeta(project, meta) {
  fs.writeFileSync(metaPath(project), JSON.stringify(meta, null, 2));
}

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname, { index: 'index.html' }));

// ─── Proxy: Anthropic generate ────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in .env' });

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── Projects: list ───────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  if (!fs.existsSync(PROJECTS_DIR)) return res.json([]);
  const out = fs.readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const slug = f.replace(/\.json$/, '');
      let name = slug;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8'));
        if (data && typeof data.name === 'string' && data.name.trim()) name = data.name;
      } catch {}
      return { slug, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(out);
});

// ─── Projects: load ───────────────────────────────────────────
app.get('/api/projects/:name', (req, res) => {
  const file = path.join(PROJECTS_DIR, req.params.name + '.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

// ─── Projects: save ───────────────────────────────────────────
app.post('/api/projects/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-z0-9_-]/gi, '_');
  fs.writeFileSync(path.join(PROJECTS_DIR, name + '.json'), JSON.stringify(req.body, null, 2));
  res.json({ ok: true, name });
});

// ─── Projects: delete ─────────────────────────────────────────
app.delete('/api/projects/:name', (req, res) => {
  const file = path.join(PROJECTS_DIR, req.params.name + '.json');
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// ─── Renders: save ────────────────────────────────────────────
app.post('/api/renders/:project', (req, res) => {
  const { html, reasoning, note, grade, pdlSnapshot, promptVersionId } = req.body;
  if (!html) return res.status(400).json({ error: 'No html provided' });
  const id = Date.now().toString();
  const dir = rendersDir(req.params.project);
  fs.writeFileSync(path.join(dir, id + '.html'), html);
  if (reasoning) {
    fs.writeFileSync(path.join(dir, id + '.reasoning.txt'), reasoning);
  }
  const entry = { id, savedAt: new Date().toISOString(), rating: null, hasReasoning: !!reasoning };
  if (typeof note === 'string' && note.trim()) entry.note = note;
  if (Number.isInteger(grade) && grade >= 1 && grade <= 5) entry.grade = grade;
  if (Array.isArray(pdlSnapshot)) {
    entry.pdlSnapshot = pdlSnapshot
      .filter(d => d && typeof d.text === 'string' && typeof d.category === 'string')
      .map(d => ({ text: d.text, category: d.category }));
  }
  if (typeof promptVersionId === 'string' && promptVersionId) entry.promptVersionId = promptVersionId;
  const meta = readMeta(req.params.project);
  meta.unshift(entry);
  writeMeta(req.params.project, meta);
  res.json({ ok: true, id });
});

// ─── Renders: list ────────────────────────────────────────────
app.get('/api/renders/:project', (req, res) => {
  res.json(readMeta(req.params.project));
});

// ─── Renders: get HTML ────────────────────────────────────────
app.get('/api/renders/:project/:id', (req, res) => {
  const file = path.join(rendersDir(req.params.project), req.params.id + '.html');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.type('html').send(fs.readFileSync(file, 'utf8'));
});

// ─── Renders: get reasoning ───────────────────────────────────
app.get('/api/renders/:project/:id/reasoning', (req, res) => {
  const file = path.join(rendersDir(req.params.project), req.params.id + '.reasoning.txt');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.type('text').send(fs.readFileSync(file, 'utf8'));
});

// ─── Renders: update rating / note / name ─────────────────────
app.patch('/api/renders/:project/:id', (req, res) => {
  const meta = readMeta(req.params.project);
  const entry = meta.find(r => r.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.rating = req.body.rating ?? entry.rating;
  if (typeof req.body.note === 'string') {
    if (req.body.note === '') delete entry.note;
    else entry.note = req.body.note;
  }
  if ('grade' in req.body) {
    const g = req.body.grade;
    if (g === null) delete entry.grade;
    else if (Number.isInteger(g) && g >= 1 && g <= 5) entry.grade = g;
  }
  if (typeof req.body.name === 'string') {
    const trimmed = req.body.name.trim();
    if (trimmed) entry.name = trimmed;
    else delete entry.name;
  }
  writeMeta(req.params.project, meta);
  res.json({ ok: true });
});

// ─── Renders: delete ──────────────────────────────────────────
app.delete('/api/renders/:project/:id', (req, res) => {
  const dir = rendersDir(req.params.project);
  const htmlFile = path.join(dir, req.params.id + '.html');
  const reasoningFile = path.join(dir, req.params.id + '.reasoning.txt');
  if (fs.existsSync(htmlFile)) fs.unlinkSync(htmlFile);
  if (fs.existsSync(reasoningFile)) fs.unlinkSync(reasoningFile);
  const meta = readMeta(req.params.project).filter(r => r.id !== req.params.id);
  writeMeta(req.params.project, meta);
  res.json({ ok: true });
});

// ─── Prompts: registry ────────────────────────────────────────
app.get('/api/prompts', (req, res) => {
  res.json(readPrompts());
});

app.get('/api/prompts/stats', (req, res) => {
  const stats = {};
  for (const file of fs.readdirSync(RENDERS_DIR)) {
    const meta = path.join(RENDERS_DIR, file, 'meta.json');
    if (!fs.existsSync(meta)) continue;
    let rows;
    try { rows = JSON.parse(fs.readFileSync(meta, 'utf8')); } catch { continue; }
    for (const r of rows) {
      if (!r.promptVersionId || !Number.isInteger(r.grade)) continue;
      if (!stats[r.promptVersionId]) stats[r.promptVersionId] = { sum: 0, n: 0 };
      stats[r.promptVersionId].sum += r.grade;
      stats[r.promptVersionId].n += 1;
    }
  }
  const out = {};
  for (const [id, s] of Object.entries(stats)) out[id] = { avg: s.sum / s.n, n: s.n };
  res.json(out);
});

app.get('/api/prompts/:id', (req, res) => {
  const v = readPrompts().versions.find(v => v.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});

app.post('/api/prompts', (req, res) => {
  const { text, parentId, summary, notes } = req.body;
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'text required' });
  const registry = readPrompts();
  const version = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    text,
    parentId: parentId || null,
    summary: typeof summary === 'string' ? summary : '',
    notes: typeof notes === 'string' ? notes : ''
  };
  registry.versions.push(version);
  registry.activeVersionId = version.id;
  writePrompts(registry);
  res.json(version);
});

app.put('/api/prompts/active', (req, res) => {
  const { id } = req.body;
  const registry = readPrompts();
  if (!registry.versions.some(v => v.id === id)) return res.status(404).json({ error: 'Version not found' });
  registry.activeVersionId = id;
  writePrompts(registry);
  res.json({ ok: true, activeVersionId: id });
});

app.listen(PORT, () => {
  console.log(`PDL running at http://localhost:${PORT}`);
});
