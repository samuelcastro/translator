-- Create conversations table to store conversation records
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_data JSONB NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for conversations table
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON public.conversations(created_at);

-- Create conversation_actions table for storing actions detected during conversations
CREATE TABLE IF NOT EXISTS public.conversation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for conversation_actions table
CREATE INDEX IF NOT EXISTS conversation_actions_conversation_id_idx ON public.conversation_actions(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_actions_action_type_idx ON public.conversation_actions(action_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations table
-- By default we'll allow anyone to select but use more restricted policies for insert/update/delete
CREATE POLICY "Anyone can view conversations"
    ON public.conversations
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK (true);

-- Create policies for conversation_actions table
CREATE POLICY "Anyone can view conversation actions"
    ON public.conversation_actions
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert conversation actions"
    ON public.conversation_actions
    FOR INSERT
    WITH CHECK (true);

-- Add comment to tables
COMMENT ON TABLE public.conversations IS 'Stores conversation data between clinicians and patients';
COMMENT ON TABLE public.conversation_actions IS 'Stores actions detected during medical conversations';
