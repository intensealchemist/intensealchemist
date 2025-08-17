// scripts/generate-langs.js
// Node 18+ (fetch available). Aggregates language bytes across your repos and injects a markdown table into README.

const fs = require('fs/promises');

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'generate-langs-action'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function getAllRepos(token) {
  let page = 1;
  const per_page = 100;
  const all = [];
  while (true) {
    const url = `https://api.github.com/user/repos?visibility=all&per_page=${per_page}&page=${page}&affiliation=owner`;
    const part = await fetchJson(url, token);
    if (!part.length) break;
    all.push(...part);
    if (part.length < per_page) break;
    page++;
  }
  return all;
}

async function getRepoLanguages(owner, repo, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/languages`;
  return fetchJson(url, token);
}

function formatTable(languageTotals) {
  // languageTotals: [{lang, bytes, pct}]
  let md = `\n**Top languages (including private repos)**\n\n`;
  md += `| Language | Bytes | % |\n|---:|---:|---:|\n`;
  for (const row of languageTotals) {
    md += `| ${row.lang} | ${row.bytes.toLocaleString()} | ${row.pct.toFixed(1)}% |\n`;
  }
  md += `\n*Generated automatically via GitHub Actions.*\n`;
  return md;
}

async function main() {
  const token = process.env.PAT_1;
  if (!token) {
    console.error('Missing PAT_1 env var. Set the secret PAT_1 in the repository.');
    process.exit(1);
  }

  // determine owner from GITHUB_REPOSITORY if available
  let owner = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[0] : null;
  if (!owner) {
    // fallback: fetch authenticated user
    const user = await fetchJson('https://api.github.com/user', token);
    owner = user.login;
  }

  console.log('Fetching repos for owner:', owner);
  const repos = await getAllRepos(token);

  // Filter only repos owned by you (affiliation=owner should have done it, but filter again)
  const owned = repos.filter(r => r.owner && r.owner.login === owner);

  console.log(`Found ${owned.length} repos (including private if token allows). Aggregating languages...`);

  const totals = {};
  for (const r of owned) {
    // Skip forks if you want:
    // if (r.fork) continue;
    try {
      const langs = await getRepoLanguages(owner, r.name, token);
      for (const [lang, bytes] of Object.entries(langs)) {
        totals[lang] = (totals[lang] || 0) + bytes;
      }
    } catch (err) {
      console.warn(`Failed to fetch languages for ${r.full_name}: ${err.message}`);
    }
  }

  const totalBytes = Object.values(totals).reduce((a,b)=>a+b, 0);
  const rows = Object.entries(totals)
    .map(([lang, bytes]) => ({ lang, bytes, pct: totalBytes ? (bytes/totalBytes*100) : 0 }))
    .sort((a,b) => b.bytes - a.bytes)
    .slice(0, 10);

  const mdTable = formatTable(rows);

  // Read README.md and replace between markers
  const README = 'README.md';
  let content = '';
  try {
    content = await fs.readFile(README, 'utf8');
  } catch (err) {
    console.warn('README.md not found in repo root. Creating a new README.md with generated content.');
    content = `# Generated Top Languages\n\n<!-- START:generated-langs -->\n<!-- END:generated-langs -->\n`;
  }

  const start = '<!-- START:generated-langs -->';
  const end = '<!-- END:generated-langs -->';
  if (!content.includes(start) || !content.includes(end)) {
    // add markers at the end
    content = content + `\n\n${start}\n${end}\n`;
  }

  const before = content.split(start)[0] + start;
  const after = content.split(end).slice(1).join(end); // keep content after the last end
  const newContent = `${before}\n${mdTable}\n${end}${after}`;

  await fs.writeFile(README, newContent, 'utf8');
  console.log('README.md updated with generated language table.');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
