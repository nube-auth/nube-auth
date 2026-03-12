# Pull Request

## Description
<!-- Describe your changes and why you made them -->

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 📚 Documentation
- [ ] 🔄 Refactor
- [ ] ⚡ Performance
- [ ] 🧪 Test

## Checklist

### Code Quality
- [ ] Tests added/updated
- [ ] No console.logs or debug statements
- [ ] No commented-out code
- [ ] Code is DRY (no duplication)

### Nube Auth-Specific Standards

#### JSONB Updates (if applicable)
- [ ] No read-modify-write patterns for JSONB
- [ ] Using `appQueries.*` in routes (no direct `buildJsonbMergeClause`)
- [ ] `updated_at` is set (trigger + code)
- [ ] No numeric array segments: `redirectUris.0`
- [ ] Database index exists for new query patterns

#### Database
- [ ] Migration created if schema changes
- [ ] Database: Drizzle migrations run locally
- [ ] Seed data updated if needed

#### API / Routes
- [ ] Input validation using Zod schemas
- [ ] Error handling for edge cases
- [ ] No sensitive data in logs
- [ ] **No internal database IDs in API responses** (use `public_id` only)
- [ ] **Service headers use public IDs**, not internal IDs
- [ ] Route parameters expect public IDs (`:userId`, not `:id`)

#### Security
- [ ] No credentials in error logs
- [ ] No request bodies with sensitive data logged
- [ ] Environment variables accessed through `config/env.ts`
- [ ] Credentials encrypted at rest if stored

#### TypeScript
- [ ] No `any` types without explanation
- [ ] TypeScript strict mode passes
- [ ] Type imports used correctly

### Testing
- [ ] Unit tests for core logic
- [ ] Integration tests if touching database
- [ ] Manual testing of happy path
- [ ] Manual testing of edge cases

## Related Issues
Closes #
Relates to #

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Notes for Reviewers
<!-- Anything specific reviewers should look at -->
