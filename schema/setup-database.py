"""
Setup Neon Database for NGG Storyboards Comments

Run this script to create the comments tables in the existing Neon database.
"""

import psycopg2
import os

# Neon database connection string
DATABASE_URL = "postgresql://neondb_owner:npg_v9Q2FHAzJSof@ep-morning-dawn-a4ct3x1k-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

def setup_database():
    """Create the storyboard comments tables"""

    # Read the SQL schema file
    schema_path = os.path.join(os.path.dirname(__file__), 'comments.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()

    # Connect and execute
    conn = psycopg2.connect(DATABASE_URL)
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
