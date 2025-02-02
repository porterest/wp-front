from dataclasses import dataclass

from pytoniq_core import Address

from abstractions.services.tonclient import TonClientInterface, Nano
from domain.models.app_wallet import AppWalletWithPrivateData
from services.ton.client.base import AbstractBaseTonClient


@dataclass
class MainTonClient(AbstractBaseTonClient):
    ton_client: TonClientInterface
    ton_api_client: TonClientInterface

    async def provide_liquidity(
            self,
            ton_amount: float,
            jetton_amount: float,
            admin_wallet: AppWalletWithPrivateData,
            pool_address: str,
    ) -> None:
        await self.ton_client.provide_liquidity(ton_amount=ton_amount, jetton_amount=jetton_amount,
                                                    admin_wallet=admin_wallet, pool_address=pool_address)

    async def remove_liquidity(self, ton_amount: float, jetton_amount: float, admin_wallet: AppWalletWithPrivateData,
                               pool_address: str) -> None:
        await self.ton_client.remove_liquidity(ton_amount=ton_amount, jetton_amount=jetton_amount,
                                                   admin_wallet=admin_wallet, pool_address=pool_address)

    async def get_pool_reserves(self, pool_address: Address) -> tuple[float, float]:
        return await self.ton_client.get_pool_reserves(pool_address=pool_address)

    async def get_jetton_wallet_address(self, contract_address: Address, target_address: Address) -> Address:
        return await self.ton_client.get_jetton_wallet_address(contract_address=contract_address,
                                                                   target_address=target_address)

    async def get_public_key(self, address: str):
        return await self.ton_api_client.get_public_key(address)

    async def get_current_pool_state(self):
        return await self.ton_api_client.get_current_pool_state()

    async def get_transactions(self, adress: str):
        return await self.ton_api_client.get_transactions(adress)

    async def send_jettons(
            self,
            user_wallet_address: Address,
            amount: Nano,
            token_address: Address,
            app_wallet: AppWalletWithPrivateData,
    ) -> None:
        return await self.ton_client.send_jettons(user_wallet_address, amount, token_address, app_wallet)

    async def mint(self, amount: Nano, token_address: Address, admin_wallet: AppWalletWithPrivateData):
        return await self.ton_client.mint(amount, token_address, admin_wallet)

    async def get_wallet_address(
            self,
            contract_address: Address,
            target_address: Address) -> Address:
        return await self.ton_client.get_jetton_wallet_address(contract_address, target_address)
