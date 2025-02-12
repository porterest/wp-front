"""wallet_version required

Revision ID: fe42a597af87
Revises: 36b0f5fb89c0
Create Date: 2025-01-22 01:51:58.450521

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fe42a597af87'
down_revision: Union[str, None] = '36b0f5fb89c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('app_wallets', 'wallet_version',
                    existing_type=postgresql.ENUM('V4R2', 'V5R1', name='appwalletversion'),
                    nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('app_wallets', 'wallet_version',
                    existing_type=postgresql.ENUM('V4R2', 'V5R1', name='appwalletversion'),
                    nullable=True)
    # ### end Alembic commands ###
