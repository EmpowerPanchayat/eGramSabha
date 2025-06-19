import os
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class FileStorage:
    def __init__(self, storage_dir: str = "temp_storage"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        
    def store_file(self, file_content: bytes, filename: str, request_id: str) -> str:
        """Store file content and return the storage path"""
        # Create subdirectory for this request
        request_dir = self.storage_dir / request_id
        request_dir.mkdir(exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        file_path = request_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        logger.info(f"Stored file {filename} for request {request_id} at {file_path}")
        return str(file_path)
    
    def get_file_path(self, request_id: str, filename: str) -> Optional[str]:
        """Get file path if it exists"""
        file_path = self.storage_dir / request_id / filename
        if file_path.exists():
            return str(file_path)
        return None
    
    def cleanup_request_files(self, request_id: str):
        """Clean up all files for a request"""
        request_dir = self.storage_dir / request_id
        if request_dir.exists():
            shutil.rmtree(request_dir)
            logger.info(f"Cleaned up all files for request {request_id}")
    
    def cleanup_old_files(self, hours_old: int = 24):
        """Clean up files older than specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours_old)
        
        for request_dir in self.storage_dir.iterdir():
            if request_dir.is_dir():
                # Check directory modification time
                dir_mtime = datetime.fromtimestamp(request_dir.stat().st_mtime)
                if dir_mtime < cutoff_time:
                    shutil.rmtree(request_dir)
                    logger.info(f"Cleaned up old request directory: {request_dir}")

# Global file storage instance
file_storage = FileStorage()