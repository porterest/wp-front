from dataclasses import dataclass
from typing import Optional

from pytoniq_core import Cell


@dataclass(kw_only=True)
class TickTock:
    tick: bool
    tock: bool


@dataclass(kw_only=True)
class Library:
    public: int
    root: Cell


@dataclass(kw_only=True)
class InitialAccountState:
    code: Optional[Cell] = None
    data: Optional[Cell] = None

    split_depth: Optional[bool] = None
    special: Optional[TickTock] = None

    libraries: Optional[Library] = None
