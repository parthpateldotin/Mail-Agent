"""Script to recreate the database."""
import asyncio
import asyncpg


async def recreate_database():
    """Recreate the database."""
    try:
        # Connect to default database to drop and create aimail database
        conn = await asyncpg.connect(
            user='postgres',
            password='postgres',
            database='postgres',
            host='localhost'
        )
        
        # Drop connections to aimail database
        await conn.execute("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'aimail'
            AND pid <> pg_backend_pid();
        """)
        
        # Drop and recreate database
        await conn.execute('DROP DATABASE IF EXISTS aimail')
        await conn.execute('CREATE DATABASE aimail')
        await conn.close()
        
        print("Database recreated successfully!")
    except Exception as e:
        print(f"Error recreating database: {e}")


if __name__ == "__main__":
    asyncio.run(recreate_database()) 