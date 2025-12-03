import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Simple admin password check (Vercel Pro password protection handles main auth)
const ADMIN_KEY = process.env.ADMIN_KEY || 'ngg-admin-2024';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin key
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get all comments across all storyboards (for admin dashboard)
      const { status, client } = req.query;

      let comments;
      if (status && client) {
        comments = await sql`
          SELECT * FROM storyboard_comments_view
          WHERE status = ${status} AND client_slug = ${client}
        `;
      } else if (status) {
        comments = await sql`
          SELECT * FROM storyboard_comments_view
          WHERE status = ${status}
        `;
      } else if (client) {
        comments = await sql`
          SELECT * FROM storyboard_comments_view
          WHERE client_slug = ${client}
        `;
      } else {
        comments = await sql`
          SELECT * FROM storyboard_comments_view
          LIMIT 100
        `;
      }

      return res.status(200).json({ comments });

    } else if (req.method === 'PATCH') {
      // Update comment status or add team response
      const { id, status, team_response } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }

      let result;
      if (status && team_response) {
        result = await sql`
          UPDATE storyboard_comments
          SET status = ${status}, team_response = ${team_response},
              resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE resolved_at END
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (status) {
        result = await sql`
          UPDATE storyboard_comments
          SET status = ${status},
              resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE resolved_at END
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (team_response) {
        result = await sql`
          UPDATE storyboard_comments
          SET team_response = ${team_response}
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        return res.status(400).json({ error: 'status or team_response required' });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      return res.status(200).json({ success: true, comment: result[0] });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin comments API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
