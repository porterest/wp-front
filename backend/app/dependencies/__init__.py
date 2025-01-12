from apscheduler.schedulers.asyncio import AsyncIOScheduler


def get_scheduler():
    scheduler = AsyncIOScheduler(job_defaults={'misfire_grace_time': None})
    return scheduler
