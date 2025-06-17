import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import RequestStatus, RequestType

logger = logging.getLogger(__name__)

class RequestTracker:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.requests_collection = db.requests
        self.objects_collection = db.request_objects
        
    async def create_request(self, request_type: str, initial_data: Dict[str, Any] = None) -> str:
        """Create a new request and return request ID"""
        request_id = str(uuid.uuid4())
        
        request_doc = {
            "request_id": request_id,
            "request_type": request_type,
            "status": RequestStatus.INITIATED,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "initial_data": initial_data or {},
            "steps_completed": [],
            "current_step": None,
            "error_message": None,
            "progress_percentage": 0
        }
        
        await self.requests_collection.insert_one(request_doc)
        logger.info(f"Created request {request_id} of type {request_type}")
        return request_id
    
    async def update_request_status(self, request_id: str, status: str, 
                                  current_step: str = None, error_message: str = None,
                                  progress: int = None):
        """Update request status and current step"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if current_step:
            update_data["current_step"] = current_step
        if error_message:
            update_data["error_message"] = error_message
        if progress is not None:
            update_data["progress_percentage"] = progress
            
        await self.requests_collection.update_one(
            {"request_id": request_id},
            {"$set": update_data}
        )
        
    async def add_step_completion(self, request_id: str, step_name: str, result_data: Dict[str, Any]):
        """Mark a step as completed and store its result"""
        await self.requests_collection.update_one(
            {"request_id": request_id},
            {
                "$push": {"steps_completed": {
                    "step_name": step_name,
                    "completed_at": datetime.utcnow(),
                    "result_preview": str(result_data)[:200] + "..." if len(str(result_data)) > 200 else str(result_data)
                }},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Store result data only if it's small enough
        result_str = str(result_data)
        if len(result_str) < 1000000:  # 1MB limit for database storage
            await self.store_object(request_id, step_name, result_data)
        else:
            logger.warning(f"Result data too large for database storage: {step_name}")
    
    async def store_object(self, request_id: str, object_type: str, data: Any, ttl_hours: int = 24):
        """Store small objects only (avoid large file content)"""
        # Check data size before storing
        data_str = str(data)
        if len(data_str) > 1000000:  # 1MB limit
            logger.warning(f"Data too large for database storage: {object_type}")
            return
            
        object_doc = {
            "request_id": request_id,
            "object_type": object_type,
            "data": data,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=ttl_hours)
        }
        
        try:
            await self.objects_collection.replace_one(
                {"request_id": request_id, "object_type": object_type},
                object_doc,
                upsert=True
            )
        except Exception as e:
            logger.error(f"Failed to store object {object_type}: {e}")
    
    async def get_object(self, request_id: str, object_type: str) -> Optional[Any]:
        """Retrieve stored object"""
        try:
            doc = await self.objects_collection.find_one({
                "request_id": request_id,
                "object_type": object_type,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            return doc["data"] if doc else None
        except Exception as e:
            logger.error(f"Failed to retrieve object {object_type}: {e}")
            return None
    
    async def get_request_status(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get current request status"""
        return await self.requests_collection.find_one({"request_id": request_id})
    
    async def can_resume_request(self, request_id: str) -> bool:
        """Check if request can be resumed"""
        request = await self.get_request_status(request_id)
        if not request:
            return False
        return request["status"] in [RequestStatus.PROCESSING, RequestStatus.FAILED]
    
    async def cleanup_expired_requests(self):
        """Clean up old requests and objects"""
        cutoff_time = datetime.utcnow() - timedelta(hours=48)
        
        # Delete old requests
        await self.requests_collection.delete_many({"created_at": {"$lt": cutoff_time}})
        
        # Delete expired objects
        await self.objects_collection.delete_many({"expires_at": {"$lt": datetime.utcnow()}})
        
        logger.info("Cleaned up expired requests and objects")
    
    async def get_request_data(self, request_id: str) -> dict:
        """Get request data by ID"""
        try:
            request_doc = await self.db.requests.find_one({"_id": request_id})
            if request_doc:
                return request_doc.get("data", {})
            return {}
        except Exception as e:
            logger.error(f"Error getting request data: {e}")
            return {}

    async def update_request_data(self, request_id: str, data: dict):
        """Update request data"""
        try:
            await self.requests_collection.update_one(
                {"_id": request_id},
                {"$set": {"data": data}}
            )
            logger.info(f"Updated request data for {request_id}")
        except Exception as e:
            logger.error(f"Error updating request data: {e}")
            raise