require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PROJECTS_DIR = path.join(__dirname, 'projects');
const RENDERS_DIR  = path.join(__dirname, 'renders');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
if (!fs.existsSync(RENDERS_DIR))  fs.mkdirSync(RENDERS_DIR);

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
  const files = fs.readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ name: f.replace('.json', ''), file: f }));
  res.json(files);
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
  const { html, reasoning } = req.body;
  if (!html) return res.status(400).json({ error: 'No html provided' });
  const id = Date.now().toString();
  const dir = rendersDir(req.params.project);
  fs.writeFileSync(path.join(dir, id + '.html'), html);
  if (reasoning) {
    fs.writeFileSync(path.join(dir, id + '.reasoning.txt'), reasoning);
  }
  const meta = readMeta(req.params.project);
  meta.unshift({ id, savedAt: new Date().toISOString(), rating: null, hasReasoning: !!reasoning });
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

// ─── Renders: update rating ───────────────────────────────────
app.patch('/api/renders/:project/:id', (req, res) => {
  const meta = readMeta(req.params.project);
  const entry = meta.find(r => r.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.rating = req.body.rating ?? entry.rating;
  entry.note   = req.body.note   ?? entry.note;
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

app.listen(PORT, () => {
  console.log(`PDL running at http://localhost:${PORT}`);
});
