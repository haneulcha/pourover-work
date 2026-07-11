-- 브루 로그 일기 (#14). 도메인 테이블 첫 추가.
-- id는 클라이언트 생성 UUID(멱등 저장). recipe는 Recipe JSON 스냅샷.
-- forward-only.

CREATE TABLE "brewLogEntry" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "brewedAt"    TEXT NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "feeling"     TEXT,
  "memo"        TEXT,
  "recipe"      TEXT NOT NULL,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);

CREATE INDEX "brewLogEntry_userId_brewedAt_idx"
  ON "brewLogEntry"("userId", "brewedAt" DESC);
