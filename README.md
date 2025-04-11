# Medical Interpreter

A real-time medical interpretation solution that facilitates communication between English-speaking clinicians and Spanish-speaking patients.

## Problem Statement

Non-English speaking patients are unable to communicate effectively with clinicians who cannot speak the patients' language. Healthcare providers are often required to hire in-person or virtual interpreters, which can be costly and sometimes unavailable.

## Solution

This application leverages OpenAI's Realtime API to create a web-based Language Interpreter agent designed for in-person clinical visits. It allows for real-time speech-to-speech translation between English and Spanish, making healthcare more accessible and efficient.

## Key Features

- **Real-time Interpretation**: Translates between clinician (English) and patient (Spanish) using speech input and output
- **"Repeat That" Functionality**: Supports special inputs like the patient saying "repite eso", which repeats the doctor's previous sentence in Spanish
- **Conversation Summary**: Provides a detailed summary at the end of each session
- **Action Detection**: Identifies requests for follow-up appointments or lab orders during the conversation
- **Webhook Integration**: Executes detected actions via external services
- **Conversation Storage**: Preserves full conversation history and summaries in a database

## Tech Stack

- **Frontend**: Next.js, TypeScript, ShadCN UI, TailwindCSS
- **Backend**: Next.js API Routes
- **Real-time Communication**: OpenAI Realtime API (WebRTC)
- **Database**: Supabase
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key with access to GPT-4o Realtime
- Supabase account

### Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/translator.git
cd translator
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Copy the environment variables file and fill in your credentials:

```bash
cp .env.example .env.local
```

4. Set up your Supabase database with the following tables:

   - `conversations` - To store conversation data
   - `conversation_actions` - To store detected actions

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Start a new conversation session by clicking the "Start" button
2. Select your preferred voice for the AI interpreter
3. The clinician speaks in English, which is translated to Spanish
4. The patient speaks in Spanish, which is translated to English
5. When the conversation is complete, click "End Conversation & Summarize"
6. Review the conversation summary and any detected actions
7. For a new session, click "New Conversation"

## Database Schema

### conversations

- `id`: UUID (Primary Key)
- `conversation_data`: JSON (Full conversation transcript)
- `summary`: Text (Generated summary)
- `created_at`: Timestamp

### conversation_actions

- `id`: UUID (Primary Key)
- `conversation_id`: UUID (Foreign Key referencing conversations.id)
- `action_type`: String (e.g., "scheduleFollowupAppointment", "sendLabOrder")
- `action_data`: JSON (Details of the action)
- `created_at`: Timestamp

## API Endpoints

- `POST /api/session`: Creates a new OpenAI Realtime session
- `POST /api/conversation`: Saves conversation data to the database
- `GET /api/conversation`: Retrieves conversation history
- `GET /api/conversation?id={id}`: Retrieves a specific conversation
- `POST /api/webhook`: Processes and simulates action execution

## Developed By

Created as part of a hackathon project exploring AI-powered solutions for healthcare communication challenges.

## License

MIT
