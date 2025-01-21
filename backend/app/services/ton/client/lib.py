import logging
from dataclasses import dataclass

from pytoniq import LiteBalancer, WalletV4R2, begin_cell, Address

from domain.models.app_wallet import AppWalletWithPrivateData, AppWalletVersion
from abstractions.services.tonclient import TonClientInterface
from services.ton.client.exceptions import UnsupportedWalletVersionException

logger = logging.getLogger(__name__)


@dataclass
class TonTonLibClient(TonClientInterface):
    ton: LiteBalancer

    async def mint(self, amount: int, token_address: Address, admin_wallet: AppWalletWithPrivateData):
        await self.ton.start_up()

        logger.debug('Preparing mint transaction')

        grams_amount = int(amount * 1e9)

        match admin_wallet.wallet_version:
            case AppWalletVersion.V4R2:
                wallet_cls = WalletV4R2
            case AppWalletVersion.V5R1:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {admin_wallet.wallet_version.value} is not supported"
                )
            case _:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {admin_wallet.wallet_version.value} is not supported"
                )

        # Инициализируем кошелек администратора
        wallet = await wallet_cls.from_private_key(
            provider=self.ton,
            private_key=admin_wallet.private_key.get_secret_value().encode(),
        )

        payload = (
            begin_cell()
            .store_uint(21, 32)  # op::mint
            .store_uint(0, 64)  # query_id, skipped for mint operation
            .store_address(wallet.address)  # destination
            .store_coins(grams_amount)  # amount of jettons needed to be minted
            .store_ref(
                begin_cell()
                .store_uint(0, 32)  # opcode, skipped for mint operation
                .store_uint(0, 64)  # query_id, skipped for mint operation
                .store_coins(grams_amount)  # amount of jettons needed to be minted
                .end_cell()
            )
            .end_cell()
        )

        logger.debug('Wallet initialized for minting tokens')

        # Выполняем вызов контракта с передачей подготовленного payload
        result = await wallet.transfer(
            destination=token_address,
            amount=int(1e9),  # Гарантируем оплату газа
            payload=payload,
        )

        if result > 1:
            raise Exception("Minting transaction failed")

        logger.info(f"Minting successful for {amount} tokens to {wallet.address.to_str(is_user_friendly=False)}")

        await self.ton.close_all()

    async def send_jettons(
            self,
            user_wallet_address: Address,
            amount: int,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ):
        await self.ton.start_up()

        logger.debug('Preparing mint transaction')

        match app_wallet.wallet_version:
            case AppWalletVersion.V4R2:
                wallet_cls = WalletV4R2
            case AppWalletVersion.V5R1:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {app_wallet.wallet_version.value} is not supported"
                )
            case _:
                raise UnsupportedWalletVersionException(
                    f"Wallet version {app_wallet.wallet_version.value} is not supported"
                )

        # Инициализируем кошелек администратора
        wallet = await wallet_cls.from_private_key(
            provider=self.ton,
            private_key=app_wallet.private_key.get_secret_value().encode(),
        )

        source_address = await self.get_wallet_address(
            contract_address=token_address,
            target_address=wallet.address,
        )

        payload = (
            begin_cell()
            .store_uint(0xf8a7ea5, 32)  # op::transfer
            .store_uint(0, 64)  # query_id
            .store_coins(amount)  # jettons to send
            .store_address(user_wallet_address)  # destination jetton wallet owner address
            # todo: next lines is extremely unreliable, should be tested!
            .store_address()  # response address
            .store_dict()  # custom payload
            .store_coins(0)  # forward ton amount
            .store_maybe_ref()  # forward payload
            .end_cell()
        )

        logger.debug('Wallet initialized for sending tokens')

        # Выполняем вызов контракта с передачей подготовленного payload
        result = await wallet.transfer(
            destination=source_address,
            amount=int(0.01 * 1e9),  # Гарантируем оплату газа
            payload=payload,
        )

        if result > 1:
            raise Exception("Sending jettons failed")

        logger.info(
            f"Sent {amount} tokens "
            f"from {wallet.address.to_str(is_user_friendly=False)} "
            f"to {user_wallet_address.to_str(is_user_friendly=False)}"
        )

        await self.ton.close_all()

    async def get_wallet_address(self, contract_address: Address, target_address: Address) -> Address:
        response = await self.ton.run_get_method(
            address=contract_address,
            method='get_wallet_address',
            stack=[target_address.to_str(is_user_friendly=False)],
        )

        return Address(response[0])  # response is a stack contract returned
