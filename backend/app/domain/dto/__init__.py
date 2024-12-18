from dataclasses import Field, dataclass
from uuid import UUID, uuid4


@dataclass(kw_only=True)
class CreateDTO:
    id: UUID = Field(default_factory=uuid4)
