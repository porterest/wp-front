import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from apscheduler.schedulers.base import BaseScheduler
from apscheduler.triggers.interval import IntervalTrigger

from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.chain import ChainServiceInterface
from domain.dto.block import CreateBlockDTO
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.block import Block
from infrastructure.db.entities import BlockStatus
from services import SingletonMeta
from services.exceptions import NotFoundException


@dataclass
class ChainService(
    ChainServiceInterface,
    metaclass=SingletonMeta,
):
    scheduler: BaseScheduler
    block_service: BlockServiceInterface

    bet_service: BetServiceInterface
    local_start_time: datetime = None

    block_generation_interval: timedelta = timedelta(minutes=10)
    logger = logging.getLogger(__name__)

    def __post_init__(self):
        self.logger = logging.getLogger("ChainService")
        logging.basicConfig(level=logging.INFO)

    async def start_block_generation(self):
        """
        Запускает процесс блокогенерации каждые 10 минут.
        """
        self.scheduler.add_job(
            self._generate_new_block,
            trigger=IntervalTrigger(seconds=self.block_generation_interval.seconds),
            id="block_generation",
            replace_existing=True,
        )
        self.scheduler.start()
        self.logger.info("Block generation service started.")

    async def _generate_new_block(self):
        """
        Основная логика генерации нового блока.
        """
        self.logger.info(f"Block generation started at {datetime.now()}")

        # Получаем последний блок
        last_block = await self.block_service.get_last_block()

        # Если последний блок был прерван, обрабатываем его
        if last_block and last_block.status == BlockStatus.IN_PROGRESS:
            await self._handle_interrupted_block(last_block)

        # Создаём новый блок
        await self._create_new_block()

    async def _handle_interrupted_block(self, block: Block):
        """
        Обрабатывает прерванный блок.
        """
        self.logger.info(f"Handling interrupted block: {block.block_number}")
        await self.block_service.handle_interrupted_block(block=block)

    async def _create_new_block(self):
        """
        Создаёт новый блок и сохраняет его в базе данных.
        """
        last_block = await self.block_service.get_last_block()
        new_block_number = last_block.block_number + 1 if last_block else 1

        # Устанавливаем время начала блока
        self.local_start_time = datetime.now()

        # Создаём запись нового блока в базе данных
        new_block_dto = CreateBlockDTO(
            block_number=new_block_number,
            status=BlockStatus.IN_PROGRESS,
            result_vector=None,
            created_at=self.local_start_time,
        )
        await self.block_service.create(new_block_dto)
        self.logger.info(f"New block {new_block_number} created at {self.local_start_time}.")

    async def get_current_block_state(self) -> BlockStateResponse:
        """
        Возвращает текущее состояние текущего блока, включая таймер для фронта.
        """
        try:
            last_block = await self.block_service.get_last_block()

            elapsed_time = (datetime.now() - last_block.created_at).total_seconds()
            remaining_time = max(0, self.block_generation_interval.seconds - int(elapsed_time))

            self.logger.info(
                f"Current block state: "
                f"Block number {last_block.block_number}, "
                f"Status {last_block.status}, "
                f"Remaining time: {remaining_time}s."
            )

            return BlockStateResponse(
                server_time=str(datetime.now()),
                current_block=last_block.block_number,
                remaining_time_in_block=int(remaining_time),
            )

        except NotFoundException:
            self.logger.error(f"No one block bro", exc_info=True)
            return BlockStateResponse(
                server_time=str(datetime.now()),
                current_block=-1,
                remaining_time_in_block=None,
            )

    def stop_block_generation(self):
        """
        Останавливает процесс блокогенерации.
        """
        self.scheduler.remove_job("block_generation")
        self.scheduler.shutdown()
        self.logger.info("Block generation service stopped.")
