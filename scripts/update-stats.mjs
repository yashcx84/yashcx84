import fs from 'fs';
import path from 'path';

const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;

async function fetchAllRepos() {
  let page = 1;
  let all = [];
  while (true) {
    let url = `https://api.github.com/user/repos?per_page=100&type=all&page=${page}`;
    let res = await fetch(url, {
      headers: {
        'User-Agent': 'node-fetch',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      url = `https://api.github.com/users/yashcx84/repos?per_page=100&page=${page}`;
      res = await fetch(url, {
        headers: {
          'User-Agent': 'node-fetch',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

function isBusinessDomain(url, name) {
  if (!url) {
    return /\.(com|in|net|org|co\.in)$/i.test(name);
  }
  const previewRegex = /(vercel\.app|netlify\.app|github\.io|onrender\.com|herokuapp\.com|localhost)/i;
  return !previewRegex.test(url);
}

function categorizeRepo(repo) {
  const topics = Array.isArray(repo.topics) ? repo.topics.join(' ') : '';
  const text = `${repo.name} ${repo.description || ''} ${repo.homepage || ''} ${topics}`.toLowerCase();

  if (/(hotel|resort|palace|stay|niwas|suite|retreat|residency|boutique|manor|kapish|astravista|yulia|rr62|sheerha)/i.test(text)) {
    return 'hotels';
  }
  if (/(bike|rental|taxi|cab|activa|ride|rides)/i.test(text)) {
    return 'rentals';
  }
  if (/(tour|tourism|travel|trip|kashmir|sikkim|manali|jaisalmer|rajasthanindiatrip|xploreindia|tourist)/i.test(text)) {
    return 'tours';
  }
  if (/(aroma|perfume|kalaagrah|noor|humaira|badasaab|wedding|pet|vaccine|healthcare|wellness)/i.test(text)) {
    return 'lifestyle';
  }
  return 'tech';
}

async function main() {
  const repos = await fetchAllRepos();

  if (repos.length <= 2) {
    console.log('Skipping update: Only default token without multi-repo scope. Keeping current stats intact.');
    return;
  }

  const counts = { hotels: 0, tours: 0, tech: 0, lifestyle: 0, rentals: 0 };

  for (const r of repos) {
    if (isBusinessDomain(r.homepage, r.name)) {
      counts[categorizeRepo(r)]++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tableMarkdown = `<!-- DOMAIN-STATS-START -->
<div align="center">

| Sector | Live Projects |
| :-- | :-: |
| 🏨 &nbsp; **Hotels & Luxury Stays** | \`${counts.hotels}\` |
| ✈️ &nbsp; **Tours & Travel Experiences** | \`${counts.tours}\` |
| 💼 &nbsp; **Tech Systems & Backend APIs** | \`${counts.tech}\` |
| 🛍️ &nbsp; **E-Commerce & Consumer Brands** | \`${counts.lifestyle}\` |
| 🛵 &nbsp; **Fleet & Mobility Rentals** | \`${counts.rentals}\` |
| **Total Production Domains** | **\`${total} Live Sites\`** |

</div>
<!-- DOMAIN-STATS-END -->`;

  const readmePath = path.resolve('README.md');
  const content = fs.readFileSync(readmePath, 'utf8');

  const regex = /<!-- DOMAIN-STATS-START -->[\s\S]*?<!-- DOMAIN-STATS-END -->/;
  if (!regex.test(content)) {
    console.error('Placeholder tags not found in README.md');
    process.exit(1);
  }

  const updatedContent = content.replace(regex, tableMarkdown);
  fs.writeFileSync(readmePath, updatedContent, 'utf8');
  console.log('README.md successfully updated with clean minimal stats table');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});