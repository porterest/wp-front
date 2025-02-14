import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from apscheduler.schedulers.base import BaseScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from pytoniq_core import Address

from abstractions.repositories.chain import ChainRepositoryInterface
from abstractions.repositories.pair import PairRepositoryInterface
from abstractions.services.app_wallet import AppWalletServiceInterface
from abstractions.services.block import BlockServiceInterface
from abstractions.services.chain import ChainServiceInterface
from abstractions.services.deposit import DepositServiceInterface
from abstractions.services.inner_token import InnerTokenInterface
from abstractions.services.liquidity_management import LiquidityManagerInterface
from abstractions.services.math.pool_service import PoolServiceInterface
from abstractions.services.orchestrator import OrchestratorServiceInterface
from abstractions.services.tonclient import TonClientInterface
from domain.dto.chain import CreateChainDTO, UpdateChainDTO
from domain.enums.chain_status import ChainStatus
from domain.enums.liquidity_action import LiquidityActionType
from domain.models.block import Block
from domain.models.chain import Chain
from domain.models.reward_model import Rewards
from infrastructure.db.entities import BlockStatus
from services import SingletonMeta
from services.exceptions import StopPairProcessingException
from services.ton.client.base import AbstractBaseTonClient
from settings import InnerTokenSettings

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
    orchestrator_service: OrchestratorServiceInterface
    deposit_service: DepositServiceInterface
    liquidity_manager: LiquidityManagerInterface
    ton_client: TonClientInterface
    inner_token: InnerTokenSettings
    app_wallet_service: AppWalletServiceInterface
    pool_service: PoolServiceInterface
    inner_token_service: InnerTokenInterface
    inner_token_symbol: str
    block_generation_interval: timedelta = timedelta(minutes=10)
    transaction_check_interval: timedelta = timedelta(minutes=0.5)
    connect_pool_interval: timedelta = timedelta(minutes=4)  # hours=6

    async def start_block_generation(self):
        """
        Запускает процесс генерации блоков каждые 10 минут.
        """
        await self._start_chains()
        self.scheduler.start()
        self._add_generation_job()
        self._add_transaction_check_job()
        # self._add_pool_job()
        logger.info("Сервис генерации блоков запущен.")

    def _add_generation_job(self):
        self.scheduler.add_job(
            self._generate_new_blocks,
            trigger=DateTrigger(run_date=datetime.now() + timedelta(seconds=self.block_generation_interval.seconds)),
            id="block_generation",
            replace_existing=True,
            misfire_grace_time=None,  # noqa
        )

    def _add_pool_job(self):
        self.scheduler.add_job(
            self._connect_pool,
            trigger=IntervalTrigger(seconds=self.connect_pool_interval.seconds),
            id="connect_pool",
            replace_existing=True,
            misfire_grace_time=None,  # noqa
        )

    def _add_transaction_check_job(self):
        logger.info('start transaction check')
        self.scheduler.add_job(
            self.deposit_service.check_users_transactions,
            trigger=IntervalTrigger(seconds=self.transaction_check_interval.seconds),
            misfire_grace_time=None,  # noqa
            id="transaction_check",
            replace_existing=True,
        )

    async def _start_chains(self):
        """
        Инициализирует цепочки и обеспечивает генерацию блоков для активных цепочек.
        """
        logger.info("Начало генерации цепочек.")

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
                logger.info(f"Создана новая цепочка для пары {pair.id}: {chain}")
            else:
                await self._handle_interrupted_chain(chain.id)

            await self.block_service.start_new_block(chain.id)

    async def _handle_interrupted_chain(self, chain_id: UUID) -> None:
        interrupted_block = await self.block_service.get_last_block(chain_id)
        if not interrupted_block:
            return

        if interrupted_block.status == BlockStatus.COMPLETED:
            raise BaseException(f'Last block ({interrupted_block.id}) in interrupted chain {chain_id} is completed')  # noqa

        await self.block_service.handle_interrupted_block(interrupted_block.id)

    async def _generate_new_blocks(self):
        """
        Генерирует новые блоки и обрабатывает завершённые блоки для всех активных цепочек.
        """
        logger.info(f"Начало генерации блоков в {datetime.now()}.")
        try:
            chains = await self.chain_repository.get_all()
            for chain in chains:
                if chain.status == ChainStatus.PAUSED:
                    continue

                last_block = await self.block_service.get_last_block(chain.id)

                if last_block:
                    elapsed_time = (datetime.now() - last_block.created_at).seconds + 1
                    # logger.info(f'elapsed_time {elapsed_time}, block {last_block.id}, status {last_block.status}')
                    if (elapsed_time >= self.block_generation_interval.total_seconds()
                            and last_block.status == BlockStatus.IN_PROGRESS):
                        try:
                            rewards = await self._process_completed_block(last_block)
                        except StopPairProcessingException:
                            await self._pause_chain(chain)
                            continue
                    else:
                        # logger.error(f"Chain {chain.id} integrity is broken")
                        continue

                new_block = await self.block_service.start_new_block(chain.id)
                if last_block:
                    await self.block_service.process_completed_block(
                        block=last_block,
                        new_block_id=new_block.id,
                        rewards=rewards,  # noqa
                    )
                update_chain = UpdateChainDTO(
                    current_block=new_block.block_number
                )
                await self.chain_repository.update(chain.id, update_chain)
                self._add_generation_job()
        except Exception:
            logger.error('Something went wrong during block generation', exc_info=True)
            raise

    async def _process_completed_block(self, block: Block) -> Rewards:
        """
        Обрабатывает завершённый блок, распределяет результаты и обновляет данные.
        """
        logger.info(f"Обработка завершённого блока {block.block_number}.")
        await self.block_service.complete_block(block.id)
        try:
            result = await self.orchestrator_service.process_block(block_id=block.id)
        except StopPairProcessingException:
            logger.error('Stopping pair')
            raise

        logger.info(f"Завершённый блок {block.block_number} успешно обработан.")
        return result.rewards

    async def stop_block_generation(self):
        """
        Останавливает процесс генерации блоков.
        """

        chains = await self.chain_repository.get_all()
        for chain in chains:
            await self._stop_chain(chain)

        # self.scheduler.remove_job("block_generation")
        self.scheduler.shutdown()
        logger.info("Сервис генерации блоков остановлен.")

    async def _stop_chain(self, chain: Chain):
        current_block = await self.block_service.get_last_block(chain.id)
        await self.block_service.handle_interrupted_block(current_block.id)


    async def _connect_pool(self):  # disabled
        logger.info('hui')
        chains = await self.chain_repository.get_all()
        for chain in chains:
            logger.info(f"syncing pool {chain.pair.name}")
            pool_state = await self.ton_client.get_pool_reserves(pool_address=Address(chain.pair.contract_address))
            block = await self.block_service.get_last_completed_block_by_pair_id(chain.pair_id)
            logger.info(f'ps {pool_state}')

            predicted_price = block.result_vector[0]
            logger.info(predicted_price)

            pair_tokens = chain.pair.name.split('/')
            other_token_symbol = (set(pair_tokens) - {self.inner_token_symbol}).pop()

            pool_state_dict = {other_token_symbol: pool_state[0], self.inner_token_symbol: pool_state[1]}
            logger.info(pool_state_dict)

            action = await self.liquidity_manager.decide_liquidity_action(pool_state_dict, predicted_price)

            inner_token_state = action.states.get(self.inner_token_symbol)

            if action.action == LiquidityActionType.ADD and inner_token_state and inner_token_state.delta > 0:
                liquidity_mint = inner_token_state.delta
            else:
                liquidity_mint = 0

            if liquidity_mint > 0:
                try:
                    await self.inner_token_service.mint(amount=liquidity_mint)
                except Exception as e:
                    logger.error(f"not minted {liquidity_mint}", exc_info=True)

            logger.info(f'states: {action.states}')
            ton_amount = AbstractBaseTonClient.to_nano(action.states.get(other_token_symbol).delta)
            jetton_amount = AbstractBaseTonClient.to_nano(action.states.get(self.inner_token.symbol).delta)
            if action.action == LiquidityActionType.ADD:
                await self.ton_client.provide_liquidity(
                    ton_amount=ton_amount,
                    jetton_amount=jetton_amount,
                    pool_address=chain.pair.contract_address,
                    admin_wallet=await self.app_wallet_service.get_withdraw_wallet()
                )
            elif action.action == LiquidityActionType.REMOVE:
                await self.ton_client.remove_liquidity(
                    ton_amount=abs(ton_amount),
                    jetton_amount=abs(jetton_amount),
                    pool_address=chain.pair.contract_address,
                    admin_wallet=await self.app_wallet_service.get_withdraw_wallet()
                )
            logger.info(f'Pool states:\nold: {pool_state}\nnew: {action.states}')

    async def get_by_pair_id(self, pair_id: UUID) -> Chain:
        return await self.chain_repository.get_by_pair_id(pair_id)

    async def _pause_chain(self, chain: Chain) -> None:
        await self._stop_chain(chain)
        dto = UpdateChainDTO(
            status=ChainStatus.PAUSED,
        )

        await self.chain_repository.update(chain.id, dto)
