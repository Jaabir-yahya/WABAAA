# @kenya-commerce-os/database

Database package for Kenya Commerce OS - Supabase PostgreSQL schema, migrations, and type definitions.

## Structure

```
packages/database/
├── migrations/         # SQL migration files (chronological)
├── seed/              # Seed data for development/testing
├── schema/            # TypeScript type definitions (generated)
├── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Supabase account (https://supabase.com)
- Supabase CLI installed (`npm install -g supabase`)

### Setup

1. **Initialize Supabase project**:
```bash
cd packages/database
supabase init
```

2. **Link to your Supabase project**:
```bash
supabase link --project-ref your-project-ref
```

3. **Run migrations**:
```bash
npm run migrate
```

4. **Seed test data** (optional):
```bash
npm run seed
```

5. **Generate TypeScript types**:
```bash
npm run types
```

## Migrations

### Creating a New Migration
```bash
npm run migrate:new your_migration_name
```

### Migration Naming Convention
```
NNNN_descriptive_name.sql

Examples:
0001_create_commerce_events.sql
0002_create_businesses.sql
0003_create_views.sql
```

### Running Migrations
```bash
# Local database
npm run migrate

# Production (via Supabase dashboard or CLI)
supabase db push --db-url postgresql://...
```

## Core Tables

### commerce_events
**Single source of truth** for all commerce activities (append-only).

Key fields:
- `business_id` - Tenant isolation
- `event_type` - Primary category (message, payment, order, etc.)
- `payload` - Flexible JSONB data
- `idempotency_key` - Prevents duplicate processing

### businesses
Multi-tenant merchant accounts.

Key fields:
- `id` - Human-readable slug (e.g., 'elixosense')
- `name` - Business name
- `config` - Business-specific configuration (parser rules, branding, etc.)

### Materialized Views
Derived state from `commerce_events`:
- `customers_view` - Customer profiles and activity
- `orders_view` - Orders with status and items
- `payments_view` - Payment transactions

**Important**: Refresh views after bulk event ingestion:
```sql
SELECT refresh_all_views();
```

## Row Level Security (RLS)

All tables enforce multi-tenant isolation via RLS policies:
```sql
-- Set current business context
SET app.current_business_id = 'elixosense';

-- Now queries only return data for that business
SELECT * FROM commerce_events;  -- Only elixosense events
```

In application code, set this via Supabase client:
```typescript
await supabase.rpc('set_business_context', { business_id: 'elixosense' });
```

## Development Workflow

### Local Development
```bash
# Start local Supabase
supabase start

# Access local Studio
npm run studio  # Opens http://localhost:54323
```

### Reset Database (Destructive!)
```bash
npm run reset  # Drops and recreates database
```

### Generate Types
After schema changes:
```bash
npm run types  # Generates schema/types.ts
```

Import in your app:
```typescript
import { Database } from '@kenya-commerce-os/database/schema/types';
```

## Environment Variables

```bash
# Supabase Project
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Server-side only!

# Database (for direct connection)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Testing

### Test Data
Seed script creates ElixoSense tenant with sample events:
```bash
npm run seed
```

### Verify
```sql
-- Check businesses
SELECT * FROM businesses WHERE id = 'elixosense';

-- Check events
SELECT event_type, COUNT(*) 
FROM commerce_events 
WHERE business_id = 'elixosense' 
GROUP BY event_type;

-- Check views
SELECT * FROM customers_view WHERE business_id = 'elixosense';
SELECT * FROM orders_view WHERE business_id = 'elixosense';
SELECT * FROM payments_view WHERE business_id = 'elixosense';
```

## Backup & Recovery

### Manual Backup
```bash
supabase db dump -f backup.sql
```

### Restore
```bash
psql $DATABASE_URL < backup.sql
```

### Automated Backups
Supabase provides automatic daily backups (check your project settings).

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are enabled
- Verify `app.current_business_id` is set
- Use service role key for admin operations

### Migration conflicts
```bash
# List migrations
npm run migrate:list

# Reset and reapply
npm run reset
npm run migrate
```

### View refresh errors
Materialized views may fail if underlying data has conflicts. Check:
```sql
-- Find problematic events
SELECT * FROM commerce_events WHERE processing_status = 'failed';
```

## Production Checklist

Before going to production:

- [ ] All migrations applied
- [ ] RLS policies tested
- [ ] Indexes created for performance
- [ ] Backup strategy confirmed
- [ ] Monitoring set up (Supabase dashboard)
- [ ] Environment variables secured
- [ ] API keys rotated from development

## Support

- Supabase Docs: https://supabase.com/docs
- Kenya Commerce OS Docs: `../../docs/CONTEXT.md`
- GitHub Issues: (project repo)
