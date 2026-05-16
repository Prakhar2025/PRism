<p align="center">
  <img src="assets/PRism_Wordmark_GitHub.png" alt="PRism Logo" width="600"/>
</p>

# PRism — Pull Request Intelligence Platform

**AI-powered pull request analysis that makes code reviews self-explaining, risk-scored, and decision-remembered.**

> One-line pitch: PRism makes pull requests self-explaining, risk-scored, and decision-remembered — powered by IBM Bob's full repository intelligence.

---

## The Problem

Every engineering team faces the same daily challenge: the communication and risk gap between the person who writes code and the person who reviews it.

- **4 million PRs** opened daily on GitHub
- **2.5 hours** average review time per reviewer
- **30-40% of all rework** comes from review misunderstandings
- **100% context loss** when engineers leave — no structured capture exists today

All existing AI review tools (CodeRabbit, Sourcery, GitHub Copilot Review) generate AI reviews *for the reviewer*. None of them help the *author* communicate code, quantify risk, score reviewer attention mathematically, or remember architectural decisions permanently.

**That layer is completely unowned. PRism owns it.**

---

## What PRism Does

| Layer | What It Does | When It Runs |
|-------|--------------|--------------|
| **Core Review Brief** | Five-section structured summary — what changed, where to focus, what tradeoffs, what to skip, open questions | Every PR |
| **Risk Intelligence** | Four-dimension risk scoring: Security, Blast Radius, Dependency, Architectural | Every PR |
| **Attention Score AS(f)** | Mathematical per-file priority score telling reviewers exactly where to spend time | Every PR |
| **Decision Memory** | Stores architectural reasoning permanently. Searchable forever: "Why did we switch to Kafka?" | Every PR, queryable anytime |
| **PR Smell Detection** | Flags structural problems before review starts: PR too large, God PR, no tests, merge conflicts incoming | Every PR |
| **Reviewer Matching** | Recommends reviewers based on who actually reviewed this code before — not just who touched the file | Every PR |

---

## The Attention Score Formula

For each file `f` changed in a PR, PRism computes:

```
AS(f) = 0.40 · R(f) + 0.35 · D(f) + 0.25 · C(f)
```

| Variable | Name | Definition |
|----------|------|------------|
| **R(f)** | Risk Score | Combined security and dependency risk for this file (AST pattern analysis + OSV CVE lookup) |
| **D(f)** | Dependency Impact | Weighted betweenness centrality — how many production services depend on this file |
| **C(f)** | Code Churn | Historical instability — how often this file changes and correlates with bug-fix commits |

**Score Interpretation:**

| Score | Label | Reviewer Action |
|-------|-------|-----------------|
| 0.80-1.00 | **CRITICAL** | Review line by line. Do not approve without full understanding. |
| 0.60-0.79 | **HIGH** | Review carefully. Check logic, not just syntax. |
| 0.40-0.59 | **MEDIUM** | Normal review. Look for obvious issues. |
| 0.20-0.39 | **LOW** | Spot check. Confirm overall approach. |
| 0.00-0.19 | **SKIP** | Mechanical change. Approve after confirming intent. |

**Example Output:**
```
Attention Score Map — PR #847 (Authentication Refactor)
auth/middleware.go     AS = 0.91 ± 0.04 [CRITICAL]  Security + 14 dependents + high churn
auth/jwt.go            AS = 0.84 ± 0.06 [CRITICAL]  CVE-adjacent + 8 dependents
services/user/handler  AS = 0.52 ± 0.12 [MEDIUM]    Moderate dependencies
utils/logger.go        AS = 0.11 ± 0.08 [SKIP]      Logging format change only
docs/auth.md           AS = 0.02 ± 0.01 [SKIP]      Documentation update
```

Every score includes a **confidence interval** based on available data (git history depth, dependency graph completeness, pattern match certainty).

---

## System Architecture

```mermaid
graph TB
    User[Developer] -->|Paste PR URL| Frontend[Next.js Frontend]
    Frontend -->|POST /analyze| GoBackend[Go Backend API]
    
    GoBackend -->|Fetch PR Data| GitHub[GitHub API]
    GitHub -->|Diff + Metadata| GoBackend
    
    GoBackend -->|POST /process| AIService[Python AI Service]
    
    AIService -->|Parse AST| TreeSitter[tree-sitter]
    AIService -->|Build Graph| NetworkX[NetworkX]
    AIService -->|Check CVEs| OSV[OSV API]
    AIService -->|Analyze Repo| Bob[IBM Bob]
    AIService -->|Generate Brief| Qwen[Ollama/Qwen2.5-Coder]
    
    TreeSitter -->|Import Graph| AIService
    NetworkX -->|Blast Radius| AIService
    OSV -->|Vulnerability Data| AIService
    Bob -->|Architectural Risk| AIService
    Qwen -->|Review Brief| AIService
    
    AIService -->|Store Decision| PostgreSQL[(PostgreSQL)]
    AIService -->|Complete Analysis| GoBackend
    
    GoBackend -->|JSON Response| Frontend
    Frontend -->|Display| User
    
    style Bob fill:#1f77b4,stroke:#333,stroke-width:3px,color:#fff
    style AIService fill:#2ca02c,stroke:#333,stroke-width:2px
    style GoBackend fill:#ff7f0e,stroke:#333,stroke-width:2px
```

---

## PR Analysis Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Go as Go Backend
    participant GitHub
    participant AI as Python AI Service
    participant Bob as IBM Bob
    participant DB as PostgreSQL

    User->>Frontend: Paste PR URL
    Frontend->>Go: POST /analyze {url}
    Go->>GitHub: Fetch PR diff + metadata
    GitHub-->>Go: Files, commits, reviews
    
    Go->>AI: POST /process {diff, files, repo}
    
    AI->>AI: Parse AST (tree-sitter)
    AI->>AI: Build dependency graph (NetworkX)
    AI->>AI: Compute R(f) - Security Risk
    AI->>AI: Compute D(f) - Blast Radius
    AI->>AI: Compute C(f) - Code Churn
    
    AI->>Bob: Analyze architectural patterns
    Bob-->>AI: Architectural Risk + context
    
    AI->>AI: Calculate AS(f) for each file
    AI->>AI: Detect PR smells
    AI->>AI: Match reviewers
    AI->>AI: Generate Review Brief (Qwen)
    
    AI->>DB: Store Decision Memory
    DB-->>AI: Stored
    
    AI-->>Go: Complete analysis JSON
    Go-->>Frontend: Analysis result
    Frontend-->>User: Display Brief + Scores + Risk
```

---

## Attention Score Calculation Flow

```mermaid
flowchart TD
    Start[File Changed in PR] --> ParseAST[Parse AST with tree-sitter]
    ParseAST --> SecurityPatterns[Match Security Patterns]
    SecurityPatterns --> CheckCVE[Check Dependencies vs OSV]
    CheckCVE --> ComputeR[Compute R f = Security Risk]
    
    ParseAST --> BuildGraph[Build Import Graph]
    BuildGraph --> Centrality[Calculate Betweenness Centrality]
    Centrality --> WeightDeps[Weight by Service Boundary]
    WeightDeps --> ComputeD[Compute D f = Dependency Impact]
    
    Start --> GitLog[Analyze Git History]
    GitLog --> CountCommits[Count Commits Last 90d]
    CountCommits --> BugRatio[Calculate Bug Fix Ratio]
    BugRatio --> ComputeC[Compute C f = Code Churn]
    
    ComputeR --> Combine[AS f = 0.40·R + 0.35·D + 0.25·C]
    ComputeD --> Combine
    ComputeC --> Combine
    
    Combine --> Confidence[Calculate Confidence Interval]
    Confidence --> Label{Score Range?}
    
    Label -->|0.80-1.00| Critical[CRITICAL - Review line by line]
    Label -->|0.60-0.79| High[HIGH - Review carefully]
    Label -->|0.40-0.59| Medium[MEDIUM - Normal review]
    Label -->|0.20-0.39| Low[LOW - Spot check]
    Label -->|0.00-0.19| Skip[SKIP - Mechanical change]
    
    Critical --> Output[Display Score + Label + Confidence]
    High --> Output
    Medium --> Output
    Low --> Output
    Skip --> Output
```

---

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Next.js 14 + Tailwind + shadcn/ui + Framer Motion | SSR performance, production-quality components, smooth visualizations |
| **Backend API** | Go (Golang) | Concurrent GitHub API calls in goroutines. Lightweight. Single binary. |
| **AI Orchestration** | Python FastAPI | IBM Bob integration, tree-sitter AST, semantic search — Python ecosystem |
| **AST Parsing** | tree-sitter (Python bindings) | Parses any language to AST for dependency graph, security patterns |
| **Dependency Graph** | NetworkX (Python) | Lightweight graph library for blast radius traversal and centrality |
| **CVE Lookup** | OSV API (Google) | Free, no key required. Open Source Vulnerabilities database |
| **Local LLM** | IBM Bob + Ollama/Qwen2.5-Coder | Bob for repo-context analysis. Qwen for Brief generation. Zero API cost. |
| **Database** | PostgreSQL | Decision Memory, PR history, team settings, velocity metrics |
| **Deployment** | Docker + Railway | One command local setup. Free tier production deploy |

---

## IBM Bob Integration

**What makes PRism uniquely powerful:** Most AI review tools see only the diff — the lines that changed. IBM Bob sees the entire repository.

**Bob powers Architectural Risk analysis:**
- Understands which functions are called by 40 other places vs. called by nobody
- Understands the history of a module — if auth has been unstable, Bob flags it
- Understands architectural patterns — if the PR introduces a new pattern inconsistent with the codebase, Bob surfaces it

**Without full repository context, AI review is just reading the diff in isolation. Bob makes PRism's analysis genuinely intelligent, not syntactic.**

Example Bob analysis:
```
Architectural Risk: HIGH

This PR introduces a new database access pattern that bypasses 
the established repository layer used consistently across 47 other 
service files. This creates:

1. Inconsistent data access patterns (47 files use repo layer, 
   this PR directly queries)
2. Potential for SQL injection (repo layer has parameterization, 
   direct queries do not)
3. Future maintenance burden (2 patterns to maintain instead of 1)

Recommendation: Refactor to use existing UserRepository.FindByEmail() 
instead of direct SQL query.
```

---

## Local Setup

### Prerequisites
- Docker and Docker Compose
- Git
- IBM Bob CLI (for hackathon submission)

### Quick Start

```bash
# Clone repository
git clone https://github.com/Prakhar2025/PRism.git
cd prism

# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# Go Backend: http://localhost:8080
# Python AI Service: http://localhost:8000
```

### Environment Variables

Create `.env` file:
```bash
# GitHub API (for fetching PR data)
GITHUB_TOKEN=your_github_personal_access_token

# PostgreSQL
DATABASE_URL=postgresql://prism:prism@postgres:5432/prism

# Ollama (local LLM)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

### Development

```bash
# Frontend development
cd frontend
npm install
npm run dev

# Go backend development
cd backend
go mod download
go run main.go

# Python AI service development
cd ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Usage

1. **Open PRism** at `http://localhost:3000`
2. **Paste a GitHub PR URL** (e.g., `https://github.com/owner/repo/pull/123`)
3. **Click "Analyze"**
4. **Review the output:**
   - Core Review Brief (5 sections)
   - Risk Intelligence (4 dimensions)
   - Attention Score Map (per-file priorities)
   - PR Smell Detection (structural issues)
   - Reviewer Matching (recommended reviewers)
   - Merge Readiness (Green/Yellow/Red gate)

---

## Live Demo

🚀 **[https://prism-demo.railway.app](https://prism-demo.railway.app)** (placeholder — will be live after deployment)

Try it with any public GitHub PR:
- `https://github.com/facebook/react/pull/28000`
- `https://github.com/golang/go/pull/60000`
- `https://github.com/microsoft/vscode/pull/180000`

---

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** — System design, data flow, component responsibilities
- **[Math Specification](docs/MATH.md)** — Complete Attention Score formula derivation
- **[API Reference](docs/API.md)** — All endpoints with request/response contracts

---

## Roadmap

**MVP (48 hours — Hackathon):**
- ✅ Core Review Brief generation
- ✅ Risk Intelligence (4 dimensions)
- ✅ Attention Score calculation
- ✅ PR Smell Detection
- ✅ Decision Memory storage
- ✅ Reviewer Matching
- ✅ Merge Readiness gate

**Post-Hackathon:**
- GitHub App integration (webhook-based, no manual URL paste)
- Team analytics dashboard (velocity metrics, review time trends)
- Custom risk weight configuration per team
- Slack/Discord notifications
- Multi-repo Decision Memory search
- Historical PR similarity detection

---

## Contributing

PRism is built for the IBM Bob Hackathon 2026. Contributions welcome after hackathon submission.

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with:
- **IBM Bob** — Repository intelligence platform
- **tree-sitter** — Universal AST parsing
- **OSV** — Open Source Vulnerabilities database
- **Ollama** — Local LLM inference

---

**PRism** — Because every pull request deserves to be understood.