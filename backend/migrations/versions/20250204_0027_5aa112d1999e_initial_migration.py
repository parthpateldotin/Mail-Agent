"""Initial migration

Revision ID: 5aa112d1999e
Revises: 5bf89335ddc6
Create Date: 2025-02-04 00:27:09.439397+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5aa112d1999e"
down_revision: Union[str, None] = "5bf89335ddc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
