from apscheduler.schedulers.asyncio import AsyncIOScheduler


def get_scheduler():
    scheduler = AsyncIOScheduler
    return scheduler