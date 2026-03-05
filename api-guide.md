# Tada API Quick Reference

```powershell
$BASE = "https://tada.living/api/v1"
$KEY = "tada_key_X53I5i3IfbVw5fUw-2CC8lztP2yDN87G"
$Headers = @{ Authorization = "Bearer $KEY" }
```

## Health check (no auth needed)

```powershell
Invoke-RestMethod "$BASE/health"
```

## List entries

```powershell
Invoke-RestMethod "$BASE/entries?limit=5" -Headers $Headers
```

## Get a single entry

```powershell
Invoke-RestMethod "$BASE/entries/ENTRY_ID" -Headers $Headers
```

## Create an entry

```powershell
Invoke-RestMethod "$BASE/entries" -Method Post -Headers $Headers `
  -ContentType "application/json" `
  -Body '{"type":"timed","name":"Test entry","timestamp":"2026-03-04T12:00:00Z","durationSeconds":600}'
```

## Bulk create entries

```powershell
$body = @{
  operations = @(
    @{ operation = "create"; data = @{ type = "timed"; name = "Entry 1"; timestamp = "2026-03-04T12:00:00Z"; durationSeconds = 300 } }
    @{ operation = "create"; data = @{ type = "timed"; name = "Entry 2"; timestamp = "2026-03-04T13:00:00Z"; durationSeconds = 600 } }
  )
} | ConvertTo-Json -Depth 4

Invoke-RestMethod "$BASE/entries/bulk" -Method Post -Headers $Headers `
  -ContentType "application/json" -Body $body
```

## Update an entry

```powershell
Invoke-RestMethod "$BASE/entries/ENTRY_ID" -Method Patch -Headers $Headers `
  -ContentType "application/json" -Body '{"name":"Updated name"}'
```

## Delete an entry

```powershell
Invoke-RestMethod "$BASE/entries/ENTRY_ID" -Method Delete -Headers $Headers
```

## Rhythms

```powershell
Invoke-RestMethod "$BASE/rhythms" -Headers $Headers
```

## Insights

```powershell
Invoke-RestMethod "$BASE/insights/summary" -Headers $Headers
Invoke-RestMethod "$BASE/insights/patterns" -Headers $Headers
Invoke-RestMethod "$BASE/insights/correlations" -Headers $Headers
```

## Export

```powershell
Invoke-RestMethod "$BASE/export/entries" -Headers $Headers
```
