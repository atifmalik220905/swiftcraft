-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'starter',
    "monthlyOrderCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "drawerPosition" TEXT NOT NULL DEFAULT 'right',
    "drawerWidthPx" INTEGER NOT NULL DEFAULT 420,
    "primaryColor" TEXT NOT NULL DEFAULT '#6C5CE7',
    "buttonColor" TEXT NOT NULL DEFAULT '#00B894',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "borderRadius" INTEGER NOT NULL DEFAULT 12,
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "headerLogoUrl" TEXT,
    "bannerImageUrl" TEXT,
    "showProgressBar" BOOLEAN NOT NULL DEFAULT true,
    "showCountdown" BOOLEAN NOT NULL DEFAULT false,
    "showStickyAtc" BOOLEAN NOT NULL DEFAULT true,
    "showCouponField" BOOLEAN NOT NULL DEFAULT true,
    "showUpsells" BOOLEAN NOT NULL DEFAULT true,
    "showFreeGifts" BOOLEAN NOT NULL DEFAULT true,
    "showSocialProof" BOOLEAN NOT NULL DEFAULT false,
    "showLowStock" BOOLEAN NOT NULL DEFAULT true,
    "customCss" TEXT NOT NULL DEFAULT '',
    "customHtmlTop" TEXT NOT NULL DEFAULT '',
    "customHtmlBottom" TEXT NOT NULL DEFAULT '',
    "announcementText" TEXT NOT NULL DEFAULT '',
    "cartTitle" TEXT NOT NULL DEFAULT 'Your Cart',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL DEFAULT 'Untitled Rule',
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "upsellProductIds" TEXT NOT NULL,
    "displayType" TEXT NOT NULL DEFAULT 'carousel',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressBarRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "milestoneOrder" INTEGER NOT NULL DEFAULT 1,
    "rewardType" TEXT NOT NULL,
    "thresholdAmount" DOUBLE PRECISION NOT NULL,
    "messageBefore" TEXT NOT NULL DEFAULT 'Add ₹{remaining} more to unlock {reward}!',
    "messageAfter" TEXT NOT NULL DEFAULT 'You unlocked {reward}! 🎉',
    "rewardValue" TEXT NOT NULL DEFAULT '',
    "barFillColor" TEXT NOT NULL DEFAULT '#00B894',
    "barBgColor" TEXT NOT NULL DEFAULT '#E0E0E0',
    "showShimmer" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressBarRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeGiftRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "giftProductTitle" TEXT NOT NULL DEFAULT '',
    "thresholdAmount" DOUBLE PRECISION NOT NULL,
    "allowChoice" BOOLEAN NOT NULL DEFAULT false,
    "choiceCollectionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeGiftRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountdownSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "resetType" TEXT NOT NULL DEFAULT 'session',
    "message" TEXT NOT NULL DEFAULT 'Checkout within {time} to get free shipping today!',
    "textColor" TEXT NOT NULL DEFAULT '#E74C3C',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFF3F3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountdownSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "enablePincodeBlock" BOOLEAN NOT NULL DEFAULT false,
    "blockedPincodes" TEXT NOT NULL DEFAULT '[]',
    "enableCodOtp" BOOLEAN NOT NULL DEFAULT false,
    "codOtpThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "hideCodAbove" DOUBLE PRECISION,
    "enableAddressCheck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "cartValueBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cartValueAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsellRuleId" TEXT,
    "deviceType" TEXT NOT NULL DEFAULT 'desktop',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_shopDomain_key" ON "Merchant"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "CartSettings_merchantId_key" ON "CartSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressBarRule_merchantId_milestoneOrder_key" ON "ProgressBarRule"("merchantId", "milestoneOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CountdownSettings_merchantId_key" ON "CountdownSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "FraudSettings_merchantId_key" ON "FraudSettings"("merchantId");

-- AddForeignKey
ALTER TABLE "CartSettings" ADD CONSTRAINT "CartSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellRule" ADD CONSTRAINT "UpsellRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressBarRule" ADD CONSTRAINT "ProgressBarRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeGiftRule" ADD CONSTRAINT "FreeGiftRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountdownSettings" ADD CONSTRAINT "CountdownSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSettings" ADD CONSTRAINT "FraudSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartEvent" ADD CONSTRAINT "CartEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartEvent" ADD CONSTRAINT "CartEvent_upsellRuleId_fkey" FOREIGN KEY ("upsellRuleId") REFERENCES "UpsellRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
