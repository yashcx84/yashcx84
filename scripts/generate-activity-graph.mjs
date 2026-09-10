import fs from 'fs';
import path from 'path';

const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;

async function fetchContributions() {
  const query = `
    query {
      user(login: "yashcx84") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'User-Agent': 'node-fetch',
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
  const allDays = weeks.flatMap(w => w.contributionDays);
  
  // Take the last 31 days
  const last31 = allDays.slice(-31);
  return last31;
}

function generateSvg(daysData) {
  const width = 850;
  const height = 340;
  const padding = { top: 55, right: 35, bottom: 55, left: 60 };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const counts = daysData.map(d => d.contributionCount);
  const maxCount = Math.max(...counts, 10);
  const yMax = Math.ceil(maxCount / 5) * 5;

  const stepX = graphWidth / (daysData.length - 1);

  const points = daysData.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + graphHeight - (d.contributionCount / yMax) * graphHeight;
    return { x, y, count: d.contributionCount, day: i + 1, date: d.date };
  });

  // Generate smooth cubic bezier curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  // Generate closed area path for gradient
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;

  // Generate Y axis ticks
  const ySteps = 5;
  let yAxisSvg = '';
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((yMax / ySteps) * i);
    const yPos = padding.top + graphHeight - (val / yMax) * graphHeight;
    yAxisSvg += `
      <text x="${padding.left - 12}" y="${yPos + 4}" text-anchor="end" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${val}</text>
      <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />
    `;
  }

  // Generate X axis ticks
  let xAxisSvg = '';
  points.forEach((p, i) => {
    xAxisSvg += `
      <text x="${p.x}" y="${padding.top + graphHeight + 20}" text-anchor="middle" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${p.day}</text>
    `;
  });

  // Dots on curve
  let dotsSvg = '';
  points.forEach(p => {
    dotsSvg += `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#ffffff" stroke="#38bdf8" stroke-width="2" />
    `;
  });

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect width="${width}" height="${height}" rx="14" fill="#080c14" stroke="#1e293b" stroke-width="1.2"/>

  <!-- Title -->
  <text x="${width / 2}" y="32" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="0.5">
    Yash Jangid's Contribution Graph
  </text>

  <!-- Y Axis Label -->
  <text x="-${(padding.top + graphHeight / 2)}" y="20" text-anchor="middle" transform="rotate(-90)" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="1">
    Contribution
  </text>

  <!-- X Axis Label -->
  <text x="${padding.left + graphWidth / 2}" y="${height - 12}" text-anchor="middle" fill="#64748b" font-size="11" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="1">
    Days
  </text>

  <!-- Grid & Ticks -->
  ${yAxisSvg}
  ${xAxisSvg}

  <!-- Area Fill -->
  <path d="${areaD}" fill="url(#areaGradient)" />

  <!-- Smooth Curve Line -->
  <path d="${pathD}" fill="none" stroke="url(#lineGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Data Point Dots -->
  ${dotsSvg}
</svg>
  `.trim();
}

async function main() {
  const days = await fetchContributions();
  console.log('Fetched days count:', days.length);

  const svg = generateSvg(days);
  const outDir = path.resolve('dist');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'activity-graph.svg'), svg, 'utf8');
  console.log('Successfully generated dist/activity-graph.svg');
}

main().catch(console.error);