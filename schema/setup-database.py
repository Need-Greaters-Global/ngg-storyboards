"""
Setup Neon Database for NGG Storyboards Comments

Run this script to create the comments tables in the existing Neon database.
"""

import psycopg2
import os

# The connection string is read from the environment, never from this file.
# Set it first, for example in PowerShell:  $env:DATABASE_URL = "<value from Vercel or Neon>"
# or pull it with:  vercel env pull .env.local  (and load it into your shell).
def get_database_url():
    """Return DATABASE_URL from the environment, or stop with a clear message."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise SystemExit(
            "DATABASE_URL is not set. Export the Neon connection string as the "
            "DATABASE_URL environment variable and run this script again."
        )
    return url

def setup_database():
    """Create the storyboard comments tables"""

    # Read the SQL schema file
    schema_path = os.path.join(os.path.dirname(__file__), 'comments.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()

    # Connect and execute
    conn = psycopg2.connect(get_database_url())
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("Connecting to Neon database...")
        print("Executing schema...")

        # Execute the schema
        cursor.execute(schema_sql)

        print("[OK] Schema created successfully!")

        # Verify tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('storyboard_comments', 'storyboard_access')
        """)
        tables = cursor.fetchall()
        print(f"[OK] Verified tables: {[t[0] for t in tables]}")

    except Exception as e:
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    setup_database()
