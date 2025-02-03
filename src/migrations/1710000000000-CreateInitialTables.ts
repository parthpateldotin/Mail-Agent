import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1710000000000 implements MigrationInterface {
  name = 'CreateInitialTables1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('admin', 'agent', 'viewer')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "hashedPassword" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'agent',
        "isActive" boolean NOT NULL DEFAULT true,
        "lastLoginAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "preferences" jsonb,
        "permissions" text[] DEFAULT array[]::text[]
      )
    `);

    // Create email_attachments table
    await queryRunner.query(`
      CREATE TABLE "email_attachments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "emailId" uuid,
        "filename" varchar NOT NULL,
        "contentType" varchar NOT NULL,
        "size" bigint NOT NULL,
        "path" varchar NOT NULL,
        "checksum" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "metadata" jsonb
      )
    `);

    // Create emails table
    await queryRunner.query(`
      CREATE TYPE "email_status_enum" AS ENUM (
        'received', 'parsed', 'analyzed', 'generating_response',
        'response_ready', 'sending', 'sent', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "emails" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "messageId" varchar NOT NULL,
        "from" varchar NOT NULL,
        "to" text[] NOT NULL,
        "subject" varchar NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb NOT NULL,
        "processingInfo" jsonb NOT NULL,
        "status" "email_status_enum" NOT NULL DEFAULT 'received',
        "threadId" varchar,
        "assignedToId" uuid,
        "context" jsonb,
        "isArchived" boolean NOT NULL DEFAULT false,
        "isSpam" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "lastResponseAt" timestamp,
        "labels" text[] DEFAULT array[]::text[],
        "responseCount" integer NOT NULL DEFAULT 0,
        "customFields" jsonb,
        CONSTRAINT "fk_assigned_to" FOREIGN KEY ("assignedToId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create email_responses table
    await queryRunner.query(`
      CREATE TYPE "email_response_status_enum" AS ENUM (
        'draft', 'ready', 'sent', 'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "email_responses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "emailId" uuid NOT NULL,
        "inReplyTo" varchar NOT NULL,
        "subject" varchar NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb NOT NULL,
        "context" jsonb NOT NULL,
        "status" "email_response_status_enum" NOT NULL DEFAULT 'draft',
        "sentAt" timestamp,
        "error" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "customFields" jsonb,
        CONSTRAINT "fk_email" FOREIGN KEY ("emailId")
          REFERENCES "emails"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_emails_message_id" ON "emails"("messageId");
      CREATE INDEX "idx_emails_status" ON "emails"("status");
      CREATE INDEX "idx_emails_created_at" ON "emails"("createdAt");
      CREATE INDEX "idx_emails_thread_id" ON "emails"("threadId");
      CREATE INDEX "idx_email_responses_email_id" ON "email_responses"("emailId");
      CREATE INDEX "idx_email_attachments_email_id" ON "email_attachments"("emailId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "idx_emails_message_id"`);
    await queryRunner.query(`DROP INDEX "idx_emails_status"`);
    await queryRunner.query(`DROP INDEX "idx_emails_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_emails_thread_id"`);
    await queryRunner.query(`DROP INDEX "idx_email_responses_email_id"`);
    await queryRunner.query(`DROP INDEX "idx_email_attachments_email_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "email_responses"`);
    await queryRunner.query(`DROP TABLE "email_attachments"`);
    await queryRunner.query(`DROP TABLE "emails"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "email_response_status_enum"`);
    await queryRunner.query(`DROP TYPE "email_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
} 