# 🐛 Ta-Da! Bug Log

**Repository:** tada.living  
**Current Hosting:** https://tada.onemonkey.org  
**Created:** 2026-02-07

---

## 🚨 Active Bugs

### Bug #1: New Rhythm Duplicates Meditation Data Instead of Capturing Tallies

**Reported:** 2026-02-07  
**Status:** 🔴 Open  
**Severity:** High  
**Component:** Rhythms / Tallies

**Description:**
When adding a new rhythm configured to capture kettlebell swing count from the tallies system, it incorrectly duplicates data from the first rhythm (meditation) instead of capturing the tallies data.

**Expected Behavior:**
- New rhythm should capture data from the tallies component
- Should create new, independent data stream
- Should not reference or duplicate existing rhythm data

**Actual Behavior:**
- New rhythm shows meditation data (from first rhythm)
- Tallies data is not captured
- Data appears to be duplicated/copied rather than properly configured

**Reproduction Steps:**
1. Create new rhythm for "Kettlebell Swings"
2. Configure to capture from tallies
3. Observe: Shows meditation data instead

**Investigation Needed:**
- [ ] Check rhythm initialization logic
- [ ] Verify tallies data source binding
- [ ] Review how rhythms reference data sources
- [ ] Check if there's a default/fallback to first rhythm
- [ ] Verify data mapping configuration

**Possible Causes:**
- Data source IDs not properly assigned to new rhythms
- Hard-coded reference to meditation/first rhythm
- State management issue (new rhythm inherits first rhythm's state)
- Configuration not properly persisted/applied

**Priority:** High - Core functionality broken for new rhythms

---

## 📋 Bug Template

When adding new bugs, copy this template:

```markdown
### Bug #X: [Brief Description]

**Reported:** YYYY-MM-DD  
**Status:** 🔴 Open / 🟡 In Progress / 🟢 Fixed / 🔵 Won't Fix  
**Severity:** Critical / High / Medium / Low  
**Component:** [Component Name]

**Description:**
[Detailed description of the bug]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Reproduction Steps:**
1. Step 1
2. Step 2
3. Step 3

**Investigation Needed:**
- [ ] Item 1
- [ ] Item 2

**Possible Causes:**
- Hypothesis 1
- Hypothesis 2

**Priority:** [Critical/High/Medium/Low]
```

---

## 🟢 Fixed Bugs

*(None yet)*

---

## 🔵 Won't Fix / By Design

*(None yet)*

---

## 📊 Bug Statistics

**Total Open:** 1  
**Total Fixed:** 0  
**Total Won't Fix:** 0

**By Severity:**
- Critical: 0
- High: 1
- Medium: 0
- Low: 0

**By Component:**
- Rhythms: 1

---

## 🔧 Development Notes

### Next Debugging Session Priorities
1. Investigate Bug #1 (rhythm data duplication)
2. [Future items]

### Related Files to Check (Bug #1)
- Rhythm initialization code
- Tallies component integration
- Data source binding logic
- State management (rhythm data)

### Testing Checklist (Bug #1)
- [ ] Create new rhythm from scratch
- [ ] Verify data source configuration persists
- [ ] Test with different tally types
- [ ] Verify existing rhythms unaffected
- [ ] Test data independence between rhythms

---

## 📝 Notes

- Bug tracking started 2026-02-07
- Using this file until proper issue tracker set up
- When moving to GitHub Issues, reference this log for history
- Priority system: Critical > High > Medium > Low

---

*Last Updated: 2026-02-07 18:40 GMT*
