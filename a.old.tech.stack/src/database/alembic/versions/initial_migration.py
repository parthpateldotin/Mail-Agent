"""initial migration

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2024-01-28 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from models.conversation_messages import MessageDirection

# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create conversation_messages table
    op.create_table('conversation_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_email', sa.String(length=255), nullable=False),
        sa.Column('message_id', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('direction', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id')
    )
    op.create_index(op.f('ix_conversation_messages_id'), 'conversation_messages', ['id'], unique=False)
    op.create_index(op.f('ix_conversation_messages_sender_email'), 'conversation_messages', ['sender_email'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_conversation_messages_sender_email'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_id'), table_name='conversation_messages')
    op.drop_table('conversation_messages') 