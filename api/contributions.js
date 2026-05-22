export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { year } = req.query;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const token = (process.env.GITHUB_TOKEN || '').trim();

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN env variable not set' });
  }

  const from = `${targetYear}-01-01T00:00:00Z`;
  const to   = `${targetYear}-12-31T23:59:59Z`;

  const query = `
    query($from: DateTime!, $to: DateTime!) {
      user(login: "HamzaNasiem") {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  try {
    const ghRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'imHamza-portfolio'
      },
      body: JSON.stringify({ query, variables: { from, to } })
    });

    if (!ghRes.ok) {
      throw new Error(`GitHub API returned ${ghRes.status}`);
    }

    const data = await ghRes.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const calendar = data.data.user.contributionsCollection.contributionCalendar;
    const contribMap = {};

    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        contribMap[day.date] = day.contributionCount;
      });
    });

    return res.status(200).json({
      total: calendar.totalContributions,
      year: targetYear,
      contributions: contribMap  // { "2026-01-01": 3, "2026-01-02": 0, ... }
    });

  } catch (err) {
    console.error('contributions API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
