import { neon } from '@neondatabase/serverless';

// Length limits match the column sizes in schema/comments.sql.
const MAX_SLUG = 100;
const MAX_NAME = 255;
const MAX_EMAIL = 255;
const MAX_COMMENT = 5000;

function textOk(value, max, required) {
  if (value === undefined || value === null || value === '') return !required;
  return typeof value === 'string' && value.length <= max;
}

// Comments are read and written only by the storyboard pages on this site
// (same origin), so no CORS headers are sent.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!process.env.DATABASE_URL) {
    console.error('Comments API: DATABASE_URL is not set');
    return res.status(503).json({ error: 'Database is not configured' });
  }
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      // Get comments for a storyboard
      const { client, project, scene } = req.query;

      if (!client || !project) {
        return res.status(400).json({ error: 'client and project are required' });
      }

      let comments;
      if (scene) {
        // Get comments for a specific scene
        comments = await sql`
          SELECT id, scene_number, author_name, comment_text, status, team_response, created_at
          FROM storyboard_comments
          WHERE client_slug = ${client}
            AND project_slug = ${project}
            AND scene_number = ${parseInt(scene)}
          ORDER BY created_at DESC
        `;
      } else {
        // Get all comments for the storyboard
        comments = await sql`
          SELECT id, scene_number, author_name, comment_text, status, team_response, created_at
          FROM storyboard_comments
          WHERE client_slug = ${client}
            AND project_slug = ${project}
          ORDER BY scene_number NULLS FIRST, created_at DESC
        `;
      }

      return res.status(200).json({ comments });

    } else if (req.method === 'POST') {
      // Add a new comment
      const { client, project, scene, author_name, author_email, comment_text } = req.body || {};

      if (!client || !project || !author_name || !comment_text) {
        return res.status(400).json({
          error: 'client, project, author_name, and comment_text are required'
        });
      }
      if (
        !textOk(client, MAX_SLUG, true) ||
        !textOk(project, MAX_SLUG, true) ||
        !textOk(author_name, MAX_NAME, true) ||
        !textOk(author_email, MAX_EMAIL, false) ||
        !textOk(comment_text, MAX_COMMENT, true)
      ) {
        return res.status(400).json({ error: 'One or more fields are too long or not text' });
      }
      if (scene !== undefined && scene !== null && scene !== '' && !Number.isInteger(Number(scene))) {
        return res.status(400).json({ error: 'scene must be a whole number' });
      }

      const result = await sql`
        INSERT INTO storyboard_comments
          (client_slug, project_slug, scene_number, author_name, author_email, comment_text)
        VALUES
          (${client}, ${project}, ${scene || null}, ${author_name}, ${author_email || null}, ${comment_text})
        RETURNING id, created_at
      `;

      return res.status(201).json({
        success: true,
        comment: {
          id: result[0].id,
          created_at: result[0].created_at
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Comments API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
