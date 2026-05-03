"""Legacy entry point — the canonical seed lives at `backend/scripts/seed.py`.

Run from the backend directory:
    python -m scripts.seed
"""
import asyncio
from scripts.seed import main

if __name__ == '__main__':
    asyncio.run(main())
