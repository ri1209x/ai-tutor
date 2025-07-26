-- CreateTable
CREATE TABLE "learning_style_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visualScore" INTEGER NOT NULL DEFAULT 0,
    "auditoryScore" INTEGER NOT NULL DEFAULT 0,
    "kinestheticScore" INTEGER NOT NULL DEFAULT 0,
    "readingScore" INTEGER NOT NULL DEFAULT 0,
    "primaryStyle" "LearningStyle" NOT NULL,
    "secondaryStyle" "LearningStyle",
    "answers" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "studyTips" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_style_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "learning_style_results" ADD CONSTRAINT "learning_style_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
