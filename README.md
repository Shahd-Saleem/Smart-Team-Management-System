# SmartTeam — Intelligent Team Formation Engine

**SmartTeam** is an end-to-end full-stack JavaScript application backed by a Java unit testing suite. It uses psychological profile analytics (Big Five personality framework), technical skill mapping, and experience balancing to automatically formulate optimal, balanced project teams.

---

## Features

- **Automated Team Balancing Engine:** Evaluates candidate Big Five traits (*Openness*, *Conscientiousness*, *Extraversion*, *Agreeableness*, *Neuroticism*) and technical skills to form diverse, compatible teams.
- **Smart Role Assignment:** Auto-assigns members to roles (`Leader`, `Developer`, `Tester`, `Analyst`, `Contributor`) based on trait and skill alignments.
- **Project & Progress Dashboard:** 
  - **Managers:** Create projects, manage member enrollments, trigger team generation, and track project completion rates.
  - **Members:** Take personality & technical quizzes, view top personality strengths, track task execution, and provide feedback.
- **Persisted State Simulation:** Leverages `localStorage` for modular user authentication, session handling, project state, and task assignments.
- **Java Skill-Coverage Testing:** Includes an algorithmic unit test suite written in Java (`SkillCoverageTest.java`) to calculate exact skill coverage ratios across teams.

---

## Project Architecture

```text
.
├── index.html              # Main single-page application (UI markup & styles)
├── app.js                  # Frontend controllers, event handling & view switching
├── api.js                  # LocalStorage API abstraction layer (CRUD actions)
├── teamFormation.js        # Core algorithm for team generation & role mapping
└── SkillCoverageTest.java  # Java algorithm unit testing suite for skill coverage
```

---

## Getting Started

### 1. Running the Web Application

Because the project uses standard ES Module imports (`import * as api from './api.js'`), it must be served through a local HTTP server rather than opened as a local file (`file://`).

#### Option A: Live Server (VS Code)
1. Open the project directory in **Visual Studio Code**.
2. Install the **Live Server** extension.
3. Right-click `index.html` and click **"Open with Live Server"**.

#### Option B: Node.js `npx http-server`
```bash
npx http-server . -o
```

---

### 2. Running the Java Test Suite

To run the unit tests for the team skill coverage logic:

```bash
# Compile the Java test class
javac SkillCoverageTest.java

# Execute the test suite
java SkillCoverageTest
```

#### Example Output:
```text
Test 1: Partial Skill Match passed.
Test 2: Perfect Skill Match passed.
Test 3: Zero Skill Match passed.
Test 4: No Requirements passed.
All tests executed.
```

---

## Trait & Role Mapping Guide

The platform maps candidate traits directly to optimal team roles to promote harmony and high output:

| Role | Primary Traits / Skill Requirements | Key Strengths |
| :--- | :--- | :--- |
| **Leader** | High Extraversion, High Conscientiousness, Low Neuroticism | Clear Communication, Reliability |
| **Developer** | `coding` skill + High Conscientiousness & Openness | Analytical, Execution & Precision |
| **Tester** | `testing` skill + High Conscientiousness & Agreeableness | Quality Assurance & Precision |
| **Analyst** | `analysis` skill + High Openness & Conscientiousness | Creative Problem Solving & Logic |
| **Contributor**| Extra members assigned to teams larger than 4 | General Execution & Support |

---

## Key Requirements & Business Rules

1. **Minimum Team Size:** Team size must be set to **2 or greater**.
2. **Divisibility Rule:** Total enrolled members **must divide evenly** by the specified project `teamSize` before team generation can occur.
3. **Quiz Completion:** Members must complete their Personality Assessment before enrolling in projects or participating in team generation.
