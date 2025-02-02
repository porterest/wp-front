import base64
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Annotated

from pytoniq import LiteBalancer, WalletV4R2, begin_cell, Address, BaseWallet, Cell
from pytoniq_core import Slice

from domain.models.app_wallet import AppWalletWithPrivateData, AppWalletVersion
from domain.ton.transaction import TonTransaction
from services.ton.client.base import AbstractBaseTonClient
from services.ton.client.exceptions import UnsupportedWalletVersionException
from settings import InnerTokenSettings

logger = logging.getLogger(__name__)


class OPS(Enum):
    Mint = 21
    InternalTransfer = 0x178d4519
    Transfer = 0xf8a7ea5


class Opcodes(Enum):
    PROVIDE_LIQUIDITY = 0x1
    REMOVE_LIQUIDITY = 0x3


@dataclass
class TonTonLibClient(AbstractBaseTonClient):
    async def get_public_key(self, address: str) -> str:
        raise NotImplementedError

    async def get_transactions(self, address: str) -> list[TonTransaction]:
        raise NotImplementedError


    async def get_current_pool_state(self) -> dict[str, float]:
        raise NotImplementedError

    inner_token: InnerTokenSettings

    def __post_init__(self):
        self.ton = LiteBalancer.from_mainnet_config()
        self.ton_is_up = False

    @asynccontextmanager
    async def _connect(self):
        if self.ton_is_up:
            raise Warning("Ton is already launched")
        else:
            await self.ton.start_up()
            self.ton_is_up = True

        yield

        if self.ton_is_up:
            await self.ton.close_all()
            self.ton_is_up = False

    async def mint(
            self,
            amount: Annotated[float, 'nano'],
            token_address: Address,
            admin_wallet: AppWalletWithPrivateData,
    ) -> None:
        logger.debug('Preparing mint transaction')

        payload = (
            begin_cell()
            .store_uint(OPS.Mint.value, 32)
            .store_uint(0, 64)
            .store_address(Address(admin_wallet.address))
            .store_coins(AbstractBaseTonClient.to_nano(0.2))
            .store_ref(
                begin_cell()
                .store_uint(OPS.InternalTransfer.value, 32)
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

        # async with self._connect():
        #     wallet = await self._get_wallet_instance(wallet=admin_wallet)
        #
        #     result = await self._send_transfer(
        #         to=token_address,
        #         value=AbstractBaseTonClient.to_nano(0.01),
        #         body=payload,
        #         wallet=wallet
        #     )

        logger.info(f"Minting successful for {amount} tokens to "
                    f"{Address(admin_wallet.address).to_str(is_user_friendly=False)}")

    async def send_jettons(
            self,
            destination_owner_address: Address,
            amount: int,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ) -> None:
        logger.debug('Preparing sending jettons')

        async with self._connect():
            source_address = await self.get_jetton_wallet_address(
                contract_address=Address(self.inner_token.minter_address),
                target_address=Address(app_wallet.address),
            )

        payload = (
            begin_cell()
            .store_uint(OPS.Transfer.value, 32)
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
            wallet = await self._get_wallet_instance(wallet=app_wallet)

            result = await self._send_transfer(
                to=source_address,
                value=AbstractBaseTonClient.to_nano(0.05),
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

    async def provide_liquidity(
            self,
            ton_amount: float,
            jetton_amount: float,
            admin_wallet: AppWalletWithPrivateData,
            pool_address: str,
    ) -> None:
        logger.debug('Preparing provide liquidity transaction')

        ton_amount = self.to_nano(ton_amount)
        jetton_amount = self.to_nano(jetton_amount)

        provide_liquidity_body = (
            begin_cell()
            .store_uint(Opcodes.PROVIDE_LIQUIDITY.value, 32)
            .store_coins(ton_amount)
            .store_coins(jetton_amount)
            .end_cell()
        )

        pool_address = Address(pool_address)

        logger.info(f'Providing liquidity: {ton_amount} TON, {jetton_amount} {self.inner_token.symbol}')

        # async with self._connect():
        #     wallet = await self._get_wallet_instance(wallet=admin_wallet)
        #
        #     await self._send_transfer(
        #         to=pool_address,
        #         body=provide_liquidity_body,
        #         wallet=wallet,
        #         value=ton_amount + int(0.01 * 1e9)
        #     )
        #
        #     await self.send_jettons(
        #         destination_owner_address=pool_address,
        #         amount=jetton_amount,
        #         token_address=Address(self.inner_token.minter_address),
        #         app_wallet=admin_wallet,
        #     )

    async def remove_liquidity(self, ton_amount: float, jetton_amount: float, admin_wallet: AppWalletWithPrivateData,
                               pool_address: str) -> None:
        logger.debug('Preparing remove liquidity transaction')

        wallet = await self._get_wallet_instance(wallet=admin_wallet)
        ton_amount = self.to_nano(ton_amount)
        jetton_amount = self.to_nano(jetton_amount)

        remove_liquidity_body = (
            begin_cell()
            .store_uint(Opcodes.REMOVE_LIQUIDITY.value, 32)
            .store_coins(ton_amount)
            .store_coins(jetton_amount)
            .end_cell()
        )

        pool_address = Address(pool_address)

        logger.info(f'Providing liquidity: {ton_amount} TON, {jetton_amount} {self.inner_token.symbol}')

        # async with self._connect():
        #     await self._send_transfer(
        #         to=pool_address,
        #         value=int(0.05 * 1e9),
        #         body=remove_liquidity_body,
        #         wallet=wallet
        #     )

    async def get_jetton_wallet_address(self, contract_address: Address, target_address: Address) -> Address:
        response = await self.ton.run_get_method(
            address=contract_address,
            method='get_wallet_address',
            stack=[target_address.to_str(is_user_friendly=False)],
        )
        return Address(response[0])

    async def get_price(
            self,
            pool_address: Address,
    ) -> float:
        stack = await self.run_get_method(
            method='get_price',
            address=pool_address,
            stack=[],
        )

        return stack[0]  # / 1e9

    async def get_pool_reserves(
            self,
            pool_address: Address,
    ) -> tuple[float, float]:
        stack = await self.run_get_method(
            method='get_reserves',
            address=pool_address,
            stack=[],
        )
        logger.info(f'СТААААААААК: {stack}')
        return stack[0] / 1e9, stack[1] / 1e9

    async def run_get_method(self, method: str, address: Address, stack: Optional[list] = None) -> list:
        balancer = LiteBalancer.from_mainnet_config(trust_level=1)
        print('balancer init')

        await balancer.start_up()

        print('balancer started')

        res: list[Slice] = await balancer.run_get_method(
            method=method,
            address=address,
            stack=stack
        )

        await balancer.close_all()

        return res

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
            private_key=base64.b64decode(wallet.private_key.get_secret_value()),
        )
        return wallet
