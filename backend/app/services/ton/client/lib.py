import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from enum import Enum

from pytoniq import LiteBalancer, WalletV4R2, begin_cell, Address, BaseWallet, Cell

from domain.models.app_wallet import AppWalletWithPrivateData, AppWalletVersion
from services.ton.client.base import AbstractBaseTonClient
from services.ton.client.exceptions import UnsupportedWalletVersionException

logger = logging.getLogger(__name__)


class OPS(Enum):
    Mint = 21
    InternalTransfer = 0x178d4519
    Transfer = 0xf8a7ea5


class Opcodes(Enum):
    PROVIDE_LIQUIDITY = 0x1
    # DEPLOY = 0x2
    REMOVE_LIQUIDITY = 0x3
    # SET_JETTON_WALLET_ADDRESS = 0x4


@dataclass
class TonTonLibClient(AbstractBaseTonClient):
    def __post_init__(self):
        self.ton = LiteBalancer.from_mainnet_config()
        self.ton_is_up = False

    @asynccontextmanager
    async def _connect(self):
        await self.ton.start_up()
        self.ton_is_up = True

        yield

        await self.ton.close_all()
        self.ton_is_up = False

    async def mint(self, amount: int, token_address: Address, admin_wallet: AppWalletWithPrivateData):
        await self.ton.start_up()

        logger.debug('Preparing mint transaction')

        wallet = await self._get_wallet_instance(wallet=admin_wallet)

        payload = (
            begin_cell()
            .store_uint(OPS.Mint, 32)
            .store_uint(0, 64)
            .store_address(wallet.address)
            .store_coins( AbstractBaseTonClient.to_nano(0.2))
            .store_ref(
                begin_cell()
                .store_uint(OPS.InternalTransfer, 32)
                .store_uint(0, 64)
                .store_coins(amount)
                .store_address(None)
                .store_address(None)
                .store_coins(0)
                .store_bit(False)
                .end_cell()
            )
            .end_cell()
        )

        logger.debug('Wallet initialized for minting tokens')

        async with self._connect():
            result = await self._send_transfer(
                to=token_address,
                value= AbstractBaseTonClient.to_nano(0.001),
                body=payload,
                wallet=wallet
            )

        if result > 1:
            raise Exception("Mint failed")

        logger.info(f"Minting successful for {amount} tokens to {wallet.address.to_str(is_user_friendly=False)}")

        await self.ton.close_all()

    async def send_jettons(
            self,
            destination_owner_address: Address,
            amount: int,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ):
        await self.ton.start_up()

        logger.debug('Preparing sending jettons')

        wallet = await self._get_wallet_instance(wallet=app_wallet)

        source_address = await self.get_jetton_wallet_address(
            contract_address=token_address,
            target_address=wallet.address,
        )

        payload = (
            begin_cell()
            .store_uint(OPS.Transfer, 32)
            .store_uint(0, 64)
            .store_coins(amount)
            .store_address(destination_owner_address)
            .store_address(None)
            .store_dict(None)
            .store_coins(0)
            .store_maybe_ref(None)
            .end_cell()
        )

        logger.debug('Wallet initialized for sending tokens')

        async with self._connect():
            result = await self._send_transfer(
                to=source_address,
                value= AbstractBaseTonClient.to_nano(0.001),
                body=payload,
                wallet=wallet
            )

        if result > 1:
            raise Exception("Sending jettons failed")

        logger.info(
            f"Sent {amount} tokens "
            f"from {wallet.address.to_str(is_user_friendly=False)} "
            f"to {destination_owner_address.to_str(is_user_friendly=False)}"
        )

        await self.ton.close_all()

    async def provide_liquidity(
            self,
            token0amount: int,
            token1amount: int,
            minter_address: Address,
            admin_wallet: AppWalletWithPrivateData,
    ):
        await self.ton.start_up()

        logger.debug('Preparing provide liquidity transaction')

        wallet = await self._get_wallet_instance(wallet=admin_wallet)

        payload = (
            begin_cell()
            .store_uint(Opcodes.PROVIDE_LIQUIDITY, 32)
            .store_coins(token0amount)
            .store_coins(token1amount)
            .end_cell()
        )

        async with self._connect():
            result = await self._send_transfer(
                to=minter_address,
                value= AbstractBaseTonClient.to_nano(0.001),
                body=payload,
                wallet=wallet
            )

        if result > 1:
            raise Exception("Providing liquidity transaction failed")

        await self.ton.close_all()

    async def remove_liquidity(
            self,
            token0amount: int,
            token1amount: int,
            minter_address: Address,
            admin_wallet: AppWalletWithPrivateData,
    ):
        logger.debug('Preparing remove liquidity transaction')

        wallet = await self._get_wallet_instance(wallet=admin_wallet)

        payload = (
            begin_cell()
            .store_uint(Opcodes.REMOVE_LIQUIDITY, 32)
            .store_coins(token0amount)
            .store_coins(token1amount)
            .end_cell()
        )

        async with self._connect():
            result = await self._send_transfer(
                wallet=wallet,
                body=payload,
                to=minter_address,
            )

        if result > 1:
            raise Exception("Removing liquidity transaction failed")

    async def get_jetton_wallet_address(self, contract_address: Address, target_address: Address) -> Address:
        response = await self.ton.run_get_method(
            address=contract_address,
            method='get_wallet_address',
            stack=[target_address.to_str(is_user_friendly=False)],
        )

        return Address(response[0])

    async def _send_transfer(
            self,
            wallet: BaseWallet,
            to: Address,
            body: Cell,
            value: int = AbstractBaseTonClient.to_nano(0.001)
    ) -> int:
        if not self.ton_is_up:
            raise Exception("Ton liteserver client should be up to send transfers")

        return await wallet.transfer(
            destination=to,
            amount=value,
            body=body,
        )

    async def _get_wallet_instance(self, wallet: AppWalletWithPrivateData) -> BaseWallet:
        match wallet.wallet_version:
            case AppWalletVersion.V4R2:
                wallet_cls = WalletV4R2
            case AppWalletVersion.V5R1:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {wallet.wallet_version.value} is not supported"
                )
            case _:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {wallet.wallet_version.value} is not supported"
                )

        wallet = await wallet_cls.from_private_key(
            provider=self.ton,
            private_key=wallet.private_key.get_secret_value().encode(),
        )
        return wallet

