-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerProfileId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;
