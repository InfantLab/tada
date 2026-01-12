# CSV Import Framework - Research Findings

**Date:** 2026-01-12  
**Sources:** Papa Parse documentation, MDN File API

---

## CSV Parsing Library: Papa Parse

### Why Papa Parse?

- **Mature & well-tested:** Industry standard for CSV parsing in JavaScript
- **Streaming support:** Can handle large files without loading entire file into memory
- **Edge case handling:** Handles quoted fields, multi-line values, various delimiters
- **Auto-detection:** Can automatically detect delimiters and newlines
- **Type conversion:** Optional dynamic typing (strings → numbers/booleans)
- **Error handling:** Provides detailed error objects with row numbers

### Key Features for Our Use Case

1. **Client-side file parsing:**

```javascript
Papa.parse(file, {
  complete: function (results) {
    console.log("Parsed:", results.data);
  },
});
```

2. **Streaming for large files:**

```javascript
Papa.parse(file, {
  step: function (row) {
    console.log("Row:", row.data);
  },
  complete: function () {
    console.log("All done!");
  },
});
```

3. **Header row handling:**

```javascript
Papa.parse(file, {
  header: true, // First row becomes keys
  dynamicTyping: true, // Auto-convert numbers/booleans
});
```

### Configuration Options Relevant to Tada

| Option           | Value      | Purpose                                |
| ---------------- | ---------- | -------------------------------------- |
| `header`         | `true`     | Treat first row as field names         |
| `dynamicTyping`  | `false`    | Keep as strings (we'll parse manually) |
| `skipEmptyLines` | `'greedy'` | Skip lines with only whitespace        |
| `preview`        | `10`       | For preview mode (first 10 rows)       |
| `delimiter`      | `""`       | Auto-detect (comma, tab, pipe, etc.)   |
| `step`           | `function` | Process row-by-row (streaming)         |
| `chunk`          | `function` | Process in chunks (for large files)    |

### Performance Considerations

**Papa Parse Chunk Sizes:**

- `Papa.LocalChunkSize`: Default 10 MB
- `Papa.RemoteChunkSize`: Default 5 MB

For our use case (local files up to 10,000 rows):

- **Don't need remote parsing** (files are uploaded, not fetched)
- **Use step callback** for row-by-row processing
- **Batch insertions** on our end (500 rows per database transaction)

---

## File Upload Best Practices (MDN)

### File Input Approaches

1. **Standard file input:**

```html
<input type="file" accept=".csv,text/csv" />
```

2. **Hidden input with styled button:**

```html
<input type="file" id="csvFile" class="visually-hidden" />
<label for="csvFile">Choose CSV File</label>
```

3. **Drag and drop zone:**

```javascript
dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  handleFiles(files);
});
```

### File Size Checking

Before parsing, check file size:

```javascript
const file = input.files[0];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

if (file.size > MAX_SIZE) {
  alert("File too large. Max 50 MB.");
  return;
}
```

### File Type Validation

```javascript
const file = input.files[0];
if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
  alert("Please upload a CSV file");
  return;
}
```

### Memory Management

For large files, use streaming instead of loading entire file:

```javascript
// ❌ BAD: Loads entire file into memory
const text = await file.text();

// ✅ GOOD: Stream with Papa Parse
Papa.parse(file, {
  step: function (row) {
    processRow(row.data);
  },
});
```

---

## Import Flow Best Practices

### User Experience Patterns

1. **Immediate feedback:**

   - Show file name and size after selection
   - Display row count after parsing headers
   - Preview first 10 rows immediately

2. **Progress indicators:**

   - Use progress bar for imports >1000 rows
   - Update every 100 rows processed
   - Show "X of Y rows imported" message

3. **Error handling:**
   - Don't fail entire import on single row error
   - Collect errors and show at end
   - Allow user to download error log CSV

### Data Validation Strategies

**Three-tier validation:**

1. **Structural validation** (before import):

   - Required columns present
   - Date format detection
   - Duration format checking

2. **Business logic validation** (during transform):

   - Date ranges reasonable (not in future)
   - Durations positive and < 24 hours
   - Activity names map to valid categories

3. **Database validation** (during insert):
   - Foreign key constraints
   - Unique constraints
   - Type checking

### Transaction Safety

**Batch with rollback:**

```javascript
// Process in batches of 500
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);

  try {
    await db.transaction(async (tx) => {
      for (const row of batch) {
        await tx.insert(entries).values(row);
      }
    });
  } catch (error) {
    // Log which batch failed
    logError(`Batch ${i}-${i + 500} failed`, error);
  }
}
```

---

## Recommendations for Tada

### Phase 1: Core Import (MVP)

1. **Use Papa Parse with these settings:**

   - `header: true` (CSV columns as keys)
   - `skipEmptyLines: 'greedy'`
   - `step` callback for row-by-row processing
   - No `dynamicTyping` (we parse manually for control)

2. **File upload UI:**

   - Hidden `<input type="file">` with custom label
   - Accept: `.csv,text/csv`
   - Max file size: 50 MB (check client-side)
   - Show file info immediately (name, size, row count)

3. **Preview before import:**

   - Parse first 10 rows with `preview: 10`
   - Show transformed data in table
   - Display validation warnings

4. **Import execution:**
   - Batch inserts (500 rows per transaction)
   - Update progress every 100 rows
   - Continue on row errors (collect and report)
   - Return summary (success/skip/error counts)

### Phase 2: Enhanced UX

1. **Drag-and-drop support**
2. **Column auto-detection with confidence scores**
3. **Better error messages with row numbers**
4. **Downloadable error log**

### Phase 3: Advanced Features

1. **Resume failed imports**
2. **Background processing for very large files**
3. **Recipe marketplace**

---

## Technical Decisions Summary

| Decision                | Choice                 | Rationale                                         |
| ----------------------- | ---------------------- | ------------------------------------------------- |
| **CSV Parser**          | Papa Parse             | Industry standard, streaming support, well-tested |
| **Parsing Location**    | Client-side            | Better UX (instant preview), reduced server load  |
| **Upload Method**       | File input + drag-drop | Standard + progressive enhancement                |
| **File Size Limit**     | 50 MB                  | Balances usability with memory safety             |
| **Row Limit**           | ~10,000 rows           | 27 years of daily logs (reasonable maximum)       |
| **Batch Size**          | 500 rows               | Good balance of speed vs transaction safety       |
| **Progress Updates**    | Every 100 rows         | Frequent enough for feedback, not too chatty      |
| **Error Strategy**      | Collect and continue   | Don't fail entire import on single bad row        |
| **Duplicate Detection** | Hash-based externalId  | Reliable without needing source IDs               |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

Installation:

```bash
cd app
bun add papaparse
bun add -d @types/papaparse
```
