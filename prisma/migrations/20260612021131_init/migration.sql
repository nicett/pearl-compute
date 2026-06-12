-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PRICE_ABOVE', 'PRICE_BELOW', 'SHUTDOWN_NEAR');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConfig" (
    "userId" UUID NOT NULL,
    "gpuCount" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "cardPrice" DOUBLE PRECISION NOT NULL DEFAULT 2800,
    "residualValue" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "powerCons" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "gpuHashrate" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "poolFee" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "electricityPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "selectedPoolSlug" TEXT,
    "priceSource" TEXT NOT NULL DEFAULT 'Pearl OTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MinerBinding" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "poolSlug" TEXT NOT NULL,
    "walletAddr" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinerBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinerSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "bindingId" UUID NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "hashrateHps" BIGINT,
    "balanceGrains" BIGINT,
    "paid24hGrains" BIGINT,
    "workerCount" INTEGER,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "MinerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "priceSource" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMin" INTEGER NOT NULL DEFAULT 60,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" BIGSERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "MinerBinding_poolSlug_idx" ON "MinerBinding"("poolSlug");

-- CreateIndex
CREATE UNIQUE INDEX "MinerBinding_userId_poolSlug_walletAddr_key" ON "MinerBinding"("userId", "poolSlug", "walletAddr");

-- CreateIndex
CREATE INDEX "MinerSnapshot_bindingId_snapshotAt_idx" ON "MinerSnapshot"("bindingId", "snapshotAt" DESC);

-- CreateIndex
CREATE INDEX "AlertRule_enabled_type_idx" ON "AlertRule"("enabled", "type");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinerBinding" ADD CONSTRAINT "MinerBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinerSnapshot" ADD CONSTRAINT "MinerSnapshot_bindingId_fkey" FOREIGN KEY ("bindingId") REFERENCES "MinerBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
