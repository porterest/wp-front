import base64
import logging
from dataclasses import dataclass, asdict
from typing import Optional

from pydantic import BaseModel, Field
from pytoniq_core import Slice, Cell

from domain.ton import InitialAccountState, TickTock, Library

logger = logging.getLogger(__name__)


class Domain(BaseModel):
    length_bytes: int = Field(alias='LengthBytes')
    value: str


class Proof(BaseModel):
    timestamp: int
    domain: Domain
    signature: str
    payload: str
    state_init: Optional[str] = Field(default=None)


class CheckProofRequest(BaseModel):
    address: str
    network: str
    public_key: str
    proof: Proof


@dataclass
class CheckProofRequestRaw:
    request: CheckProofRequest

    address_bytes: Optional[bytes] = None
    workchain: Optional[int] = None
    init_state: Optional[InitialAccountState] = None
    data: Optional[Cell] = None
    code: Optional[str] = None

    def __str__(self):
        data = {
            "request": self.request.model_dump(),
            "address_bytes": self.address_bytes.decode(),
            "workchain": self.workchain,
            "init_state": asdict(self.init_state),
            "data": str(self.data),
            "code": self.code,
        }
        return str(data)

    @property
    def proof(self) -> Proof:
        return self.request.proof

    @property
    def address(self) -> str:
        return self.request.address

    @property
    def public_key(self) -> str:
        return self.request.public_key

    def __post_init__(self):
        # Process the address to extract workchain and address bytes
        address = self.request.address
        if len(address) > 2 and address[1] == ':':
            try:
                self.workchain = int(address[:1])
                self.address_bytes = bytes.fromhex(address[2:])
                logger.debug(f"workchain is {self.workchain}")
                logger.debug(f"address bytes is {self.address_bytes.decode()}")
            except ValueError:
                self.workchain = None
                self.address_bytes = None
                print("Error parsing the address.")
        else:
            print("Invalid address format.")

        # Process the StateInit to extract code and data cells
        if self.proof.state_init:
            try:
                # Decode the Base64-encoded StateInit
                boc_bytes = base64.b64decode(self.proof.state_init)

                # Deserialize the BOC to get the root cell
                root_cell: Cell = Cell.one_from_boc(boc_bytes)

                if len(root_cell.refs) >= 2:
                    code_cell = root_cell.refs[0]
                    self.data = root_cell.refs[1]

                    code_boc = code_cell.to_boc()
                    code_base64 = base64.b64encode(code_boc).decode('utf-8')
                    self.code = code_base64

                slice = Slice.from_cell(root_cell)

                split_depth: int | None = None
                if slice.load_bit():
                    split_depth = slice.load_uint(5)

                special: TickTock | None = None
                if slice.load_bit():
                    special = TickTock(tick=slice.load_bit(), tock=slice.load_bit())

                code = slice.load_maybe_ref()
                data = slice.load_maybe_ref()

                libraries = slice.load_dict(
                    key_length=1,
                    value_deserializer=lambda x: Library(
                        public=x.load_bit(),
                        root=x.load_ref(),
                    )
                )

                self.init_state = InitialAccountState(
                    split_depth=split_depth,
                    special=special,
                    code=code,
                    data=data,
                    libraries=libraries,
                )
            except Exception as e:
                print(f"Error processing state_init: {e}")
        else:
            print("No state_init provided in proof.")
