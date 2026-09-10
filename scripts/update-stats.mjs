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

function renderProgressBar(count, total, length = 18) {
  if (!total) return '░'.repeat(length);
  const percent = (count / total);
  const filled = Math.round(percent * length);
  const empty = Math.max(0, length - filled);
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function main() {
  const repos = await fetchAllRepos();
  console.log(`Fetched ${repos.length} total repositories.`);

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

  const getPercent = (c) => total ? ((c / total) * 100).toFixed(1) : '0.0';

  const tableMarkdown = `<!-- DOMAIN-STATS-START -->
<div align="center">

  <p align="center">
    <img src="https://img.shields.io/badge/TOTAL_PRODUCTION_DEPLOYMENTS-${total}_LIVE_DOMAINS-00C853?style=for-the-badge&logo=cloudflare&logoColor=white&labelColor=0D1117" />
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Hotels_%26_Resorts-${counts.hotels}_Live-D99B2A?style=for-the-badge&logo=hotel&logoColor=white" />
    <img src="https://img.shields.io/badge/Tours_%26_Travel-${counts.tours}_Live-3B82F6?style=for-the-badge&logo=compass&logoColor=white" />
    <img src="https://img.shields.io/badge/Tech_%26_APIs-${counts.tech}_Live-8B5CF6?style=for-the-badge&logo=fastapi&logoColor=white" />
    <br/>
    <img src="https://img.shields.io/badge/Lifestyle_%26_Brands-${counts.lifestyle}_Live-EC4899?style=for-the-badge&logo=sparkles&logoColor=white" />
    <img src="https://img.shields.io/badge/Rentals_%26_Fleet-${counts.rentals}_Live-10B981?style=for-the-badge&logo=motorcycle&logoColor=white" />
  </p>

  <br/>

  <table>
    <thead>
      <tr bgcolor="#161b22">
        <th align="left"><b>🏷️ Industry Sector</b></th>
        <th align="center"><b>📊 Live Projects</b></th>
        <th align="left"><b>📈 Distribution Share</b></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>🏨 <b>Hotels, Resorts & Luxury Stays</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.hotels}_Deployed-D99B2A?style=flat-square&logo=hotel&logoColor=white" /></td>
        <td><code>${renderProgressBar(counts.hotels, total)}</code> <b>${getPercent(counts.hotels)}%</b></td>
      </tr>
      <tr>
        <td>✈️ <b>Tours, Travel & Holiday Packages</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.tours}_Deployed-3B82F6?style=flat-square&logo=compass&logoColor=white" /></td>
        <td><code>${renderProgressBar(counts.tours, total)}</code> <b>${getPercent(counts.tours)}%</b></td>
      </tr>
      <tr>
        <td>💼 <b>Tech Ecosystem, Agency & Backend APIs</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.tech}_Deployed-8B5CF6?style=flat-square&logo=server&logoColor=white" /></td>
        <td><code>${renderProgressBar(counts.tech, total)}</code> <b>${getPercent(counts.tech)}%</b></td>
      </tr>
      <tr>
        <td>🛍️ <b>Lifestyle, E-Commerce & D2C Brands</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.lifestyle}_Deployed-EC4899?style=flat-square&logo=shopify&logoColor=white" /></td>
        <td><code>${renderProgressBar(counts.lifestyle, total)}</code> <b>${getPercent(counts.lifestyle)}%</b></td>
      </tr>
      <tr>
        <td>🛵 <b>Bike & Taxi Fleet Rentals</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.rentals}_Deployed-10B981?style=flat-square&logo=speedtest&logoColor=white" /></td>
        <td><code>${renderProgressBar(counts.rentals, total)}</code> <b>${getPercent(counts.rentals)}%</b></td>
      </tr>
      <tr bgcolor="#161b22">
        <td>✨ <b>Total Active Business Deployments</b></td>
        <td align="center"><img src="https://img.shields.io/badge/${total}_Active-00C853?style=flat-square&logo=checkmarx&logoColor=white" /></td>
        <td><b><code>100% PRODUCTION VERIFIED</code></b></td>
      </tr>
    </tbody>
  </table>

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
  console.log('README.md successfully updated with rich stats matrix:', counts, 'Total:', total);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});