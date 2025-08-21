-- AlterTable
ALTER TABLE "public"."Comment" ALTER COLUMN "text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Message" ALTER COLUMN "text" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Post" ALTER COLUMN "text" DROP NOT NULL;
