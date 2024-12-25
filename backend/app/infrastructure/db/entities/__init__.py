from datetime import datetime
from typing import Optional, List
from uuid import UUID as pyUUID

from sqlalchemy import ForeignKey, Enum as SQLEnum, BigInteger, UUID
from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped, mapped_column

from domain.enums import BetStatus, TransactionType, WalletType
from domain.enums.block_status import BlockStatus
from domain.enums.chain_status import ChainStatus
from domain.enums.deposit import DepositEntryStatus
from domain.models.bet import BetVector

Base = declarative_base()


class AbstractBase(Base):
    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class User(AbstractBase):
    __tablename__ = 'users'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(255))
    last_name: Mapped[Optional[str]] = mapped_column(String(255))
    last_activity: Mapped[Optional[datetime]]

    balance: Mapped[float]

    wallet_address: Mapped[Optional[str]]

    bets = relationship("Bet", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    deposits = relationship('DepositEntry', back_populates='user')


class Bet(AbstractBase):
    __tablename__ = 'bets'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[pyUUID] = mapped_column(ForeignKey('users.id'))
    pair_id: Mapped[pyUUID] = mapped_column(ForeignKey('pairs.id'), index=True)
    amount: Mapped[float]
    block_number: Mapped[int] = mapped_column(index=True)
    vector: Mapped[BetVector] = mapped_column(JSONB)
    status: Mapped[BetStatus] = mapped_column(SQLEnum(BetStatus), default=BetStatus.PENDING)

    user = relationship("User", back_populates="bets")
    pair = relationship("Pair", back_populates="bets")


class Transaction(AbstractBase):
    __tablename__ = 'transactions'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tx_id: Mapped[Optional[str]] = mapped_column(unique=True)
    user_id: Mapped[pyUUID] = mapped_column(ForeignKey('users.id'))
    type: Mapped[TransactionType] = mapped_column(SQLEnum(TransactionType), index=True)
    amount: Mapped[float]

    sender: Mapped[str]
    recipient: Mapped[str]

    user = relationship("User", back_populates="transactions")


class Pair(AbstractBase):
    __tablename__ = 'pairs'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    contract_address: Mapped[str] = mapped_column(String(255), unique=True)
    last_ratio: Mapped[float]

    bets = relationship("Bet", back_populates="pair")


class AppWallet(AbstractBase):
    __tablename__ = 'app_wallets'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    address: Mapped[str] = mapped_column(String(255))
    wallet_type: Mapped[WalletType] = mapped_column(SQLEnum(WalletType))
    balance: Mapped[float]

    deposits = relationship("DepositEntry", back_populates="app_wallet")


class DepositEntry(AbstractBase):
    __tablename__ = 'deposit_entries'

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    app_wallet_id: Mapped[pyUUID] = mapped_column(ForeignKey('app_wallets.id'))
    user_id: Mapped[pyUUID] = mapped_column(ForeignKey('users.id'))

    status: Mapped[DepositEntryStatus] = mapped_column(SQLEnum(DepositEntryStatus))

    transaction_id: Mapped[Optional[pyUUID]] = mapped_column(ForeignKey('transactions.id'), nullable=True)

    app_wallet: Mapped['AppWallet'] = relationship("AppWallet", back_populates="deposits")
    user: Mapped['User'] = relationship('User', back_populates='deposits')
    transaction: Mapped['Transaction'] = relationship('Transaction')


class Block(AbstractBase):
    __tablename__ = "blocks"

    id: Mapped[pyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    block_number: Mapped[int] = mapped_column(unique=True)
    status: Mapped[BlockStatus] = mapped_column(SQLEnum(BlockStatus), default=BlockStatus.IN_PROGRESS)
    result_vector: Mapped[Optional[BetVector]] = mapped_column(JSONB)

    completed_at: Mapped[Optional[datetime]] = mapped_column()

    chain_id: Mapped[pyUUID] = mapped_column(ForeignKey('chains.id'))

    chain: Mapped['Chain'] = relationship("Chain", back_populates='blocks')
    bets: Mapped[List["Bet"]] = relationship("Bet", back_populates="block")


class Chain(Base):
    __tablename__ = "chains"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    current_block: Mapped[int]
    status: Mapped[ChainStatus] = mapped_column(SQLEnum(ChainStatus), default=ChainStatus.ACTIVE)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    blocks: Mapped[List[Block]] = relationship("Block", back_populates='chain')
