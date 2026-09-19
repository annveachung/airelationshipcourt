# AI Relationship Court

## Final Product & Technical Specification

---

# 1. Product Overview

**AI Relationship Court** is a humorous, structured, AI-assisted web application where two partners submit their perspectives about a disagreement and put the case through a simulated court process.

The application does not simply ask an AI to give relationship advice.

Instead, it uses a structured workflow:

```text
Partner A + Partner B
        ↓
Initial Testimony
        ↓
AI Case Analysis
        ↓
One Follow-up Round
        ↓
AI Panel Deliberation
        ↓
Final Judgement
        ↓
Feedback
        ↓
Recommended Resolution
        ↓
Relationship Lab
        ↓
Final Case Report

```

The AI panel consists of several different roles:

- ⚖️ Jury
- 👨‍👩‍👧 Family Counsellor
- 🧑‍⚖️ Social Worker

Each role evaluates the case from a different perspective.

The user does **not** need to read three complete AI judgements. The system synthesizes the panel's findings into one concise final judgement while still showing a short perspective from each character.

The project is intentionally funny on the surface but technically serious underneath.

---

# 2. Core Product Philosophy

The application should NOT be:

User → ChatGPT → Relationship Advice

```

Instead:

Partner A/B Input
              ▼
       AI Case Analysis
              │
              ▼
      One Follow-up Round
              │
              ▼
       AI Panel Deliberation, jury, counsellor, social worker
             
        
              ▼
        Final Verdict
              │
              ▼
   Feedback + Recommendations
              │
              ▼
        Final Case Report

```

The AI is therefore one component of a controlled application workflow.

The backend controls:

- case state
- access permissions
- question limits
- panel roles
- scoring
- final percentage calculation
- report generation

The LLM should not independently control the entire application.

---

# 3. Important Product Constraints

Each case deliberately has a limited investigation.

There are only:

1. Initial submission
2. AI analysis
3. One follow-up round
4. Panel judgement
5. Final verdict
6. Feedback
7. Recommended resolution
9. Final report
10. Case closed

There is **no unlimited AI questioning**.

There is **no second or third follow-up round**.

Once the follow-up round is completed, the court proceeds to judgement.

---

# 4. Backend State Machine

CASE_OPEN
↓
TESTIMONY
↓
ANALYSIS
↓
FOLLOW_UP
↓
PANEL_JUDGEMENT
↓
VERDICT
↓
RECOMMENDATIONS
↓
REPORT
↓
CLOSED

```

The backend should enforce valid state transitions.
a second follow-up submission should be rejected by the backend.

---

# 5. Authentication & Couple System

## Features

- Google OAuth login
- Create couple
- Invite partner
- Join couple using link (session)
- Couple dashboard
- Multiple historical cases

## Technical Methods

- OAuth 2.0
- Authentication
- Authorization
- Sessions / JWT
- REST APIs
- PostgreSQL
- Relational data modelling

## Authorization

The backend must distinguish:

```text
Partner A private data
Partner B private data
Shared case data
Final report

```

Partner A must not be able to access Partner B's private testimony before the appropriate stage.

Frontend hiding is not sufficient.

Authorization must be enforced server-side.

---

# 6. Case Creation

A partner can create a new case.

Example:

```text
CASE #024

Title:
"The Great Dinner Incident"

Optional Context:
"We argued because one person cancelled
dinner plans at the last minute."

```

The backend creates:

- Case ID
- Couple ID
- Creator
- Creation timestamp
- Case state
- Case metadata

Initial state:

```text
CASE_OPEN

```

---

# 7. Initial Independent Testimony

Both partners independently submit their perspective.

They cannot see each other's answers during this stage.

## Questions

### What happened?

Free-text response.

### How did you feel?

Possible selections:

- Angry
- Hurt
- Ignored
- Frustrated
- Disappointed
- Confused
- Embarrassed
- Other

Optional explanation.

### What do you think caused the problem?

Free text.

### How serious was the issue?

1–10 rating.

### What did you want your partner to do instead?

Free text.

### What do you think your partner did wrong?

Free text.

---

# 8. Persistent Court Status Dashboard

The application should have a persistent side panel during the case.

However, because the case only contains one initial submission and one follow-up round, the dashboard should NOT pretend that everything is continuously changing.

Instead, it acts as a **Court Status** panel.

## Court Status

```text
┌─────────────────────────────┐
│       ⚖️ COURT STATUS       │
│                             │
│ TRIAL PROGRESS              │
│ ██████████████░░░░ 70%     │
│                             │
│ CURRENT STAGE               │
│ Follow-up Round             │
│                             │
│ CASE STATUS                 │
│ ✓ A submitted               │
│ ✓ B submitted               │
│ ✓ AI analysis              │
│ ● Follow-up                 │
│ ○ Panel judgement           │
│ ○ Final verdict             │
│                             │
│ CASE PROFILE                │
│ Communication               │
│ Expectations                │
│                             │
│ CONFLICT INTENSITY          │
│ ███████░░░░ 7/10           │
│                             │
│ AI PANEL                    │
│ ⚖️ Jury             Waiting │
│ 👨‍👩‍👧 Counsellor     Waiting │
│ 🧑‍⚖️ Social Worker  Waiting │
│                             │
│ 🔔 NOTIFICATIONS            │
│ • Follow-up available       │
└─────────────────────────────┘

```

## Dashboard components

### Trial Progress

Shows the user's position in the overall workflow.

### Current Stage

Examples:

- Testimony
- AI Analysis
- Follow-up Round
- Panel Deliberation
- Verdict Ready

### Case Status

Shows completed and remaining steps.

### Case Profile

Once analysis is available:


Primary Issue:
Communication

Secondary Issue:
Expectations

Conflict Type:
Misunderstanding

```

This can update after initial analysis and again after the follow-up.

### Conflict Intensity

Example:

███████░░░ 7/10

```

This represents the application's classification of the specific case.


### AI Panel Status

Shows whether each panel member has completed their assessment.

```text
⚖️ Jury             ✓ Ready
👨‍👩‍👧 Counsellor     ✓ Ready
🧑‍⚖️ Social Worker  ✓ Ready


```

### Notifications

Functional case notifications, such as:

- Partner submitted testimony
- AI analysis complete
- Follow-up available
- Follow-up completed
- Panel judgement complete
- Verdict ready

---

# 9. AI Case Analysis

After both initial testimonies are submitted, the backend sends structured information to the AI.

The AI extracts:

```json
{
  "topics": [],
  "emotions": [],
  "discrepancies": [],
  "expectations": [],
  "potential_causes": [],
  "conflict_patterns": [],
  "follow_up_topics": []
}

The AI should return structured output rather than uncontrolled prose.

---

# 10. One Follow-up Round

The AI receives the initial case analysis and selects the most important unresolved questions.

This is the **only follow-up round**.

Each partner receives a limited number of targeted questions.

Recommended:

```text
3- 5 questions per partner

```

Possible question formats:

- Multiple choice
- True / False / Unsure
- 1–10 rating
- Short answer

```

After this:

FOLLOW-UP COMPLETE

No additional questioning is allowed.

```

The case moves to panel judgement.

---

# 11. Argument Stock Market

A humorous visualization showing which issues are prominent in the case.

Example:

```text
ARGUMENT MARKET

Communication      ↑ 23%
Expectations       ↑ 14%
Trust              ↓  8%
Assumptions        ↑ 31%
Stubbornness       ↑ 47%
who is the more winning one
```

These are not financial values.

They represent application-generated classifications and scores.

## Technical Methods

- Structured AI classification
- Scoring algorithms
- SQL aggregation
- Data visualization
- React state

---

# 12. AI Panel

After the follow-up round, the case is reviewed by the AI panel.

The panel consists of three roles.

---

## 12.1 ⚖️ Jury

Focuses on:

- Fairness
- Responsibility
- Actions taken
- Reasonableness
- Consistency between claims

---

## 12.2 👨‍👩‍👧 Family Counsellor

Focuses on:

- Communication
- Emotional needs
- Expectations
- Relationship dynamics
- Escalation
---

## 12.3 🧑‍⚖️ Social Worker

Focuses on:

- External circumstances
- Stress
- Social context
- Family context
- Environmental factors
---

# 13. Panel Disagreement

The panel members do NOT have to agree, they should vote which side they support more which leads to the results. since there are 3 judgement, there is always a winner.


The backend can aggregate these assessments.

---

# 14. Final Court Judgement

The final screen should provide a **clear answer**.

The system must not simply say:

> "Both sides have valid perspectives."

There should be a clear judgement.

Example:

```text
╔══════════════════════════════════╗
║        ⚖️ FINAL VERDICT          ║
╠══════════════════════════════════╣
║                                  ║
║       PARTNER A     PARTNER B    ║
║          43%           57%       ║
║                                  ║
║       ████████    ███████████    ║
║                                  ║
║          PARTNER B               ║
║       MORE RESPONSIBLE           ║
║                                  ║
╚══════════════════════════════════╝

```

The percentage represents:

> **Estimated responsibility for this specific conflict.**

---

# 15. Final Court Summary

Users should NOT have to read three long AI judgements.

The primary result should be a concise synthesized conclusion.

---

# 16. Panel Perspectives

Instead of displaying three full judgements, show a short summary from each character.

The default screen should remain concise.


# 18. Responsibility Calculation

The final responsibility score should be calculated by backend logic.

Example:

```text
Jury:
A 40 / B 60

Family Counsellor:
A 45 / B 55

Social Worker:
A 50 / B 50

```

Final:

```text
Partner A: 45%
Partner B: 55%

```

The initial implementation can use equal weighting.

The LLM should provide the panel assessments.

The backend should calculate the final percentage.

This makes the system:

- Reproducible
- Testable
- Explainable

---

# 19. Key Findings

After the verdict, show the most important findings.

```text
🔍 WHAT THE COURT FOUND

Primary issue:
Communication

Underlying issue:
Different expectations

Main escalation factor:
Assumptions about intent

Biggest misunderstanding:
Partner A interpreted delayed communication
as disregard, while Partner B interpreted
the reaction as lack of trust.

```

This section should be concise and easy to scan.

---

# 20. Feedback and recommendation

Instead of three different sets of advice, synthesize the panel feedback.

## For Partner A

> You were justified in being frustrated, but assuming your partner's intention contributed to the escalation.

## For Partner B

> Your decision may have been reasonable, but you underestimated how the lack of communication affected your partner.

## For Both

> Agree on what should be communicated in similar situations rather than assuming the expectation is obvious.

This is much easier to consume than four separate AI responses.

---



## Individual Suggestions

### Partner A

> Ask about intent before interpreting behaviour as disrespect.

### Partner B

> Communicate changes earlier rather than assuming your partner will understand.

### Together

> Create one clear agreement for how you will handle similar situations next time.

The system should recommend rather than force a resolution.


# 23. Notifications

Notifications should be functional.

Examples:

Partner A has submitted their testimony.

The court has finished analysing the case.
The verdict is ready.

```

Funny variants can be used:

```text
"The court has received both sides of the story."

"The court has finished reading the evidence.
Unfortunately, neither of you looks completely innocent."

"The verdict is ready. Please prepare your ego."

```

MVP:

- Database-backed notification table
- REST API

Optional later:

- WebSockets
- Email
- Push notifications

---

# 24. Final Case Report

The complete case should be saved as a structured report.

```text
CASE REPORT

1. Case Summary

2. Primary Conflict

3. Secondary Issues

4. Emotional Themes

5. Key Discrepancies

6. Follow-up Findings

7. Panel Perspectives

8. Panel Agreement

9. Charges

10. Final Responsibility Percentage

11. Final Verdict

12. Court Summary

14. Feedback


```

The full report can contain more detail than the final judgement screen.

The final screen is optimized for readability.

The report is the detailed historical record.

---

# 25. Charges

The application can assign humorous charges based on structured classifications.

Example:

```text
PARTNER A

⚠️ Assumption of Intent
⚠️ Excessive "Fine."
⚠️ Escalation


PARTNER B

⚠️ Poor Communication
⚠️ Defensive Response
⚠️ Failure to Clarify Expectations


BOTH PARTIES

⚠️ Unnecessary Escalation
⚠️ "You should have known"
⚠️ Bringing up an unrelated incident from 2023

```

Charges are generated from predefined templates and structured AI classifications.

---

# 26. Historical Couple Dashboard

After multiple cases, the couple can view historical data.

Example:

```text
YOUR CASE HISTORY

Cases completed:
8

Most common issue:
Communication

Second:
Expectations

Average responsibility:
A 47%
B 53%

```

Graphs can include:

- Conflict topics over time
- Case intensity
- Perspective accuracy
- Common emotions
- Common issues
- Responsibility distribution
- Recurring conflict patterns


This feature demonstrates:

- SQL
- Data aggregation
- Analytics
- Visualization
- Product analysis

---

# 27. Privacy & Authorization

Relationship information is sensitive.

The application must carefully control access.

Data categories:

```text
Partner A private information
Partner B private information
Shared case information
Final report
Historical analytics

```

Security requirements:

- HTTPS
- Secure authentication
- Authorization
- Access control
- Input validation
- Rate limiting
- Secure logging
- Data deletion
- Minimal data retention
- Avoid unnecessary personal data
- Avoid unnecessary raw testimony in logs

The application should also minimize what is sent to third-party AI services.


# 29. AI Architecture

Do not use one giant prompt.

Use separate structured AI tasks.

```text
CASE
 ↓
AI CASE ANALYSIS
 ↓
Structured Conflict Data
 ↓
FOLLOW-UP QUESTION GENERATOR
 ↓
Partner Answers
 ↓
AI PANEL
 ├── Jury
 ├── Family Counsellor
 ├── Social Worker

 ↓
Structured Panel Results
 ↓
BACKEND AGGREGATION
 ↓
FINAL VERDICT
 ↓
SYNTHESIZED FEEDBACK


```

Each panel member should return structured data.

Example:

```json
{
  "responsibility_partner_a": 45,
  "responsibility_partner_b": 55,
  "primary_issue": "communication",
  "secondary_issues": [
    "expectations",
    "assumptions"
  ],
  "reasoning_summary": "...",
  "feedback_partner_a": "...",
  "feedback_partner_b": "...",
  "recommendations": []
}

```

The backend validates the response before using it.

---

# 31. Event-Driven Architecture

The application can use internal events.

Example:

```text
TESTIMONY_SUBMITTED
        ↓
CASE_READY_FOR_ANALYSIS
        ↓
AI_ANALYSIS_COMPLETED
        ↓
FOLLOW_UP_AVAILABLE
        ↓
FOLLOW_UP_COMPLETED
        ↓
PANEL_JUDGEMENT_STARTED
        ↓
PANEL_JUDGEMENT_COMPLETED
        ↓
VERDICT_GENERATED
        ↓
REPORT_GENERATED

```

Events can trigger:

- Notifications
- AI processing
- Analytics
- Report generation
- Dashboard updates

A full message queue is optional.

---


A complete case can go from creation to final judgement.


the above is my web app
