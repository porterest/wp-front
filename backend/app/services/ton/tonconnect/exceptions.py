from domain.tonconnect.enums import VerifyResult


class TonProofVerificationFailed(Exception):
    def __init__(self, *args, status: VerifyResult = None):
        super().__init__(*args)
        self.status = status


class InvalidPayloadToken(Exception):
    ...


class KeyCannotBeParsedException(Exception):
    ...
