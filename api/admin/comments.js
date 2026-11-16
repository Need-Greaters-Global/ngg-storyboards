import { neon } from '@neondatabase/serverless';
import { checkAdminKey } from '../_lib/admin-auth.js';

const ALLOWED_STATUSES = ['pending', 'reviewed', 'resolved', 'archived'];
const MAX_TEAM_RESPONSE = 5000;

// The admin API is called only from the team's own tools (same origin or a
// server-side script), so it sends no CORS headers. Browsers on other sites
// cannot read its responses or send the X-Admin-Key header to it.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Fail closed: there is no built-in key. ADMIN_KEY must be set in the
  // environment (at least 32 characters), or every request is refused.
  const auth = checkAdminKey(req.headers['x-admin-key'], process.env.ADMIN_KEY);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (!process.env.DATABASE_URL) {
    console.error('Admin comments API: DATABASE_URL is not set');
    return res.status(503).json({ error: 'Database is not configured' });
  }
  const sql = neon(process.env.DATABASE_URL);

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
      const { id, status, team_response } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Comment ID is required' });
      }
      if (status && !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      }
      if (team_response && (typeof team_response !== 'string' || team_response.length > MAX_TEAM_RESPONSE)) {
        return res.status(400).json({ error: `team_response must be text of at most ${MAX_TEAM_RESPONSE} characters` });
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
