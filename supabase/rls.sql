-- Apply after creating tables with Prisma and exposing auth context in Postgres
-- Uses a custom app.current_company_id setting to scope data.

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Impact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImpactEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtractionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtractionCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewDecision" ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_isolation_company ON "Company"
USING (id = current_setting('app.current_company_id', true));

CREATE POLICY company_isolation_impact ON "Impact"
USING ("companyId" = current_setting('app.current_company_id', true));

CREATE POLICY company_isolation_extraction_job ON "ExtractionJob"
USING ("companyId" = current_setting('app.current_company_id', true));

CREATE POLICY company_isolation_impact_event ON "ImpactEvent"
USING (
  EXISTS (
    SELECT 1 FROM "Impact" i
    WHERE i.id = "ImpactEvent"."impactId"
      AND i."companyId" = current_setting('app.current_company_id', true)
  )
);

CREATE POLICY company_isolation_evidence_source ON "EvidenceSource"
USING (
  EXISTS (
    SELECT 1 FROM "Impact" i
    WHERE i.id = "EvidenceSource"."impactId"
      AND i."companyId" = current_setting('app.current_company_id', true)
  )
);

CREATE POLICY company_isolation_extraction_candidate ON "ExtractionCandidate"
USING (
  EXISTS (
    SELECT 1 FROM "ExtractionJob" j
    WHERE j.id = "ExtractionCandidate"."extractionJobId"
      AND j."companyId" = current_setting('app.current_company_id', true)
  )
);

CREATE POLICY company_isolation_review_decision ON "ReviewDecision"
USING (
  EXISTS (
    SELECT 1 FROM "ExtractionCandidate" c
    JOIN "ExtractionJob" j ON j.id = c."extractionJobId"
    WHERE c.id = "ReviewDecision"."candidateId"
      AND j."companyId" = current_setting('app.current_company_id', true)
  )
);
