# Manual Testing Guide for New Features

## Features to Test

### 1. Task Creation with New Fields
- [ ] Create a task using bulk import with description and links
- [ ] Verify description, JIRA ticket, and GitHub PR are saved
- [ ] Test format:
  ```
  Fix authentication bug
  > This bug prevents users from logging in
  > It needs urgent attention
  [JIRA: AUTH-123] [PR: #456]
  ```

### 2. Task Display
- [ ] JIRA ticket badge shows and links to correct URL
- [ ] GitHub PR badge shows and links to correct URL
- [ ] Expand/collapse button shows when task has description
- [ ] Description displays correctly when expanded

### 3. Task Editing
- [ ] Click task to edit
- [ ] All fields (title, description, JIRA, GitHub) are editable
- [ ] Save button updates all fields
- [ ] Cancel button reverts changes

### 4. JIRA Integration
- [ ] "Copy JIRA payload" includes description in body
- [ ] GitHub PR link is included in JIRA description

### 5. AI Summary
- [ ] Daily summary includes JIRA tickets and GitHub PRs
- [ ] Basic summary (non-AI) lists all links at the bottom
- [ ] Descriptions provide context in summaries

### 6. Bulk Import
- [ ] Complex nested tasks with descriptions parse correctly
- [ ] Links can be on separate lines or same line as task
- [ ] Subtasks inherit parent context

## Test Data

```
Main feature implementation
> Implement the new dashboard feature
> This includes charts and analytics
[JIRA: FEAT-100] [PR: #200]
    Create data models
    > Define database schema
    [JIRA: FEAT-101]
    Build UI components
    > React components with TypeScript
    [PR: #201]
    Write tests
    > Unit and integration tests
Bug fixes
> Various bug fixes for production
[JIRA: BUG-50]
```

## Expected Results

1. **Task Display**: 
   - Tasks show with badges for JIRA (purple) and GitHub (black)
   - Clicking badges opens links in new tabs
   - Descriptions are hidden by default, expandable

2. **Editing**:
   - Multi-field form appears when clicking task
   - All fields are populated with existing values
   - Changes persist after save

3. **Summaries**:
   - Include section for JIRA tickets
   - Include section for GitHub PRs
   - Use descriptions for context

4. **Database**:
   - Check browser DevTools > Application > Local Storage (if not using Supabase)
   - Verify new fields are stored