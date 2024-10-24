-- CreateTable
CREATE TABLE "Poll" (
    "id" SERIAL NOT NULL,
    "choices" TEXT[],
    "choice1Votes" INTEGER[],
    "choice2Votes" INTEGER[],
    "choice3Votes" INTEGER[],
    "choice4Votes" INTEGER[],
    "choice5Votes" INTEGER[],
    "choice6Votes" INTEGER[],
    "voters" INTEGER[],
    "postId" INTEGER NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poll_postId_key" ON "Poll"("postId");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
