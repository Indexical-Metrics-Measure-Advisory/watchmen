from fastapi import APIRouter

from watchmen_ai.model.data_story import DataStory

router = APIRouter()


async def load_data_story_by_document(data_story: DataStory):
    pass


async def publish_data_story(data_story: DataStory):
    pass
