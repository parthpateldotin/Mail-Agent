import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709595600000 implements MigrationInterface {
  name = 'InitialSchema1709595600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('user', 'admin')
    `);

    await queryRunner.query(`
      CREATE TYPE "system_folder_type_enum" AS ENUM (
        'inbox',
        'sent',
        'drafts',
        'trash',
        'spam',
        'archive'
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID DEFAULT uuid_generate_v4(),
        "email" VARCHAR NOT NULL UNIQUE,
        "name" VARCHAR NOT NULL,
        "password" VARCHAR NOT NULL,
        "avatar" VARCHAR,
        "role" user_role_enum NOT NULL DEFAULT 'user',
        "is_verified" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "refresh_token" VARCHAR,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id")
      )
    `);

    // Create settings table
    await queryRunner.query(`
      CREATE TABLE "settings" (
        "id" UUID DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL UNIQUE,
        "email_settings" JSONB NOT NULL DEFAULT '{}',
        "ai_settings" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create folders table
    await queryRunner.query(`
      CREATE TABLE "folders" (
        "id" UUID DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "name" VARCHAR NOT NULL,
        "system_type" system_folder_type_enum,
        "color" VARCHAR,
        "order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create emails table
    await queryRunner.query(`
      CREATE TABLE "emails" (
        "id" UUID DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "sender" JSONB NOT NULL,
        "to" JSONB NOT NULL,
        "cc" JSONB,
        "bcc" JSONB,
        "subject" VARCHAR NOT NULL,
        "content" TEXT NOT NULL,
        "attachments" JSONB,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "is_starred" BOOLEAN NOT NULL DEFAULT false,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "is_draft" BOOLEAN NOT NULL DEFAULT false,
        "analytics" JSONB,
        "scheduled_for" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("id"),
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create email_folders junction table
    await queryRunner.query(`
      CREATE TABLE "email_folders" (
        "email_id" UUID NOT NULL,
        "folder_id" UUID NOT NULL,
        PRIMARY KEY ("email_id", "folder_id"),
        FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE,
        FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_users_email" ON "users"("email");
      CREATE INDEX "idx_emails_user_id" ON "emails"("user_id");
      CREATE INDEX "idx_emails_created_at" ON "emails"("created_at");
      CREATE INDEX "idx_folders_user_id" ON "folders"("user_id");
      CREATE INDEX "idx_email_folders_email_id" ON "email_folders"("email_id");
      CREATE INDEX "idx_email_folders_folder_id" ON "email_folders"("folder_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "email_folders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emails"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "folders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "system_folder_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
} 