CREATE TABLE "Habit" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL,
 "icon" TEXT NOT NULL DEFAULT 'plant', "color" TEXT NOT NULL DEFAULT 'blue',
 "archived" BOOLEAN NOT NULL DEFAULT false, "revision" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Habit_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Habit_title_length" CHECK (char_length(trim("title")) BETWEEN 1 AND 30),
 CONSTRAINT "Habit_revision_positive" CHECK ("revision">0)
);
CREATE TABLE "HabitEntry" (
 "id" TEXT NOT NULL, "habitId" TEXT NOT NULL, "date" TEXT NOT NULL,
 "note" TEXT NOT NULL DEFAULT '', "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
 "revision" INTEGER NOT NULL DEFAULT 1, "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "HabitEntry_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "HabitEntry_revision_positive" CHECK ("revision">0),
 CONSTRAINT "HabitEntry_note_length" CHECK (char_length("note")<=500),
 CONSTRAINT "HabitEntry_photo_limit" CHECK (cardinality("photos")<=4)
);
CREATE INDEX "Habit_userId_archived_idx" ON "Habit"("userId","archived");
CREATE UNIQUE INDEX "HabitEntry_habitId_date_key" ON "HabitEntry"("habitId","date");
CREATE INDEX "HabitEntry_habitId_date_idx" ON "HabitEntry"("habitId","date");
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
