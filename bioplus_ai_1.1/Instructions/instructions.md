Project Requirements Document
Objective
To develop an AI-based self-diagnosis tool that uses a series of closed-ended questions to guide users toward potential health conditions with confidence ratings.
Core Features
Initial Multiple-Choice Questionnaire:
Three primary question categories:
I am feeling... (e.g., pain, fatigue, dizziness).
I am having trouble with... (e.g., digestion, breathing, mobility).
I am noticing... (e.g., rashes, growths, swelling).
Dynamic Follow-Up Questions:
Use ChatGPT API to generate personalized, closed-ended questions.
Adapt questions based on user responses for more accurate pattern recognition.
Confidence-Based Diagnosis:
Assign confidence ratings to potential diagnoses using a scoring algorithm.
Once confidence is above 90%, break out of the questionnaire.
Provide actionable next steps (e.g., see a doctor, seek emergency care, try home remedies).
User-Friendly Interface:
Simplified language (avoid technical jargon).
Logical flow for ease of use.
Privacy and Security:
Comply with HIPAA standards or similar to protect user data.
Implement Supabase Row-Level Security (RLS) for sensitive data.
Non-Functional Requirements
Performance:  Ensure real-time response generation and dynamic interaction via ChatGPT API.
Scalability: Handle high volumes of concurrent users by optimizing API calls and using Supabase Edge Functions.
Accuracy:  Leverage evidence-based patterns for diagnosis.



Tech Stack and Packages Document
Frontend
Framework:
Next.js 14: Full-stack React framework for SSR and API integration.
UI Components:
TailwindCSS: Utility-first CSS framework for responsive design.
ShadcnUI: Customizable components styled with TailwindCSS.
RadixUI: Unstyled, accessible UI primitives.
State Management:
React Context API: For lightweight global state management.
React Query: For efficient server-side state and caching.
Backend
Framework:
Supabase: Backend-as-a-service (BaaS) solution with:
PostgreSQL for database management.
Authentication for secure user access.
Real-time updates and RESTful/GraphQL APIs.
Implement RLS for fine-grained data access control.
API:
OpenAI's ChatGPT API: For dynamic question generation and conversational AI.
Add API keys to a secure .env.local file:
NEXT_PUBLIC_SUPABASE_URL=https://xotyjqngbsbpxyfinnwe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdHlqcW5nYnNicHh5ZmlubndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4NDY3NzcsImV4cCI6MjA0ODQyMjc3N30.BEzV83dOkY35XlAfQgCvpUuyqbHFCkVRQwuYXCcM2Pc
OPENAI_API_KEY=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
Database
Primary Database:
Supabase (PostgreSQL): Stores user data, interactions, and diagnosis mappings.
Caching:
Supabase Edge Functions: For server-side caching and efficient backend logic.
APIs and Libraries
AI Integration:
OpenAI API: For generating dynamic, context-aware questions.
Confidence Score Calculations:
Use Pandas or NumPy in Supabase Edge Functions or Node.js for statistical operations.
Cloud Services
Hosting:
Vercel: For deploying Next.js applications with serverless support.
Edge Computing:
Supabase Edge Functions: For secure and performant backend operations.
Containerization:
Docker: For consistent development and production environments.

File Structure Documentation 
BioPlusAI/
│
├── app/                          # Main directory for App Router
│   ├── api/                      # API route handlers
│   │   ├── diagnose/route.ts     # Endpoint for diagnosis logic
│   │   └── chatgpt/route.ts      # Endpoint to interact with ChatGPT API
│   │
│   ├── layout.tsx                # Global layout for the app
│   ├── page.tsx                  # Root page (landing page)
│   ├── globals.css               # Global styles for the app
│   │
│   ├── onboarding/               # Group routes for onboarding
│   │   ├── questions/            # Initial questions for diagnosis
│   │   │   ├── page.tsx          # Questions page
│   │   │   └── styles.module.css # Scoped styles for Questions page
│   │   ├── summary/              # User input summary
│   │   │   ├── page.tsx          # Summary page
│   │   │   └── styles.module.css # Scoped styles for Summary page
│   │
│   ├── dashboard/                # Group routes for user dashboard
│   │   ├── results/              # Diagnosis results
│   │   │   ├── page.tsx          # Results page
│   │   │   └── styles.module.css # Scoped styles for Results page
│   │   ├── history/              # User diagnosis history
│   │   │   ├── page.tsx          # History page
│   │   │   └── styles.module.css # Scoped styles for History page
│
├── components/                   # Reusable components
│   ├── Navbar.tsx                # Navigation bar
│   ├── Footer.tsx                # Footer for the app
│   ├── QuestionCard.tsx          # For displaying individual questions
│   ├── ResultCard.tsx            # For showing diagnosis results
│
├── lib/                          # Utility and helper functions
│   ├── api.ts                    # Helper for API calls
│   ├── chatgpt.ts                # Wrapper for ChatGPT API interactions
│   ├── scoring.ts                # Logic for confidence score calculations
│
├── public/                       # Public assets
│   ├── images/                   # Image files
│   │   └── logo.png              # App logo
│   └── favicon.ico               # Favicon for the app
│
├── styles/                       # Global styles
│   ├── variables.css             # CSS variables
│   ├── mixins.css                # CSS mixins
│   └── animations.css            # Animations
│
├── .env.local                    # Environment variables
├── .gitignore                    # Files to ignore in Git
├── next.config.js                # Next.js configuration file
├── package.json                  # Project dependencies
├── README.md                     # Project documentation
└── tsconfig.json                 # TypeScript configuration



Schema Design Document
Overview
This schema is designed to support an AI health diagnosis tool, handling user data, dynamic questions, responses, diagnosis mappings, and system logs. Relationships are designed for scalability, efficient querying, and compliance with privacy standards.





Questions Table
Responses Table
Diagnoses Table
Logs Table
Relationships
Users → Responses: One-to-many relationship. Each user can submit multiple responses.
Questions → Responses: One-to-many relationship. Each question can have multiple responses.
Users → Diagnoses: One-to-many relationship. Each user can receive multiple diagnoses.
Users → Logs: One-to-many relationship for tracking user actions.

Indexes
Users.email: For quick lookup by email.
Responses.user_id: For efficiently querying responses by user.
Diagnoses.confidence_rating: For ranking diagnoses.

Privacy and Security
Row-Level Security (RLS):
Implement rules in Supabase to restrict access to data only to the relevant user.
Data Anonymization:
Store sensitive data separately, linked via unique identifiers.

Detailed App Flow Document
1. Entry Point
Landing Page:
User accesses the app via web or mobile.
Welcome screen provides:
Brief instructions.
Privacy notice (e.g., "Your data will remain private and secure.").

2. Initial Questionnaire
User selects a primary category:
“I am feeling...”
“I am having trouble with...”
“I am noticing...”
User answers multiple-choice questions:
Tailored to the selected category.
Example for "I am feeling":
Question: "Do you feel tired?"
Options: "Yes", "No", "Sometimes".

3. Dynamic Follow-Up
Trigger ChatGPT API:
Based on initial responses, generate follow-up questions.
Example:
User selects "tired."
ChatGPT generates: "Is your fatigue constant or intermittent?"
Adapt to responses:
Responses guide the flow of subsequent questions.
Example:
If the user selects "constant fatigue," further questions focus on sleep and diet.

4. Diagnosis Confidence Ratings
Apply Scoring Formula:
Assign weights to responses.
Match responses to known symptom patterns using Supabase Edge Functions.
Confidence Rating:
Display a confidence score for potential diagnoses.
Example:
"You have an 85% likelihood of experiencing 'Chronic Fatigue Syndrome.'"

5. Results and Recommendations
Display Results:
Show potential diagnoses ranked by confidence.
Example:
1. Chronic Fatigue Syndrome - 85%
2. Iron Deficiency Anemia - 65%
3. Depression - 40%
Provide Next Steps:
Clear actionable items based on diagnosis:
"See a doctor for further tests."
"Consider dietary changes."

6. End Session
Save Results:
Option to save or export results for healthcare providers.
Anonymize Data:
Store only necessary data for research while ensuring privacy.
Logout or Restart:
User can end the session or start a new diagnosis.

7. Error Handling
ChatGPT API Errors:
Fallback message: "We're unable to process your request at this time. Please try again later."
Supabase Downtime:
Show an offline message and allow local caching of responses.

Additional Optimizations
Caching:
Use React Query for caching dynamic responses.
Cache frequently asked questions to reduce API calls.
Accessibility:
Ensure compatibility with screen readers and high-contrast modes.
Scalability:
Use Supabase Edge Functions for scoring to offload compute-heavy tasks from the frontend.

