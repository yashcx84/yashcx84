import fs from 'fs';
import path from 'path';

const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;

async function fetchAllRepos() {
  let page = 1;
  let all = [];
  while (true) {
    // Try authenticated user repos endpoint first
    let url = `https://api.github.com/user/repos?per_page=100&type=all&page=${page}`;
    let res = await fetch(url, {
      headers: {
        'User-Agent': 'node-fetch',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    // If 403 or empty, fallback to public users endpoint
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

  // 1. Hotels & Resorts
  if (/(hotel|resort|palace|stay|niwas|suite|retreat|residency|boutique|manor|kapish|astravista|yulia|rr62|sheerha)/i.test(text)) {
    return 'hotels';
  }
  // 2. Bike & Taxi Rentals
  if (/(bike|rental|taxi|cab|activa|ride|rides)/i.test(text)) {
    return 'rentals';
  }
  // 3. Tours & Travel
  if (/(tour|tourism|travel|trip|kashmir|sikkim|manali|jaisalmer|rajasthanindiatrip|xploreindia|tourist)/i.test(text)) {
    return 'tours';
  }
  // 4. Lifestyle, Brands, E-commerce, Perfume, Pet, Wedding
  if (/(aroma|perfume|kalaagrah|noor|humaira|badasaab|wedding|pet|vaccine|healthcare|wellness)/i.test(text)) {
    return 'lifestyle';
  }
  // 5. Tech, Agency, Backend, APIs
  return 'tech';
}

async function main() {
  const repos = await fetchAllRepos();
  console.log(`Fetched ${repos.length} total repositories.`);

  // If token only has single repo scope (default GITHUB_TOKEN on a profile repo without PAT),
  // don't overwrite the table with zeros.
  if (repos.length <= 2) {
    console.log('Skipping update: Only default GITHUB_TOKEN available without cross-repo PAT scope. Keeping current stats intact.');
    return;
  }

  const counts = { hotels: 0, tours: 0, rentals: 0, lifestyle: 0, tech: 0 };

  for (const r of repos) {
    if (isBusinessDomain(r.homepage, r.name)) {
      counts[categorizeRepo(r)]++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tableMarkdown = `<!-- DOMAIN-STATS-START -->
<div align="center">

| Category / Section | Repository Count |
| :--- | :---: |
| 🏨 Hotels, Resorts & Stays | **${counts.hotels}** |
| ✈️ Tours & Travel | **${counts.tours}** |
| 🛵 Bike & Taxi Rentals | **${counts.rentals}** |
| 🛍️ Lifestyle, E-Commerce & Consumer Brands | **${counts.lifestyle}** |
| 💼 Tech, Real Estate, Agency & Backend APIs | **${counts.tech}** |
| **Total Repositories with Live Business Domains** | **${total}** |

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
  console.log('README.md successfully updated with latest counts:', counts, 'Total:', total);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});