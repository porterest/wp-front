from enum import Enum


class VerifyResult(Enum):
    """
    Represents the result of the proof verification process.
    """
    VALID = 1
    """The proof is valid and the verification was successful."""

    HASH_MISMATCH = -1
    """The hash derived from the proof does not match the expected hash, indicating a verification failure."""

    DOMAIN_NOT_ALLOWED = -2
    """The domain specified in the proof is not allowed."""

    ADDRESS_MISMATCH = -3
    """The address in the proof does not match the expected address."""

    PUBLIC_KEY_MISMATCH = -4
    """The public key provided in the proof does not match the expected public key."""

    PROOF_EXPIRED = -5
    """The proof has expired and is no longer valid."""

    INVALID_INIT_STATE = -6
    """Invalid InitState structure."""

    INVALID_ADDRESS = -7
    """The address lacks the correct format and omits a workchain."""
