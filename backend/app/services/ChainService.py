import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from uuid import UUID

from apscheduler.schedulers.base import BaseScheduler
from apscheduler.triggers.interval import IntervalTrigger

from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.pair import PairRepositoryInterface
from abstractions.services.bet import BetServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.chain import ChainServiceInterface
from domain.dto.block import CreateBlockDTO
from domain.dto.chain import CreateChainDTO
from domain.enums.chain_status import ChainStatus
from domain.metaholder.responses.block_state import BlockStateResponse
from domain.models.block import Block
from infrastructure.db.entities import BlockStatus
from services import SingletonMeta
from services.exceptions import NotFoundException
from domain.models.chain import Chain

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
        await self._start_chains()
        self.scheduler.add_job(
            self._generate_new_blocks,
            trigger=IntervalTrigger(seconds=self.block_generation_interval.seconds),
            id="block_generation",
            replace_existing=True,
        )
        self.scheduler.start()
        self.logger.info("Block generation service started.")

    async def _start_chains(self):
        """
        Запускает процесс блокогенерации каждые 10 минут.
        """
        await self._generate_new_chains()
        await self._generate_new_blocks()

    async def _generate_new_chains(self):
        """
        Основная логика генерации нового чейна.
        """
        self.logger.info(f"Chain generation started")

        pairs = await self.pair_repository.get_all()
        for pair in pairs:
            chain = await self.chain_repository.get_by_pair_id(pair.id)
            logger.info(chain)
            if not chain:
                chain = CreateChainDTO(
                    current_block=1,
                    pair_id=pair.id,
                    status=ChainStatus.ACTIVE,
                    created_at=datetime.now()
                )
                await self.chain_repository.create(chain)
                self.logger.info(f"Chain {chain} created ")

    async def _generate_new_blocks(self):
        """
        Основная логика генерации нового блока.
        """
        self.logger.info(f"Block generation started at {datetime.now()}")
        chains = await self.chain_repository.get_all()
        for chain in chains:
            # Получаем последний блок
            last_block = await self.block_service.get_last_block(chain.id)
            # Если последний блок был прерван, обрабатываем его
            if last_block and last_block.status == BlockStatus.IN_PROGRESS:
                await self._handle_interrupted_block(last_block)
            if not last_block:
                await self._create_new_block(chain)

    async def _handle_interrupted_block(self, block: Block):
        """
        Обрабатывает прерванный блок.
        """
        self.logger.info(f"Handling interrupted block: {block.block_number}")
        await self.block_service.handle_interrupted_block(block=block)

    async def _create_new_block(self, chain: Chain):
        """
        Создаёт новый блок и сохраняет его в базе данных.
        """

        # Устанавливаем время начала блока
        self.local_start_time = datetime.now()

        last_block = await self.block_service.get_last_block(chain.id)
        new_block_number = last_block.block_number + 1 if last_block else 1
        # Создаём запись нового блока в базе данных
        new_block_dto = CreateBlockDTO(
            block_number=new_block_number,
            chain_id=chain.id,
            status=BlockStatus.IN_PROGRESS,
            result_vector=None,
            created_at=self.local_start_time,
        )
        logger.info(asdict(new_block_dto))
        await self.block_service.create(new_block_dto)
        self.logger.info(f"New block {new_block_number} {chain.pair_id} created at {self.local_start_time}.")

    async def get_current_block_state(self, pair_id: UUID) -> BlockStateResponse:
        """
        Возвращает текущее состояние текущего блока, включая таймер для фронта.
        """
        try:
            last_block = await self.block_service.get_last_block(pair_id)
            logger.info(f"ПРОШЛЫЙ УЕБАНСКИЙ БЛОК {last_block}")
            elapsed_time = (datetime.now() - last_block.created_at).total_seconds()
            remaining_time = max(0, self.block_generation_interval.seconds - int(elapsed_time))

            self.logger.info(
                f"Current block state: "
                f"Block number {last_block.block_number}, "
                f"Status {last_block.status}, "
                f"Remaining time: {remaining_time}s."
            )

            return BlockStateResponse(
                block_id=last_block.id,
                server_time=str(datetime.now()),
                current_block=last_block.block_number,
                remaining_time_in_block=int(remaining_time),
            )

        except NotFoundException:
            self.logger.error(f"No one block bro", exc_info=True)
            raise

    async def stop_block_generation(self):
        """
        Останавливает процесс блокогенерации.
        """
        self.scheduler.remove_job("block_generation")
        self.scheduler.shutdown()
        self.logger.info("Block generation service stopped.")

    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        return await self.chain_repository.get_by_pair_id(pair_id)
