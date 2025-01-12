import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from apscheduler.schedulers.base import BaseScheduler
from apscheduler.triggers.interval import IntervalTrigger

from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.pair import PairRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.chain import ChainServiceInterface
from abstractions.services.orchestrator import OrchestratorServiceInterface
from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.enums.chain_status import ChainStatus
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.block import Block
from domain.models.chain import Chain
from infrastructure.db.entities import BlockStatus
from services import SingletonMeta
from services.exceptions import NotFoundException, StopPairProcessingException

logger = logging.getLogger(__name__)

@dataclass
class ChainService(
    ChainServiceInterface,
    metaclass=SingletonMeta,
):
    scheduler: BaseScheduler
    block_service: BlockServiceInterface
    chain_repository: ChainRepositoryInterface
    pair_repository: PairRepositoryInterface
    bet_service: BetServiceInterface
    orchestrator_service: OrchestratorServiceInterface

    block_generation_interval: timedelta = timedelta(minutes=1.5)
    logger = logging.getLogger(__name__)

    def __post_init__(self):
        self.logger = logging.getLogger("ChainService")
        logging.basicConfig(level=logging.INFO)

    async def start_block_generation(self):
        """
        Запускает процесс генерации блоков каждые 10 минут.
        """
        await self._start_chains()
        self.scheduler.add_job(
            self._generate_new_blocks,
            trigger=IntervalTrigger(seconds=self.block_generation_interval.seconds),
            id="block_generation",
            replace_existing=True,
        )
        self.scheduler.start()
        self.logger.info("Сервис генерации блоков запущен.")

    async def _start_chains(self):
        """
        Инициализирует цепочки и обеспечивает генерацию блоков для активных цепочек.
        """
        self.logger.info("Начало генерации цепочек.")

        pairs = await self.pair_repository.get_all()
        for pair in pairs:
            chain = await self.chain_repository.get_by_pair_id(pair.id)
            if not chain:
                chain = CreateChainDTO(
                    current_block=1,
                    pair_id=pair.id,
                    status=ChainStatus.ACTIVE,
                    created_at=datetime.now()
                )
                await self.chain_repository.create(chain)
                self.logger.info(f"Создана новая цепочка для пары {pair.id}: {chain}")
            else:
                await self.handle_interrupted_chain(chain.id)

            await self.block_service.start_new_block(chain.id)

    async def handle_interrupted_chain(self, chain_id: UUID) -> None:
        interrupted_block = await self.block_service.get_last_block(chain_id)
        if not interrupted_block:
            return

        if interrupted_block.status == BlockStatus.COMPLETED:
            raise BaseException(f'Last block ({interrupted_block.id}) in interrupted chain {chain_id} is completed')

        await self.block_service.handle_interrupted_block(interrupted_block.id)

    async def _generate_new_blocks(self):
        """
        Генерирует новые блоки и обрабатывает завершённые блоки для всех активных цепочек.
        """
        self.logger.info(f"Начало генерации блоков в {datetime.now()}.")
        try:
            chains = await self.chain_repository.get_all()
            for chain in chains:
                if chain.status == ChainStatus.PAUSED:
                    continue

                last_block = await self.block_service.get_last_block(chain.id)

                if last_block:
                    elapsed_time = (datetime.now() - last_block.created_at).seconds + 1
                    self.logger.info(f'elapsed_time {elapsed_time}, block {last_block.id}')
                    if (elapsed_time >= self.block_generation_interval.total_seconds()
                            and last_block.status == BlockStatus.IN_PROGRESS):
                        try:
                            await self._process_completed_block(last_block)
                        except StopPairProcessingException:
                            await self._pause_chain(chain)
                            continue

                new_block = await self.block_service.start_new_block(chain.id)
                update_chain = UpdateChainDTO(
                    current_block=new_block.block_number
                )
                await self.chain_repository.update(chain.id, update_chain)
        except Exception:
            logger.error('Something went wrong during block generation', exc_info=True)
            raise

    async def _process_completed_block(self, block: Block):
        """
        Обрабатывает завершённый блок, распределяет результаты и обновляет данные.
        """
        self.logger.info(f"Обработка завершённого блока {block.block_number}.")
        await self.block_service.complete_block(block.id)
        try:
            await self.orchestrator_service.process_block(block_id=block.id)
        except StopPairProcessingException:
            logger.error('Stopping pair')
            raise

        self.logger.info(f"Завершённый блок {block.block_number} успешно обработан.")

    async def stop_block_generation(self):
        """
        Останавливает процесс генерации блоков.
        """

        chains = await self.chain_repository.get_all()
        for chain in chains:
            await self._stop_chain(chain)

        self.scheduler.remove_job("block_generation")
        self.scheduler.shutdown()
        self.logger.info("Сервис генерации блоков остановлен.")

    async def _stop_chain(self, chain: Chain):
        current_block = await self.block_service.get_last_block(chain.id)
        self.logger.info(f'{current_block}, мяу мяу')
        await self.block_service.handle_interrupted_block(current_block.id)
        self.logger.info('хендл мяу')

    async def get_current_block_state(self, pair_id: UUID) -> BlockStateResponse:
        """
        Возвращает текущее состояние блока, включая таймер для фронтенда.
        """
        try:
            last_block = await self.block_service.get_last_block_by_pair_id(pair_id)
            elapsed_time = (datetime.now() - last_block.created_at).total_seconds()
            remaining_time = max(0.0, self.block_generation_interval.total_seconds() - elapsed_time)

            self.logger.info(
                f"Текущее состояние блока: "
                f"Номер блока {last_block.block_number}, "
                f"Статус {last_block.status}, "
                f"Оставшееся время: {remaining_time} сек."
            )

            return BlockStateResponse(
                block_id=last_block.id,
                server_time=str(datetime.now()),
                current_block=last_block.block_number,
                remaining_time_in_block=int(remaining_time),
            )

        except NotFoundException:
            self.logger.error("Блок для пары не найден", exc_info=True)
            raise

    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        return await self.chain_repository.get_by_pair_id(pair_id)

    async def _pause_chain(self, chain: Chain) -> None:
        await self._stop_chain(chain)
        dto = UpdateChainDTO(
            status=ChainStatus.PAUSED,
        )

        await self.chain_repository.update(chain.id, dto)
