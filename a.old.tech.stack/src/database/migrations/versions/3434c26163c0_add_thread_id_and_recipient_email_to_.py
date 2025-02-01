"""Add thread_id and recipient_email to ConversationMessage

Revision ID: 3434c26163c0
Revises: 
Create Date: 2025-01-29 00:15:23.456789

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '3434c26163c0'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create enum type
    op.execute("DROP TYPE IF EXISTS messagedirection")
    op.execute("CREATE TYPE messagedirection AS ENUM ('incoming', 'outgoing')")
    
    # Create table with all columns
    op.create_table(
        'conversation_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_email', sa.String(length=255), nullable=False),
        sa.Column('recipient_email', sa.String(length=255), nullable=True),
        sa.Column('message_id', sa.String(length=255), nullable=False),
        sa.Column('thread_id', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('direction', sa.Enum('incoming', 'outgoing', name='messagedirection'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id', name='uq_conversation_messages_message_id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_conversation_messages_id'), 'conversation_messages', ['id'], unique=False)
    op.create_index(op.f('ix_conversation_messages_sender_email'), 'conversation_messages', ['sender_email'], unique=False)
    op.create_index(op.f('ix_conversation_messages_recipient_email'), 'conversation_messages', ['recipient_email'], unique=False)
    op.create_index(op.f('ix_conversation_messages_thread_id'), 'conversation_messages', ['thread_id'], unique=False)

def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_conversation_messages_thread_id'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_sender_email'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_recipient_email'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_id'), table_name='conversation_messages')
    
    # Drop the table
    op.drop_table('conversation_messages')
    
    # Drop enum type
    op.execute("DROP TYPE messagedirection") 