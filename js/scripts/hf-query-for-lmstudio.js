import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

async function fetchModelMetadata(modelId) {
  const enc = encodeURIComponent(modelId);
  const url = `https://huggingface.co/api/models/${enc}`;
  try {
    const headers = {};
    if (process.env.HF_TOKEN) headers['Authorization'] = `Bearer ${process.env.HF_TOKEN}`;
    const res = await fetch(url, { redirect: 'follow', headers });
    if (!res.ok) {
      return { id: modelId, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { id: modelId, json };
  } catch (_err) {
    return { id: modelId, error: String(_err) };
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const lmFile = path.resolve(__dirname, '..', '.lmstudio-models-v1.json');
  try {
    await fs.access(lmFile);
  } catch (err) {
    console.error('LM Studio models file not found:', lmFile);
    process.exit(1);
  }

  const raw = await fs.readFile(lmFile, 'utf8');
  const data = JSON.parse(raw);
  const models = (data && data.data) || [];
  const outDir = path.resolve(__dirname, '..', 'hf-models');
  await fs.mkdir(outDir, { recursive: true });

  const agg = [];
  for (const m of models) {
    const id = m.id;
    console.log('Fetching:', id);
    const meta = await fetchModelMetadata(id);
  const fileName = id.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.hf.json';
    const outPath = path.join(outDir, fileName);
    await fs.writeFile(outPath, JSON.stringify(meta, null, 2), 'utf8');
    agg.push({ id, file: outPath, ok: !meta.error });
    // polite delay
    await new Promise(res => setTimeout(res, 300));
  }

  const aggPath = path.resolve(__dirname, '..', '.hf-models-aggregate.json');
  await fs.writeFile(aggPath, JSON.stringify(agg, null, 2), 'utf8');
  console.log('Saved aggregate to', aggPath);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('hf-query-for-lmstudio.js')) {
  main().catch(err => { console.error(err); process.exit(1); });
}
