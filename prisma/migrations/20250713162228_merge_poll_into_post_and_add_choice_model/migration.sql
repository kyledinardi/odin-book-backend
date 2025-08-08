/*
  Warnings:

  - You are about to drop the `Poll` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_postId_fkey";

-- DropTable
DROP TABLE "Poll";

-- CreateTable
CREATE TABLE "Choice" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "postId" INTEGER NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChoiceToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ChoiceToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChoiceToUser_B_index" ON "_ChoiceToUser"("B");

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChoiceToUser" ADD CONSTRAINT "_ChoiceToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Choice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChoiceToUser" ADD CONSTRAINT "_ChoiceToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
