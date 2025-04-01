I'm using supabase as a backend.
Because clicking around the web UI is annoying, I gave ChatGPT the db requirements:

```
I'm setting up a project backend for a video language learning app in supabase. write me the SQL code to generate the tables in supabase. I have the following requirements

- use the standard auth model to have users.
- allow anonymous auth (the supabase API has functionality for that)
- later we want to know if accounts are premium (with a stripe integration, but that's later), so track that somehow
- there is some data that is simply hardcoded in our frontend as json files (because it doesn't change), so there is no reason to duplicate that in the supabase db. this includes data on the videos that users can watch, as well as the snippets in these videos, and the vocabulary in these snippets. know that these exist, but don't add these to supabase.
- we want a table that tracks when users have watched a video. for that, track datetime, a ref to the user account, and a "reference" to the video consisting simply of a string (the youtube_id)
- we want a table that tracks ratings that users gave snippets. the ratings are an integer, the snippets are referenced with snippet_id:string, and we store datetime
- we want a table tracking learning data for words (per user). here, we're not tracking every learning even ever happened, but only the progress per word and user. data: the word ref (a string), the user ref, and all data that ts-fsrs needs, which is:

  due: Date;           // Date when the card is next due for review
  stability: number;   // A measure of how well the information is retained
  difficulty: number;  // Reflects the inherent difficulty of the card content
  elapsed_days: number; // Days since the card was last reviewed
  scheduled_days: number; // The interval at which the card is next scheduled
  reps: number;          // Total number of times the card has been reviewed
  lapses: number;        // Times the card was forgotten or remembered incorrectly
  state: State;          // The current state of the card (New, Learning, Review, Relearning)
  last_review?: Date;    // The most recent review date, if applicable
```

...and ran the following generated SQL code:

```sql
-- Enable UUID generation extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a profiles table to extend the built-in auth.users.
-- This table tracks additional data such as premium status.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table to track when users watch a video.
-- We store a reference to the user (via auth.users), the youtube_id of the video,
-- and the timestamp when the video was watched.
CREATE TABLE public.video_watches (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_id text NOT NULL,
  watched_at timestamp with time zone DEFAULT now()
);

-- Table to track ratings that users give to snippets.
-- Each record stores the user, a snippet reference (as a string),
-- the rating (an integer), and the datetime when the rating was made.
CREATE TABLE public.snippet_ratings (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_id text NOT NULL,
  rating integer NOT NULL,
  rated_at timestamp with time zone DEFAULT now()
);

-- Create an enum type to track the learning state of a word.
CREATE TYPE public.learning_state AS ENUM ('New', 'Learning', 'Review', 'Relearning');

-- Table to track the learning data for words per user.
-- For each (user, word) pair, we store TS-FSRS data.
CREATE TABLE public.word_learning (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_ref text NOT NULL,
  due timestamp with time zone NOT NULL,
  stability numeric NOT NULL,
  difficulty numeric NOT NULL,
  elapsed_days integer NOT NULL,
  scheduled_days integer NOT NULL,
  reps integer NOT NULL,
  lapses integer NOT NULL,
  state public.learning_state NOT NULL,
  last_review timestamp with time zone,
  PRIMARY KEY (user_id, word_ref)
);

```