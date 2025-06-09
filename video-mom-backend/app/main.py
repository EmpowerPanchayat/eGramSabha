from fastapi import FastAPI
from app.api.endpoints import router as api_router
from app.core.config import settings

app = FastAPI(title="Video MOM Backend")

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Video MOM Backend API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.APP_HOST, port=settings.APP_PORT)