# Supabase Setup for Medical Interpreter

This document outlines how to set up Supabase for the Medical Interpreter application to store conversations, summaries, and actions.

## Prerequisites

1. Create a Supabase account at [https://supabase.com/](https://supabase.com/)
2. Install the Supabase CLI by following the instructions at [https://supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)

## Setup Instructions

### 1. Create a New Supabase Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/) and create a new project
2. Choose a name for your project (e.g., "medical-interpreter")
3. Set a secure database password
4. Choose the region closest to your users
5. Click "Create new project"

### 2. Set Up Environment Variables

Create a `.env.local` file in the root of your project and add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

You can find these values in your Supabase project dashboard under Settings > API.

### 3. Run the Migration

Using the Supabase CLI, apply the migration to create the required database tables:

```bash
supabase link --project-ref your-project-reference
supabase db push
```

Alternatively, you can run the SQL manually:

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20250411143727_remote_schema.sql`
3. Paste into the SQL Editor and run the queries

### 4. Verify the Setup

After running the migration, you should see two tables in your Supabase dashboard:

1. `conversations` - Stores the conversation data and summaries
2. `conversation_actions` - Stores actions detected during conversations (e.g., appointment scheduling, lab orders)

## Database Schema

### conversations

| Column            | Type        | Description                            |
| ----------------- | ----------- | -------------------------------------- |
| id                | UUID        | Primary key                            |
| conversation_data | JSONB       | JSON array of conversation messages    |
| summary           | TEXT        | Summary of the conversation (optional) |
| created_at        | TIMESTAMPTZ | When the conversation was created      |

### conversation_actions

| Column          | Type        | Description                           |
| --------------- | ----------- | ------------------------------------- |
| id              | UUID        | Primary key                           |
| conversation_id | UUID        | Foreign key to conversations.id       |
| action_type     | TEXT        | Type of action (e.g., "sendLabOrder") |
| action_data     | JSONB       | JSON data specific to the action      |
| created_at      | TIMESTAMPTZ | When the action was created           |

## Security

The migration sets up Row Level Security (RLS) with policies that allow anyone to view and insert data. In a production environment, you should modify these policies to restrict access based on authenticated users.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
