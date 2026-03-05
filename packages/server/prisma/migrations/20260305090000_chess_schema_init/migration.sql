-- Create enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'ACTIVE', 'FINISHED', 'ABANDONED');
CREATE TYPE "GameResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW', 'ABORTED');

-- Create users table
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "elo_rating" INTEGER NOT NULL DEFAULT 1200,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Create games table
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "white_player_id" UUID NOT NULL,
    "black_player_id" UUID NOT NULL,
    "winner_id" UUID,
    "status" "GameStatus" NOT NULL DEFAULT 'PENDING',
    "time_control" VARCHAR(50) NOT NULL,
    "result" "GameResult",
    "fen_final" TEXT,
    "pgn" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "games_white_player_id_idx" ON "games"("white_player_id");
CREATE INDEX "games_black_player_id_idx" ON "games"("black_player_id");
CREATE INDEX "games_winner_id_idx" ON "games"("winner_id");
CREATE INDEX "games_status_idx" ON "games"("status");

-- Create moves table
CREATE TABLE "moves" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "move_number" INTEGER NOT NULL,
    "from_square" CHAR(2) NOT NULL,
    "to_square" CHAR(2) NOT NULL,
    "piece" VARCHAR(16) NOT NULL,
    "captured_piece" VARCHAR(16),
    "promotion" VARCHAR(16),
    "fen_after" TEXT NOT NULL,
    "notation_san" VARCHAR(32) NOT NULL,
    "time_remaining_ms" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "moves_game_id_move_number_key" ON "moves"("game_id", "move_number");
CREATE INDEX "moves_player_id_idx" ON "moves"("player_id");

-- Create match_queue table
CREATE TABLE "match_queue" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "elo_rating" INTEGER NOT NULL,
    "time_control" VARCHAR(50) NOT NULL,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_queue_user_id_time_control_key" ON "match_queue"("user_id", "time_control");
CREATE INDEX "match_queue_elo_rating_time_control_queued_at_idx" ON "match_queue"("elo_rating", "time_control", "queued_at");

-- Foreign keys with explicit cascade behavior
ALTER TABLE "games"
    ADD CONSTRAINT "games_white_player_id_fkey"
    FOREIGN KEY ("white_player_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "games"
    ADD CONSTRAINT "games_black_player_id_fkey"
    FOREIGN KEY ("black_player_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "games"
    ADD CONSTRAINT "games_winner_id_fkey"
    FOREIGN KEY ("winner_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moves"
    ADD CONSTRAINT "moves_game_id_fkey"
    FOREIGN KEY ("game_id") REFERENCES "games"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moves"
    ADD CONSTRAINT "moves_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_queue"
    ADD CONSTRAINT "match_queue_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
