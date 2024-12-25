from enum import Enum


class BlockStatus(Enum):
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    INTERRUPTED = "interrupted"