-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT,
    "brand" TEXT NOT NULL,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "state" TEXT,
    "nickname" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ParkingVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "hourlyCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "flatFeeCents" INTEGER,
    "maxSessionMinutes" INTEGER,
    "allowsExtension" BOOLEAN NOT NULL DEFAULT true,
    "rulesNotes" TEXT
);

-- CreateTable
CREATE TABLE "ParkingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "totalPaidCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reminder15Sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder5Sent" BOOLEAN NOT NULL DEFAULT false,
    "expiredSent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ParkingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParkingSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "ParkingVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParkingSession_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ParkingZone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionExtension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "addedMinutes" INTEGER NOT NULL,
    "addedCostCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionExtension_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ParkingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "ParkingVehicle_userId_idx" ON "ParkingVehicle"("userId");

-- CreateIndex
CREATE INDEX "ParkingSession_userId_status_idx" ON "ParkingSession"("userId", "status");

-- CreateIndex
CREATE INDEX "ParkingSession_userId_startedAt_idx" ON "ParkingSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ParkingSession_status_expiresAt_idx" ON "ParkingSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SessionExtension_sessionId_idx" ON "SessionExtension"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");
