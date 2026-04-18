from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.chapter import ChapterSchema
import uuid

class RoadmapSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    title: str
    status: str = "generating"
    chapters: List[ChapterSchema] = []
    doc_content_hash: Optional[str] = None
    created_at: Optional[datetime] = None

class RoadmapGenerateRequest(BaseModel):
    project_id: uuid.UUID