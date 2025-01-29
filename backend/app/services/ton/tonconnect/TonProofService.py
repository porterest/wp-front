import base64
import logging
import struct
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from typing import Annotated

from nacl.encoding import RawEncoder
from nacl.exceptions import BadSignatureError
from nacl.hash import sha256
from nacl.signing import VerifyKey
from pytoniq_core import Address
from pytoniq_core import Cell

from abstractions.services.auth.tokens import TokenServiceInterface
from abstractions.services.auth.tonproof import TonProofServiceInterface
from abstractions.services.known_wallets import KnownWalletsProviderInterface
from abstractions.services.public_keys import PublicKeyProviderInterface
from abstractions.services.tonclient import TonClientInterface
from domain.ton.address import TonAddressInfo
from domain.tonconnect.enums import VerifyResult
from domain.tonconnect.requests import CheckProofRequest, CheckProofRequestRaw
from services.ton.tonconnect.exceptions import KeyCannotBeParsedException, TonProofVerificationFailed

logger = logging.getLogger(__name__)


@dataclass(kw_only=True)
class TonProofService(TonProofServiceInterface):
    # services
    ton_client: TonClientInterface
    tokens_service: TokenServiceInterface
    public_key_provider: PublicKeyProviderInterface
    known_wallets_provider: KnownWalletsProviderInterface

    # settings
    payload_ttl: int
    allowed_domains: list[str]
    ton_connect_prefix: str = 'ton-connect'
    ton_proof_prefix: str = 'ton-proof-item-v2/'

    async def generate_payload(self) -> str:
        return self.tokens_service.create_payload_token(ttl=self.payload_ttl)

    async def check_payload(self, request: CheckProofRequest):
        result = await self._check_payload(request)

        if result != VerifyResult.VALID:
            raise TonProofVerificationFailed(
                status=result,
            )

    async def _check_payload(self, request: CheckProofRequest) -> VerifyResult:
        request_raw = CheckProofRequestRaw(
            request=request,
        )
        logger.debug(str(request_raw))

        # step 0.5: retrieve the proof from user and validate
        if request_raw.workchain is None:
            return VerifyResult.INVALID_ADDRESS

        if not request_raw.init_state:
            return VerifyResult.INVALID_INIT_STATE

        # step 2: check if proof domain corresponds app's frontend domain
        if request_raw.proof.domain.value not in self.allowed_domains:
            logger.error(f"Domain not allowed: {request_raw.proof.domain.value} is not in the list "
                         f"of allowed domains: ({", ".join(self.allowed_domains)})")
            return VerifyResult.DOMAIN_NOT_ALLOWED

        # step 3: check if payload expired
        proof_datetime = datetime.fromtimestamp(request_raw.proof.timestamp, tz=UTC)
        proof_expires = proof_datetime + timedelta(seconds=self.payload_ttl)
        if proof_expires < datetime.now(tz=UTC):
            logger.error(
                f"Proof expired: the proof DateTimes {proof_expires} is outside the allowed validity period: {self.payload_ttl} sec.")
            return VerifyResult.PROOF_EXPIRED

        # step 6: retrieve user wallet's public key
        try:
            # 6b: use known wallets recognition and retrieve the pubkey from stateInit provided
            public_key = self.parse_wallet_public_key(request_raw.code, request_raw.data)
        except KeyCannotBeParsedException:
            provider_type = type(self.public_key_provider)
            provider_type_message = "API" if 'Api' in provider_type.__name__ else provider_type.__name__
            logger.error(
                f'Wallet cannot be parsed from boc for {request.address}, calling provider ({provider_type_message})',
            )
            try:
                # 6a: retrieve the pubkey from API (either tonapi or tonlib client)
                public_key = await self.public_key_provider.get_public_key(request_raw.address)
                logger.info(f'Provider call for address {request_raw.address} is successful')
            except Exception:
                logger.error(f"Cant get public key for address {request_raw.address}", exc_info=True)
                raise

        if request_raw.public_key.lower() != public_key.lower():
            logger.debug(
                f'Public key mismatch: provided public key {request_raw.public_key} does not match the parsed or retrieved public key {public_key}')
            return VerifyResult.PUBLIC_KEY_MISMATCH

        wanted_address = self.ton_client.get_account_address(request_raw.init_state)
        if not self.compare_addresses(wanted_address, request_raw.address_bytes):
            logger.error(f'Address mismatch: expected address {wanted_address}, but got {request_raw.address}')
            return VerifyResult.ADDRESS_MISMATCH

        # step 5: assembling a message
        msg = self._create_message(request_raw)
        msg_hash = sha256(msg, encoder=RawEncoder)

        public_key_bytes = bytes.fromhex(request_raw.public_key)
        verify_key = VerifyKey(public_key_bytes)

        # Step 4: Verify the signature
        signature = base64.b64decode(request_raw.proof.signature)
        try:
            verify_key.verify(msg_hash, signature)
            return VerifyResult.VALID
        except BadSignatureError:
            logger.error('bad signature', exc_info=True)
            return VerifyResult.HASH_MISMATCH

    @property
    def ton_connect_prefix_bytes(self) -> bytes:
        return self.ton_connect_prefix.encode()

    @property
    def ton_proof_prefix_bytes(self) -> bytes:
        return self.ton_proof_prefix.encode()

    def _create_message(self, request_raw: CheckProofRequestRaw) -> bytes:
        """
        Constructs the message as per the C# logic.
        """
        # Step 1: Workchain ID (Big Endian, 4 bytes)
        wc_bytes = struct.pack(">I", int(request_raw.workchain))

        # Step 2: Timestamp (Little Endian, 8 bytes)
        ts_bytes = struct.pack("<Q", request_raw.proof.timestamp)

        # Step 3: Domain Length (Little Endian, 4 bytes)
        dl_bytes = struct.pack("<I", request_raw.proof.domain.length_bytes)

        # Step 4: Domain and Payload (UTF-8 encoded)
        domain_bytes = request_raw.proof.domain.value.encode("utf-8")
        payload_bytes = request_raw.proof.payload.encode("utf-8")

        message = (
                self.ton_proof_prefix_bytes
                + wc_bytes
                + request_raw.address_bytes
                + dl_bytes
                + domain_bytes
                + ts_bytes
                + payload_bytes
        )

        # Compute the SHA256 hash of the message
        msg_hash = sha256(message, encoder=RawEncoder)

        # Construct the final message
        ff_bytes = b"\xFF\xFF"
        # final_length = len(ff_bytes) + len(self.ton_connect_prefix_bytes) + len(msg_hash)
        final_message = ff_bytes + self.ton_connect_prefix_bytes + msg_hash

        return final_message

    def parse_wallet_public_key(self, code: str, data: Cell) -> Annotated[str, 'Wallet public key']:
        return self.known_wallets_provider.get_wallet_public_key(code, data)

    def compose_address(self, account_info: TonAddressInfo) -> str:
        address = Address((account_info.workchain, account_info.account_id))

        return address.to_str(
            is_bounceable=account_info.bouncable,
            is_user_friendly=False,
            is_test_only=account_info.testnet_only,
        )

    def compare_addresses(self, wanted_address: str, account_id: bytes) -> bool:
        wanted_address = Address(wanted_address)
        composed_address_info = TonAddressInfo(
            workchain=wanted_address.wc,
            bouncable=wanted_address.is_bounceable,
            testnet_only=wanted_address.is_test_only,
            account_id=account_id,
        )
        composed_address = self.compose_address(composed_address_info)
        return composed_address == wanted_address.to_str(is_user_friendly=False)
