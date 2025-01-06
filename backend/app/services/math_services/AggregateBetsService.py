from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from abstractions.services.block import BlockServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from domain.models.bet import BetVector


@dataclass
class AggregateBetsService(AggregateBetsServiceInterface):
    block_service: BlockServiceInterface

    async def aggregate_bets(
            self,
            block_id: UUID,
    ) -> BetVector:
        # Получаем ставки для указанного блока
        block = await self.block_service.get_block(block_id)

        # Инициализация агрегированных значений
        total_weight = 0
        aggregate_x: float = .0
        aggregate_y: int = 0

        # Агрегируем значения с учётом веса (суммы ставки)
        for bet in block.bets:
            weight = bet['amount']  # Сумма ставки пользователя
            total_weight += weight
            aggregate_x += bet.vector[0] * weight
            aggregate_y += bet.vector[1] * weight

        # Нормализация агрегированных значений
        if total_weight > 0:
            aggregate_x /= total_weight
            aggregate_y /= total_weight

        # Формируем итоговый кватернион
        aggregated_quaternion = aggregate_x, aggregate_y

        return aggregated_quaternion
