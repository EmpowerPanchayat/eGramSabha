from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import logging
from dotenv import load_dotenv

from app.api.endpoints import router as api_router
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.file_storage import file_storage
from app.services.request_tracker import RequestTracker

load_dotenv()

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    cleanup_task = asyncio.create_task(periodic_cleanup())
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    await close_mongo_connection()

async def periodic_cleanup():
    """Periodic cleanup every hour"""
    while True:
        try:
            await asyncio.sleep(3600)
            
            db = await get_database()
            tracker = RequestTracker(db)
            await tracker.cleanup_expired_requests()
            file_storage.cleanup_old_files(hours_old=24)
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

app = FastAPI(title="Video MOM Backend", lifespan=lifespan)
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Video MOM Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)