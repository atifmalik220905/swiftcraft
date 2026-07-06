-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'starter',
    "monthlyOrderCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CartSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "drawerPosition" TEXT NOT NULL DEFAULT 'right',
    "drawerWidthPx" INTEGER NOT NULL DEFAULT 420,
    "primaryColor" TEXT NOT NULL DEFAULT '#6C5CE7',
    "buttonColor" TEXT NOT NULL DEFAULT '#00B894',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "overlayOpacity" REAL NOT NULL DEFAULT 0.5,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UpsellRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL DEFAULT 'Untitled Rule',
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "upsellProductIds" TEXT NOT NULL,
    "displayType" TEXT NOT NULL DEFAULT 'carousel',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UpsellRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressBarRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "milestoneOrder" INTEGER NOT NULL DEFAULT 1,
    "rewardType" TEXT NOT NULL,
    "thresholdAmount" REAL NOT NULL,
    "messageBefore" TEXT NOT NULL DEFAULT 'Add ₹{remaining} more to unlock {reward}!',
    "messageAfter" TEXT NOT NULL DEFAULT 'You unlocked {reward}! 🎉',
    "rewardValue" TEXT NOT NULL DEFAULT '',
    "barFillColor" TEXT NOT NULL DEFAULT '#00B894',
    "barBgColor" TEXT NOT NULL DEFAULT '#E0E0E0',
    "showShimmer" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressBarRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FreeGiftRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "giftProductId" TEXT NOT NULL,
    "giftProductTitle" TEXT NOT NULL DEFAULT '',
    "thresholdAmount" REAL NOT NULL,
    "allowChoice" BOOLEAN NOT NULL DEFAULT false,
    "choiceCollectionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FreeGiftRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CountdownSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "resetType" TEXT NOT NULL DEFAULT 'session',
    "message" TEXT NOT NULL DEFAULT 'Checkout within {time} to get free shipping today!',
    "textColor" TEXT NOT NULL DEFAULT '#E74C3C',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FFF3F3',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CountdownSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraudSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "enablePincodeBlock" BOOLEAN NOT NULL DEFAULT false,
    "blockedPincodes" TEXT NOT NULL DEFAULT '[]',
    "enableCodOtp" BOOLEAN NOT NULL DEFAULT false,
    "codOtpThreshold" REAL NOT NULL DEFAULT 5000,
    "hideCodAbove" REAL,
    "enableAddressCheck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FraudSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "cartValueBefore" REAL NOT NULL DEFAULT 0,
    "cartValueAfter" REAL NOT NULL DEFAULT 0,
    "upsellRuleId" TEXT,
    "deviceType" TEXT NOT NULL DEFAULT 'desktop',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartEvent_upsellRuleId_fkey" FOREIGN KEY ("upsellRuleId") REFERENCES "UpsellRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
