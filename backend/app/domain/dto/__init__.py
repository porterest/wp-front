from dataclasses import field, dataclass
from uuid import UUID, uuid4


@dataclass(kw_only=True)
class CreateDTO:
    id: UUID = field(default_factory=uuid4)
