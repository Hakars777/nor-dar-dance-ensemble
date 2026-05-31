#!/usr/bin/env node
/**
 * Pre-generates TTS audio using OmniVoice (WaveSpeedAI cloud or local server).
 *
 * Usage:
 *   Cloud:  WAVESPEED_API_KEY=sk-... node scripts/generate-tts.js
 *   Local:  TTS_MODE=local node scripts/generate-tts.js
 *
 * Output: public/audio/<slug>.mp3  (committed to git, served as static assets)
 *
 * To regenerate a specific page, delete its .mp3 and re-run.
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'public', 'audio');

const MODE = process.env.TTS_MODE || 'wavespeed';
const WAVESPEED_KEY = process.env.WAVESPEED_API_KEY || '';
const LOCAL_URL = process.env.OMNIVOICE_URL || 'http://localhost:8880';

// ---------------------------------------------------------------------------
// Static page texts (Russian — matches site content)
// ---------------------------------------------------------------------------
const STATIC_PAGES = [
  {
    slug: 'home',
    text: `Nor-Dar Dance Ensemble. Армянский танцевальный ансамбль, соединяющий традицию, сценическую энергию и современную эстетику.

Танец как культурная память и живая сцена. Nor-Dar Dance Ensemble представляет армянскую танцевальную культуру в элегантной сценической форме: от традиционных номеров до ярких шоу-программ для концертов, фестивалей, свадеб и камерных событий.

Шесть форматов выступлений. Триста шестьдесят градусов — подход к событию. Живая энергия армянской сцены.`,
  },
  {
    slug: 'about',
    text: `О нас. Nor-Dar — армянский танцевальный ансамбль, созданный для сохранения и популяризации традиционной хореографии. Мы выступаем на концертах, фестивалях, свадьбах и корпоративных мероприятиях, неся культуру через движение, музыку и костюм.`,
  },
  {
    slug: 'programs',
    text: `Наши программы. Nor-Dar Dance Ensemble предлагает готовые и индивидуальные постановки для разных сцен, форматов и настроений события. Каждая программа создаётся с учётом традиций армянской хореографии и современных сценических требований.`,
  },
  {
    slug: 'gallery',
    text: `Галерея. Сцена, костюмы, движение. Визуальный образ Nor-Dar: тёплый свет сцены, армянская пластика и премиальная подача каждого номера.`,
  },
  {
    slug: 'videos',
    text: `Видео. Выступления ансамбля Nor-Dar: традиционные армянские танцы, праздничные шоу-программы и сценические постановки на концертах и фестивалях.`,
  },
  {
    slug: 'events',
    text: `Афиша. Концерты, фестивали и события, где можно увидеть Nor-Dar Dance Ensemble на сцене. Следите за ближайшими мероприятиями и не пропустите выступление.`,
  },
  {
    slug: 'news',
    text: `Новости ансамбля Nor-Dar. Последние новости: новые программы, выступления, события и анонсы.`,
  },
  {
    slug: 'contacts',
    text: `Контакты. Пригласите ансамбль Nor-Dar на событие. Расскажите о формате мероприятия, сцене и желаемой атмосфере. Мы предложим программу, которая будет выглядеть цельно, уважительно к традиции и эффектно для зрителей.`,
  },
];

// ---------------------------------------------------------------------------
// Dynamic pages: one MP3 per news article
// ---------------------------------------------------------------------------
async function buildNewsPages() {
  const dir = join(ROOT, 'src', 'content', 'news');
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const pages = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = await readFile(join(dir, file), 'utf-8');

    // Split on YAML frontmatter delimiters
    const parts = raw.split(/^---[ \t]*$/m);
    const frontmatter = parts[1] || '';
    const body = (parts[2] || '').trim();

    const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const excerptMatch = frontmatter.match(/^excerpt:\s*["']?(.+?)["']?\s*$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    const excerpt = excerptMatch ? excerptMatch[1].trim() : '';

    const cleanBody = body
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*{1,2}(.+?)\*{1,2}/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const text = [title, excerpt, cleanBody].filter(Boolean).join('\n\n');
    pages.push({ slug: `news-${slug}`, text });
  }

  return pages;
}

// ---------------------------------------------------------------------------
// TTS backends
// ---------------------------------------------------------------------------
async function generateWavespeed(text) {
  if (!WAVESPEED_KEY) {
    throw new Error('Set WAVESPEED_API_KEY env variable to use WaveSpeedAI');
  }

  const submitRes = await fetch(
    'https://api.wavespeed.ai/api/v3/wavespeed-ai/omnivoice/text-to-speech',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WAVESPEED_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!submitRes.ok) {
    throw new Error(`Submit ${submitRes.status}: ${await submitRes.text()}`);
  }

  const submitJson = await submitRes.json();
  const requestId =
    submitJson?.data?.id ?? submitJson?.request_id ?? submitJson?.id;
  if (!requestId) {
    throw new Error(`No request ID in response: ${JSON.stringify(submitJson)}`);
  }

  // Poll until completed (max ~2 minutes)
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    process.stdout.write('.');

    const pollRes = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      { headers: { Authorization: `Bearer ${WAVESPEED_KEY}` } }
    );
    if (!pollRes.ok) continue;

    const pollJson = await pollRes.json();
    const status = pollJson?.data?.status ?? pollJson?.status;

    if (status === 'completed' || status === 'succeeded') {
      const audioUrl =
        pollJson?.data?.outputs?.[0] ??
        pollJson?.data?.output?.url ??
        pollJson?.output;
      if (!audioUrl) {
        throw new Error(`No audio URL in result: ${JSON.stringify(pollJson)}`);
      }
      const audioRes = await fetch(audioUrl);
      return Buffer.from(await audioRes.arrayBuffer());
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Generation failed: ${JSON.stringify(pollJson)}`);
    }
  }

  throw new Error('Timed out waiting for TTS result (>2 min)');
}

async function generateLocal(text) {
  const res = await fetch(`${LOCAL_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omnivoice', input: text }),
  });
  if (!res.ok) {
    throw new Error(`Local TTS ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function generate(text) {
  return MODE === 'local' ? generateLocal(text) : generateWavespeed(text);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const newsPages = await buildNewsPages();
  const allPages = [...STATIC_PAGES, ...newsPages];

  console.log(`Backend : ${MODE === 'local' ? LOCAL_URL : 'WaveSpeedAI cloud'}`);
  console.log(`Pages   : ${allPages.length}\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const page of allPages) {
    const outPath = join(OUTPUT_DIR, `${page.slug}.mp3`);

    if (existsSync(outPath)) {
      console.log(`  ⏭  ${page.slug}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  🎙  ${page.slug}...`);
    try {
      const buf = await generate(page.text);
      await writeFile(outPath, buf);
      console.log(' ✓');
      ok++;
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✓ ${ok} generated  ⏭ ${skipped} skipped  ✗ ${failed} failed`);
  console.log('Audio files → public/audio/  (commit + push to deploy)');
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
