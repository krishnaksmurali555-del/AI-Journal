# AI Journal — Secure Full-Stack Application

A production-quality, user-authenticated, zero-trust private journaling workspace powered by **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Google Cloud Firestore**.

---

## 🛡️ 1. Agentic Threat Modeling Summary

| Threat Zone | Identified Attack Vector | Countermeasure & Defensive Implementation |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt Injection, oversized payloads, malformed JSON schemas | Strict Zod validation schemas (`validators.ts`) on all `/api/*` endpoints; payload size limits; defensive type checking. |
| **2. Planning & Reasoning** | System instruction bypass, jailbreak attempts | Explicit system instructions strictly framing Gemini as a reflective journal guide; user entries treated as un-executable plain data. |
| **3. Tool & AI Execution** | API rate exhaustion, provider downtime, SSRF | Automated Resilient Model Fallback Ladder (`gemini-3.6-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`). |
| **4. Memory & State** | Cross-user data leakage, unauthorized read/write, IDOR | Firebase Admin ID Token verification; user ID derived **strictly** from verified JWT (`req.user.uid`), never from client input. Firestore owner-isolated path structure `/users/{userId}/journals/{journalId}`. |
| **5. Inter-System & Auth** | Credential theft, hardcoded secrets, session hijacking | Zero hardcoded keys in client code; `GEMINI_API_KEY` stored exclusively server-side and accessed via GCP Secret Manager / environment variables; federated Google Auth without password storage. |

---

## 🔒 2. Firestore Security Rules

Deployed in `firestore.rules` to enforce root-level owner-bound isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Top-level users collection: each user can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Isolated user journals subcollection
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Subcollection for conversation messages attached to a journal entry
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Isolated periodic reflections subcollection
      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Default deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔑 3. Google Cloud Secret Manager Setup

To configure server-side API keys securely on Google Cloud:

```bash
# 1. Enable required APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com

# 2. Create and populate the GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 4. Google Cloud Run Deployment

Deploy the application container to Google Cloud Run with the required campaign label:

```bash
# Build and deploy service
gcloud run deploy ai-journal \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 🧪 5. Functional Walkthrough & Test Verification Checklist

| Test ID | User Interaction / Feature | Expected Outcome | Verification Steps |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Unauthenticated Access** | User is blocked from private views; sees Landing Page. | Navigate to `/` without active session; confirm only Landing Page with Google Sign-In is displayed. |
| **TC-02** | **Google Sign-In Flow** | Authenticated session created; redirects to Dashboard. | Click "Continue with Google"; complete popup; confirm top navigation displays avatar & user email. |
| **TC-03** | **Create Journal Entry** | Blank journal created in user's isolated collection. | Click "+ New Journal"; confirm editor opens with auto-generated ID under `/users/{userId}/journals`. |
| **TC-04** | **Rich Metadata & Mood** | Mood & tags saved instantly to Firestore. | Select mood (e.g. `😊 Happy`), type tag `#growth` + Enter; verify tags and mood persist after refresh. |
| **TC-05** | **AI Summarization** | 2-3 sentence structured summary generated by Gemini. | Click `[ Summarize ]`; verify Gemini summary appears in "Generated Insights" section and persists. |
| **TC-06** | **AI Reflection & Brainstorm** | Cognitive reflection & actionable angles returned. | Click `[ Reflect ]` or `[ Brainstorm ]`; verify structured outputs render cleanly without markdown errors. |
| **TC-07** | **Multi-Turn Chat** | Context-aware conversation with Gemini. | In side panel, type "What underlying pattern do you notice?"; verify Gemini responds referencing journal context. |
| **TC-08** | **Ask My Journal (Archive Query)** | Answers queries synthesized across user history. | Click "Ask My Journal", submit "What did I learn recently?"; verify synthesized answer with cited journal cards. |
| **TC-09** | **Weekly / Monthly Reflection** | 7-day or 30-day holistic trajectory analysis. | Click "Reflections" modal; click "Generate Weekly Reflection"; verify focus areas, learnings, and next steps. |
| **TC-10** | **Export Functionality** | Downloads clean PDF / Markdown / TXT / JSON. | Open Export dropdown; click "Export as PDF" or "Export as Markdown"; verify downloaded file content. |
| **TC-11** | **Data Isolation (Security)** | User A cannot view User B's entries. | Authenticate with User A, create entry. Authenticate with User B, verify User A's entry is not listed or queryable. |
| **TC-12** | **Theme Switcher** | Light / Dark / System modes toggle seamlessly. | Click theme switcher in Navbar; verify Tailwind `dark` class toggles background and text contrasts cleanly. |
