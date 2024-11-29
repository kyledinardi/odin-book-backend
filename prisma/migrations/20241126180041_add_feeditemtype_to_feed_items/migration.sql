-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "feedItemType" TEXT NOT NULL DEFAULT 'comment';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "feedItemType" TEXT NOT NULL DEFAULT 'post';

-- AlterTable
ALTER TABLE "Repost" ADD COLUMN     "feedItemType" TEXT NOT NULL DEFAULT 'repost';
