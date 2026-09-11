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

  if (/(hotel|resort|palace|stay|niwas|suite|retreat|residency|boutique|manor|kapish|astravista|yulia|rr62|sheerha|baghajabgarh|kadambbagh|travasaa|house|mahal|hotal)/i.test(text)) {
    return 'hotels';
  }
  if (/(bike|rental|taxi|cab|activa|ride|rides)/i.test(text)) {
    return 'rentals';
  }
  if (/(tour|tourism|travel|trip|kashmir|sikkim|manali|jaisalmer|rajasthanindiatrip|xploreindia|tourist|michell|havishe|universal)/i.test(text)) {
    return 'tours';
  }
  if (/(aroma|perfume|kalaagrah|noor|humaira|badasaab|wedding|pet|vaccine|healthcare|wellness)/i.test(text)) {
    return 'lifestyle';
  }
  return 'tech';
}

async function main() {
  const repos = await fetchAllRepos();

  if (repos.length < 25) {
    console.log(`Skipping update: Only found ${repos.length} repos (expected 25+). GH_PAT may be missing or scoped to public repos only. Preserving current stats.`);
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

  <p align="center">
    <img src="https://img.shields.io/badge/PRODUCTION_DEPLOYMENTS-${total}_LIVE_SITES-00C853?style=for-the-badge&logo=cloudflare&logoColor=white&labelColor=0D1117" />
  </p>

  <table align="center">
    <thead>
      <tr bgcolor="#161b22">
        <th align="left">&nbsp;&nbsp;<b>Industry Sector</b>&nbsp;&nbsp;</th>
        <th align="center">&nbsp;&nbsp;<b>Active Repositories</b>&nbsp;&nbsp;</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/hotel.svg?color=%23d99b2a" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Hotels, Resorts & Luxury Stays</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.hotels}_Live-D99B2A?style=for-the-badge&logo=hotel&logoColor=white" /></td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/compass.svg?color=%233b82f6" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Tours, Travel & Holiday Packages</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.tours}_Live-3B82F6?style=for-the-badge&logo=compass&logoColor=white" /></td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/server.svg?color=%238b5cf6" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Tech Systems, Agency & Backend APIs</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.tech}_Live-8B5CF6?style=for-the-badge&logo=server&logoColor=white" /></td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/shopping-bag.svg?color=%23ec4899" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Lifestyle, E-Commerce & Brands</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.lifestyle}_Live-EC4899?style=for-the-badge&logo=sparkles&logoColor=white" /></td>
      </tr>
      <tr>
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/bike.svg?color=%2310b981" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Bike & Taxi Fleet Rentals</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${counts.rentals}_Live-10B981?style=for-the-badge&logo=speedtest&logoColor=white" /></td>
      </tr>
      <tr bgcolor="#161b22">
        <td>&nbsp;&nbsp;<img src="https://api.iconify.design/lucide/globe-2.svg?color=%2300c853" width="18" height="18" valign="middle" />&nbsp;&nbsp;<b>Total Live Business Domains</b>&nbsp;&nbsp;</td>
        <td align="center"><img src="https://img.shields.io/badge/${total}_Total-00C853?style=for-the-badge&logo=checkmarx&logoColor=white" /></td>
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
  console.log('README.md successfully updated with SVG vector icons table');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});