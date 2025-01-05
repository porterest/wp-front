from dataclasses import dataclass
from abstractions.services.dex import DexServiceInterface
from abstractions.services.math.aggregate_bets import AggregateBetsServiceInterface
from uuid import UUID

@dataclass
class PoolStateService:
    dex_service: DexServiceInterface
    aggregate_bets_service: AggregateBetsServiceInterface

    async def get_current_pool_state(self) -> dict:
        """
        Получает текущее состояние пула через DexService.
        :return: Словарь с балансами токенов в пуле.
        """
        return await self.dex_service.get_pool_state()

    async def calculate_target_pool_state(self, block_id: UUID) -> dict:
        """
        Рассчитывает целевое состояние пула на основе агрегированных ставок.
        :param block_id: ID блока, для которого нужно рассчитать целевое состояние.
        :return: Словарь с целевыми балансами токенов.
        """
        # Получаем агрегированные ставки (агрегированные вектора)
        aggregated_vector = await self.aggregate_bets_service.aggregate_bets(block_id)

        # Используем агрегированные значения для расчета целевого состояния пула
        target_pool_state = {
            "token_x": aggregated_vector[0],  # Целевой баланс токена X
            "token_y": aggregated_vector[1],  # Целевой баланс токена Y
        }
        return target_pool_state

    async def calculate_pool_state_delta(self, current_state: dict, target_state: dict) -> dict:
        """
        Вычисляет дельту между текущим и целевым состоянием пула.
        :param current_state: Текущее состояние пула (балансы токенов).
        :param target_state: Целевое состояние пула.
        :return: Словарь с дельтами для каждого токена.
        """
        delta = {
            "delta_x": target_state["token_x"] - current_state["token_x"],
            "delta_y": target_state["token_y"] - current_state["token_y"],
        }
        return delta


# import asyncio
# from uuid import uuid4
#
# # Mock реализации интерфейсов для тестирования
# class MockDexService(DexServiceInterface):
#     async def get_pool_state(self):
#         return {"token_x": 1000, "token_y": 2000}
#
# class MockAggregateBetsService(AggregateBetsServiceInterface):
#     async def aggregate_bets(self, block_id):
#         return 1200, 1800  # Пример агрегированных значений
#
# # Тестирование сервиса
# async def main():
#     dex_service = MockDexService()
#     aggregate_bets_service = MockAggregateBetsService()
#     pool_state_service = PoolStateService(dex_service, aggregate_bets_service)
#
#     # Получаем текущее состояние пула
#     current_state = await pool_state_service.get_current_pool_state()
#     print("Current Pool State:", current_state)
#
#     # Рассчитываем целевое состояние пула
#     block_id = uuid4()  # Пример блока
#     target_state = await pool_state_service.calculate_target_pool_state(block_id)
#     print("Target Pool State:", target_state)
#
#     # Вычисляем дельту состояний
#     delta = await pool_state_service.calculate_pool_state_delta(current_state, target_state)
#     print("Pool State Delta:", delta)
#
# # Запуск примера
# asyncio.run(main())

