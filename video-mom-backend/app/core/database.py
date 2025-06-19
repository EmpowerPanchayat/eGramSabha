import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

class RequestStatus:
    INITIATED = "initiated"
    PROCESSING = "processing"
    RESUMED = "resumed"
    COMPLETED = "completed"
    FAILED = "failed"

class RequestType:
    TRANSCRIPTION = "transcription"
    TRANSCRIPTION_JIO = "transcription_jio"
    MOM_GENERATION = "mom_generation"
    AGENDA_GENERATION = "agenda_generation"  # Now handles issues-based generation
    AGENDA_UPDATE = "agenda_update"  # Now handles issues-based updates
    TRANSLATION = "translation"

# MongoDB connection
mongodb_client: Optional[AsyncIOMotorClient] = None

async def connect_to_mongo():
    """Create database connection"""
    global mongodb_client
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_client = AsyncIOMotorClient(mongodb_url)

async def close_mongo_connection():
    """Close database connection"""
    if mongodb_client:
        mongodb_client.close()

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    database_name = os.getenv("DATABASE_NAME", "eGramSabha")
    return mongodb_client[database_name]