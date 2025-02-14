class NotFoundException(Exception):
    ...


class InvalidTokenException(Exception):
    ...


class NoSuchUserException(Exception):
    ...


class ExpiredTokenException(Exception):
    ...


class NoBlocksFoundException(Exception):
    ...


class StopPairProcessingException(Exception):
    ...

class NotEnoughMoney(Exception):
    ...
