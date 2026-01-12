# CSV Import Framework - Implementation Plan

**Feature:** Generic CSV Import System with Import Recipes  
**Version:** v0.2.0  
**Status:** Planning  
**Date:** 2026-01-12

## Overview

Build a flexible, user-driven CSV import system where users can map any CSV columns to Tada fields and save reusable import recipes. Insight Timer becomes the first built-in recipe demonstrating the framework.

## Goals

1. Enable users to import historical data from other apps
2. Create reusable import recipes for common data sources
3. Design for future recipe sharing marketplace (v0.4.0+)
4. Handle large files robustly (up to 10,000 rows)
5. Provide clear validation and error feedback

## Architecture

### Database Schema

#### `import_recipes` Table

- Stores user-defined and built-in import configurations
- Supports versioning with rollback capability
- Designed for future public recipe sharing

#### `import_logs` Table

- Tracks import history and results
- Stores recipe snapshots for audit trail
- Useful for debugging and support

### Components

1. **CSV Parser Utility** (`app/utils/csvImporter.ts`)
2. **Import API Endpoint** (`app/server/api/import/csv.post.ts`)
3. **Import UI Pages** (`app/pages/import/`)
4. **Recipe Management** (database schema + UI)

## Implementation Phases

### Phase 1: Database Schema & Core Engine

- [ ] Create `import_recipes` table
- [ ] Create `import_logs` table
- [ ] Build CSV parser utility with streaming support
- [ ] Implement date/time format detection
- [ ] Implement duration parsing

### Phase 2: API Layer

- [ ] Create bulk import endpoint
- [ ] Implement duplicate detection
- [ ] Add rate limiting
- [ ] Transaction safety and rollback

### Phase 3: UI - Import Wizard

- [ ] File upload component
- [ ] CSV preview table
- [ ] Column mapping interface
- [ ] Transformation config (timezone, formats)
- [ ] Data validation panel
- [ ] Preview transformed entries
- [ ] Progress tracking

### Phase 4: Recipe System

- [ ] Recipe save/load functionality
- [ ] Built-in Insight Timer recipe
- [ ] Recipe rollback mechanism
- [ ] Recipe management UI

### Phase 5: Integration & Polish

- [ ] Add import navigation to Settings
- [ ] Import landing page with quick-start cards
- [ ] Error handling and user feedback
- [ ] Testing and documentation

## Technical Decisions

### CSV Parsing Library

**Decision:** Use Papa Parse for CSV parsing
**Rationale:** Mature, well-tested, supports streaming, handles edge cases

### File Upload Strategy

**Decision:** Client-side parsing, server-side import
**Rationale:** Better UX (instant preview), reduced server load, user control

### Duplicate Detection

**Decision:** Hash-based `externalId` using (timestamp + duration + name)
**Rationale:** Reliable, works without unique IDs in source data

### Large File Handling

**Decision:** Streaming parser + batched imports (500 rows/batch)
**Rationale:** Memory efficient, good balance between speed and stability

## User Flow

1. User navigates to Import page
2. Selects source (Insight Timer or Custom CSV)
3. Uploads CSV file → instant preview
4. System auto-detects column mappings (with manual override)
5. User configures transformation rules (timezone, formats)
6. Preview shows first 10 transformed entries + validation warnings
7. User optionally saves recipe for future use
8. Import starts with progress bar
9. Results summary shows success/skip/error counts
10. User can download error log if needed

## Non-Goals (Out of Scope for v0.2.0)

- Public recipe sharing marketplace (v0.4.0+)
- LLM-assisted column mapping (v0.5.0+)
- Background job processing for very large files
- Two-way sync with external services
- Automatic scheduled imports

## Success Metrics

- Import 4,854 Insight Timer entries in <2 minutes
- Zero data loss for valid entries
- Clear error messages for invalid data
- User can successfully create and reuse custom recipe
- New categories/subcategories properly flagged

## Risk Assessment

**Medium Risk:** Date/time parsing complexity (many formats)  
**Mitigation:** Auto-detection with manual override, clear format preview

**Low Risk:** Large file memory issues  
**Mitigation:** Streaming parser, batched imports, file size warnings

**Low Risk:** User confusion with column mapping  
**Mitigation:** Auto-detection, clear labels, preview before import

## Dependencies

- Papa Parse (CSV parsing)
- Existing auth system
- Entry creation API patterns
- Category/subcategory system

## Timeline Estimate

- Phase 1: 4-6 hours (schema + engine)
- Phase 2: 3-4 hours (API layer)
- Phase 3: 6-8 hours (UI wizard)
- Phase 4: 2-3 hours (recipe system)
- Phase 5: 2-3 hours (integration)

**Total:** 17-24 hours (~2-3 full days)
