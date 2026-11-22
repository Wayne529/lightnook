CREATE UNIQUE INDEX "one_active_plan_per_user" ON "Plan" ("userId") WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX "one_active_record_per_item" ON "Record" ("itemId") WHERE "revokedAt" IS NULL AND "itemId" IS NOT NULL;
CREATE INDEX "pending_outbox" ON "Outbox" ("createdAt") WHERE "publishedAt" IS NULL;
