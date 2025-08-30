const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function fetchModelMetadata(modelId) {
  const enc = encodeURIComponent(modelId);
  const url = `https://huggingface.co/api/models/${enc}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      return { id: modelId, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { id: modelId, json };
  } catch (err) {
    return { id: modelId, error: String(err) };
  }
}

async function main() {
  const lmFile = path.resolve(__dirname, '..', '.lmstudio-models-v1.json');
  if (!fs.existsSync(lmFile)) {
    console.error('LM Studio models file not found:', lmFile);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(lmFile, 'utf8'));
  const models = (data && data.data) || [];
  const outDir = path.resolve(__dirname, '..', 'hf-models');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const agg = [];
  for (const m of models) {
    const id = m.id;
    console.log('Fetching:', id);
    const meta = await fetchModelMetadata(id);
    const fileName = id.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.json';
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, JSON.stringify(meta, null, 2), 'utf8');
    agg.push({ id, file: outPath, ok: !meta.error });
    // polite delay
    await new Promise(res => setTimeout(res, 300));
  }

  const aggPath = path.resolve(__dirname, '..', '.hf-models-aggregate.json');
  fs.writeFileSync(aggPath, JSON.stringify(agg, null, 2), 'utf8');
  console.log('Saved aggregate to', aggPath);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
