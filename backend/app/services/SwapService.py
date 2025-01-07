from dataclasses import dataclass
from math import sqrt
from uuid import UUID

from abstractions.repositories.deposit import DepositRepositoryInterface
from abstractions.repositories.swap import SwapRepositoryInterface
from abstractions.repositories.transaction import TransactionRepositoryInterface
from abstractions.repositories.user import UserRepositoryInterface
from abstractions.services.app_wallet import AppWalletProviderInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.dex import DexServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from abstractions.services.swap import SwapServiceInterface
from domain.dex.pool import PoolBalances
from domain.dto.transaction import CreateTransactionDTO
from domain.enums import TransactionType
from domain.models.swap import CalculatedSwap


@dataclass(kw_only=True)
class SwapService(SwapServiceInterface):
    block_service: BlockServiceInterface
    aggregate_bets_service: AggregateBetsServiceInterface
    user_repository: UserRepositoryInterface
    swap_repository: SwapRepositoryInterface
    deposit_repository: DepositRepositoryInterface
    transaction_repository: TransactionRepositoryInterface
    dex_service: DexServiceInterface
    app_wallets: AppWalletProviderInterface

    inner_token_symbol: str

    inner_token_to_ton_pool_address: str = ''  # todo: later should be dynamic

    async def get_swap_score(self, pair_id: UUID) -> float:
        """
        Рассчитывает оценку свапа для заданной пары токенов.

        Алгоритм:
        - Получает последние 10 блоков по идентификатору пары.
        - Для каждого блока вычисляет отношение изменения цены к объему свапа.
        - Применяет вес, зависящий от "возраста" блока (ближайшие блоки имеют больший вес).
        - Возвращает средневзвешенное значение этих оценок.

        :param pair_id: Идентификатор пары токенов
        :return: Средневзвешенная оценка свапа
        """
        blocks = await self.block_service.get_n_last_blocks_by_pair_id(pair_id=pair_id, n=10)
        weighted_scores = []

        for index, block in enumerate(blocks[1:], start=1):
            swap = await self.swap_repository.get_by_block_id(
                block.id)  # Используем swap_repository для получения объема свапа
            if swap.amount == 0:
                continue

            # Изменение цены между текущим и предыдущим блоком
            previous_block = blocks[max(0, index - 1)]
            price_change = block.result_vector[0] - previous_block.result_vector[0]
            score = price_change / swap.amount
            weight = 1 / (index + 1)  # Вес блока, где более новые блоки имеют больший вес
            weighted_scores.append(score * weight)

        # Возвращаем средневзвешенное значение
        return sum(weighted_scores) / sum(1 / (i + 1) for i in range(len(blocks)))

    async def calculate_swap(
            self,
            current_price: float,
            current_state: PoolBalances,
            target_price_change: float,
    ) -> CalculatedSwap:
        """
        Рассчитывает объем свапа, необходимый для достижения целевого изменения цены.

        Алгоритм:
        - Использует текущее состояние пула ликвидности.
        - Рассчитывает объем свапа для достижения новой цены (текущая цена + целевое изменение).
        - Возвращает объект CalculatedSwap с объемом свапа и целевым токеном.

        :param current_price: Текущая цена токена
        :param current_state: Текущее состояние пула ликвидности
        :param target_price_change: Целевое изменение цены
        :return: Объект CalculatedSwap с рассчитанным объемом свапа
        """
        target_price = current_price + target_price_change
        price_difference = target_price - current_price
        if price_difference == 0:
            return CalculatedSwap(volume=0.0, target_token=self.inner_token_symbol)

        other_token_symbol = (set(current_state.keys()) - {self.inner_token_symbol}).pop()
        pool_invariant = current_state[other_token_symbol] * current_state[self.inner_token_symbol]

        commission = 0.003  # Захардкоженная комиссия  # todo: изменить под конкретный декс (пока оставь так)

        if price_difference > 0:
            target_token = self.inner_token_symbol
            swap_volume = (current_state[target_token] - sqrt(pool_invariant / price_difference)) / (1 - commission)
        else:
            target_token = other_token_symbol
            swap_volume = (
                                  current_state[target_token] - (
                                      pool_invariant / sqrt(pool_invariant / price_difference))
                          ) / (1 - commission)

        return CalculatedSwap(volume=swap_volume, target_token=target_token)

    async def swap_deposit(self, deposit_id: UUID) -> None:
        """
        Обрабатывает депозит и конвертирует его в внутренний токен.

        Алгоритм:
        - Получает информацию о депозите по идентификатору.
        - Находит пользователя, связанного с депозитом.
        - Конвертирует сумму депозита в токен "X" с учетом комиссии.

        :param deposit_id: Идентификатор депозита
        """
        deposit = await self.deposit_repository.get(deposit_id)
        user = await self.user_repository.get(deposit.user.id)

        if not user:
            raise ValueError("User not found")

        # Пример коэффициента конверсии, заменить на реальную логику
        conversion_rate = 1.0
        commission = 0.003  # Захардкоженная комиссия  # todo: изменить под конкретный dex (пока оставь так)
        converted_amount = deposit.transaction.amount * conversion_rate * (1 - commission)

        blockchain_tx = await self.dex_service.perform_swap(
            pool_address=self.inner_token_to_ton_pool_address,
            amount=converted_amount,
            target_token=self.inner_token_symbol,
            app_wallet_id=(await self.app_wallets.get_deposit_wallet()).id,
        )

        transaction = CreateTransactionDTO(
            amount=blockchain_tx.amount,
            user_id=deposit.user.id,
            tx_id=blockchain_tx.tx_id,
            type=TransactionType.SWAP,
            sender=blockchain_tx.from_address,
            recipient=blockchain_tx.to_address,
        )

        await self.transaction_repository.create(transaction)
