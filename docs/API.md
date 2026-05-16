# PRism API Reference

Complete API documentation for all PRism services with exact request/response contracts.

---

## Table of Contents

1. [Go Backend API](#go-backend-api)
2. [Python AI Service API](#python-ai-service-api)
3. [Error Responses](#error-responses)
4. [Rate Limiting](#rate-limiting)
5. [Authentication](#authentication)

---

## Go Backend API

**Base URL:** `http://localhost:8080` (development) | `https://prism-api.railway.app` (production)

### POST /analyze

Analyze a GitHub pull request and return complete PRism intelligence.

**Request:**

```json
{
  "url": "https://github.com/facebook/react/pull/28000",
  "options": {
    "include_decision_memory": true,
    "risk_threshold": 0.6,
    "alpha": 0.40,
    "beta": 0.35,
    "gamma": 0.25
  }
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Full GitHub PR URL (format: `https://github.com/{owner}/{repo}/pull/{number}`) |
| `options.include_decision_memory` | boolean | No | Whether to store this PR in Decision Memory (default: `true`) |
| `options.risk_threshold` | float | No | Minimum risk score to flag (0.0-1.0, default: `0.6`) |
| `options.alpha` | float | No | Risk weight in AS(f) formula (default: `0.40`) |
| `options.beta` | float | No | Dependency weight in AS(f) formula (default: `0.35`) |
| `options.gamma` | float | No | Churn weight in AS(f) formula (default: `0.25`) |

**Response (200 OK):**

```json
{
  "pr_metadata": {
    "number": 28000,
    "title": "Fix hydration mismatch in Suspense boundaries",
    "author": "gaearon",
    "created_at": "2026-05-10T14:23:00Z",
    "updated_at": "2026-05-15T16:45:00Z",
    "state": "open",
    "repository": {
      "owner": "facebook",
      "name": "react",
      "full_name": "facebook/react",
      "language": "JavaScript",
      "default_branch": "main"
    },
    "stats": {
      "files_changed": 5,
      "additions": 127,
      "deletions": 43,
      "commits": 3
    }
  },
  "review_brief": {
    "change_summary": "This PR fixes a hydration mismatch bug that occurs when Suspense boundaries are nested inside Server Components. The issue manifested as a console warning during client-side hydration, caused by mismatched DOM structure between server and client renders. The fix adds a runtime check to detect nested Suspense boundaries and adjusts the hydration algorithm to handle them correctly.",
    "focus_areas": [
      {
        "file": "packages/react-dom/src/client/ReactDOMHostConfig.js",
        "lines": "247-289",
        "priority": "CRITICAL",
        "attention_score": 0.91,
        "reason": "Core hydration logic with 14 direct dependents across react-dom and react-native-web. Changes here affect all SSR applications."
      },
      {
        "file": "packages/react-reconciler/src/ReactFiberHydrationContext.js",
        "lines": "156-178",
        "priority": "HIGH",
        "attention_score": 0.74,
        "reason": "Suspense boundary detection logic. Historically unstable file with 8 bug fixes in last 90 days."
      }
    ],
    "tradeoffs_made": "Chose to add a runtime check instead of a compile-time transformation because: (1) Compile-time detection would require full AST traversal of user code, adding significant build time overhead. (2) Runtime check has negligible performance impact (<0.1ms per boundary). (3) Runtime approach works with dynamically imported components where compile-time analysis is impossible.",
    "what_to_skip": [
      "docs/README.md — Documentation update only, no code changes",
      "packages/react/index.js — Re-export only, no logic changes",
      "scripts/rollup/bundles.js — Build configuration, no runtime impact"
    ],
    "open_questions": [
      "Should we backport this fix to React 17? The bug exists there but is less common.",
      "Does this affect Server Components in the new architecture? Need to test with RSC.",
      "Should we add a DevTools warning when nested Suspense is detected?"
    ]
  },
  "risk_intelligence": {
    "overall_risk": "MEDIUM",
    "overall_score": 0.58,
    "dimensions": {
      "security_risk": {
        "level": "LOW",
        "score": 0.12,
        "findings": [],
        "details": "No security patterns detected. Changes are isolated to rendering logic with no authentication, authorization, or data access implications."
      },
      "blast_radius": {
        "level": "HIGH",
        "score": 0.78,
        "direct_dependents": 14,
        "transitive_dependents": 47,
        "services_affected": [
          "react-dom (SSR)",
          "react-native-web",
          "react-server-dom-webpack"
        ],
        "details": "ReactDOMHostConfig.js is a core module imported by all server-side rendering paths. A regression here would affect every SSR application using React 18+."
      },
      "dependency_risk": {
        "level": "NONE",
        "score": 0.0,
        "new_packages": [],
        "updated_packages": [],
        "cves_found": [],
        "details": "No dependency changes in this PR."
      },
      "architectural_risk": {
        "level": "MEDIUM",
        "score": 0.45,
        "bob_analysis": "This PR introduces a new runtime check pattern in the hydration path. Analysis of the codebase shows 23 other runtime checks in the reconciler, but none specifically for nested Suspense boundaries. The pattern is consistent with existing error boundary checks (see ReactFiberErrorBoundary.js lines 89-112). However, this adds a new code path that executes on every hydration, which could have performance implications at scale. Recommendation: Add performance benchmark before merge to confirm <0.1ms overhead claim.",
        "pattern_consistency": "CONSISTENT",
        "concerns": [
          "New code path in hot rendering loop (executes per component)",
          "No existing test coverage for nested Suspense + SSR combination",
          "Potential interaction with Concurrent Features (Transitions, startTransition)"
        ]
      }
    }
  },
  "attention_scores": [
    {
      "file": "packages/react-dom/src/client/ReactDOMHostConfig.js",
      "score": 0.91,
      "confidence_interval": 0.04,
      "confidence_level": "HIGH",
      "label": "CRITICAL",
      "components": {
        "risk": 0.34,
        "dependency": 0.39,
        "churn": 0.18
      },
      "details": {
        "risk_breakdown": {
          "security_patterns": 0,
          "dependency_cves": 0,
          "total_risk": 0.34
        },
        "dependency_breakdown": {
          "direct_dependents": 14,
          "transitive_dependents": 47,
          "production_services": 8,
          "internal_libraries": 4,
          "test_files": 2
        },
        "churn_breakdown": {
          "total_commits": 127,
          "commits_last_90_days": 18,
          "bug_fix_commits": 34,
          "bug_fix_ratio": 0.268
        }
      }
    },
    {
      "file": "packages/react-reconciler/src/ReactFiberHydrationContext.js",
      "score": 0.74,
      "confidence_interval": 0.06,
      "confidence_level": "HIGH",
      "label": "HIGH",
      "components": {
        "risk": 0.28,
        "dependency": 0.31,
        "churn": 0.15
      },
      "details": {
        "risk_breakdown": {
          "security_patterns": 0,
          "dependency_cves": 0,
          "total_risk": 0.28
        },
        "dependency_breakdown": {
          "direct_dependents": 8,
          "transitive_dependents": 23,
          "production_services": 5,
          "internal_libraries": 2,
          "test_files": 1
        },
        "churn_breakdown": {
          "total_commits": 89,
          "commits_last_90_days": 12,
          "bug_fix_commits": 23,
          "bug_fix_ratio": 0.258
        }
      }
    },
    {
      "file": "packages/react/index.js",
      "score": 0.11,
      "confidence_interval": 0.08,
      "confidence_level": "MEDIUM",
      "label": "SKIP",
      "components": {
        "risk": 0.0,
        "dependency": 0.08,
        "churn": 0.03
      },
      "details": {
        "risk_breakdown": {
          "security_patterns": 0,
          "dependency_cves": 0,
          "total_risk": 0.0
        },
        "dependency_breakdown": {
          "direct_dependents": 2,
          "transitive_dependents": 5,
          "production_services": 0,
          "internal_libraries": 2,
          "test_files": 0
        },
        "churn_breakdown": {
          "total_commits": 45,
          "commits_last_90_days": 3,
          "bug_fix_commits": 2,
          "bug_fix_ratio": 0.044
        }
      }
    },
    {
      "file": "docs/README.md",
      "score": 0.02,
      "confidence_interval": 0.01,
      "confidence_level": "HIGH",
      "label": "SKIP",
      "components": {
        "risk": 0.0,
        "dependency": 0.0,
        "churn": 0.02
      },
      "details": {
        "risk_breakdown": {
          "security_patterns": 0,
          "dependency_cves": 0,
          "total_risk": 0.0
        },
        "dependency_breakdown": {
          "direct_dependents": 0,
          "transitive_dependents": 0,
          "production_services": 0,
          "internal_libraries": 0,
          "test_files": 0
        },
        "churn_breakdown": {
          "total_commits": 234,
          "commits_last_90_days": 8,
          "bug_fix_commits": 0,
          "bug_fix_ratio": 0.0
        }
      }
    }
  ],
  "pr_smells": [
    {
      "type": "HIGH_CHURN_NO_REVIEW",
      "severity": "MEDIUM",
      "message": "ReactFiberHydrationContext.js has high churn (C=0.72) with 8 bug fixes in last 90 days, but no senior reviewer assigned yet",
      "recommendation": "Request review from @sebmarkbage or @acdlite who have reviewed this file 12+ times",
      "affected_files": [
        "packages/react-reconciler/src/ReactFiberHydrationContext.js"
      ]
    },
    {
      "type": "NO_TESTS_ADDED",
      "severity": "HIGH",
      "message": "Logic files changed but no test files added or modified",
      "recommendation": "Add test coverage for nested Suspense + SSR scenario in packages/react-dom/src/__tests__/",
      "affected_files": [
        "packages/react-dom/src/client/ReactDOMHostConfig.js",
        "packages/react-reconciler/src/ReactFiberHydrationContext.js"
      ]
    }
  ],
  "reviewer_recommendations": [
    {
      "username": "sebmarkbage",
      "github_url": "https://github.com/sebmarkbage",
      "reason": "Reviewed 12 past PRs touching ReactDOMHostConfig.js with average 15 substantive comments per review. Domain expert in SSR and hydration.",
      "confidence": 0.94,
      "review_history": {
        "total_reviews": 12,
        "avg_comments_per_review": 15,
        "last_review_date": "2026-04-28T10:15:00Z",
        "approval_rate": 0.83
      },
      "availability": {
        "open_prs_reviewing": 2,
        "estimated_bandwidth": "MEDIUM"
      }
    },
    {
      "username": "acdlite",
      "github_url": "https://github.com/acdlite",
      "reason": "Reviewed 8 past PRs touching ReactFiberHydrationContext.js. Original author of Suspense implementation.",
      "confidence": 0.87,
      "review_history": {
        "total_reviews": 8,
        "avg_comments_per_review": 11,
        "last_review_date": "2026-05-02T14:30:00Z",
        "approval_rate": 0.75
      },
      "availability": {
        "open_prs_reviewing": 4,
        "estimated_bandwidth": "LOW"
      }
    },
    {
      "username": "gaearon",
      "github_url": "https://github.com/gaearon",
      "reason": "Frequent contributor to hydration logic. Reviewed 6 related PRs in last 6 months.",
      "confidence": 0.72,
      "review_history": {
        "total_reviews": 6,
        "avg_comments_per_review": 8,
        "last_review_date": "2026-05-10T09:00:00Z",
        "approval_rate": 0.83
      },
      "availability": {
        "open_prs_reviewing": 1,
        "estimated_bandwidth": "HIGH"
      }
    }
  ],
  "merge_readiness": {
    "status": "YELLOW",
    "score": 0.67,
    "can_merge": false,
    "blocking_reasons": [
      "ReactDOMHostConfig.js (AS=0.91, CRITICAL) has 0 review comments from recommended reviewers",
      "NO_TESTS_ADDED smell detected — high severity",
      "Architectural risk flagged by IBM Bob — performance benchmark required"
    ],
    "passing_checks": [
      "CI passing (all 847 tests green)",
      "2 approvals received (sophiebits, rickhanlonii)",
      "All conversation threads resolved",
      "No merge conflicts detected",
      "Branch is up to date with main"
    ],
    "warnings": [
      "PR opened on Friday at 4:17pm — consider delaying merge to Monday",
      "2 other open PRs touch ReactDOMHostConfig.js — potential merge conflict risk"
    ],
    "recommendations": [
      "Request review from @sebmarkbage (highest confidence match)",
      "Add test coverage for nested Suspense + SSR",
      "Run performance benchmark to confirm <0.1ms overhead claim",
      "Consider splitting documentation changes into separate PR"
    ]
  },
  "decision_memory": {
    "stored": true,
    "decision_id": "dec_a1b2c3d4",
    "summary": "Added runtime check for nested Suspense boundaries during hydration to fix mismatch bug in SSR applications",
    "tags": [
      "hydration",
      "suspense",
      "ssr",
      "react-dom",
      "bug-fix",
      "runtime-check"
    ]
  },
  "processing_time_ms": 3847,
  "metadata": {
    "prism_version": "1.0.0",
    "analyzed_at": "2026-05-16T09:15:00Z",
    "bob_session_id": "sess_abc123def456",
    "ollama_model": "qwen2.5-coder:7b",
    "tree_sitter_languages": [
      "javascript",
      "typescript"
    ],
    "graph_stats": {
      "nodes": 847,
      "edges": 1203,
      "max_centrality": 0.018
    }
  }
}
```

**Error Responses:**

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "URL must match format: https://github.com/{owner}/{repo}/pull/{number}",
    "details": {
      "provided_url": "https://github.com/facebook/react/issues/28000",
      "expected_format": "https://github.com/{owner}/{repo}/pull/{number}"
    }
  }
}
```

```json
{
  "error": {
    "code": "PR_NOT_FOUND",
    "message": "Pull request not found or not accessible",
    "details": {
      "owner": "facebook",
      "repo": "react",
      "pr_number": 99999,
      "github_status": 404
    }
  }
}
```

```json
{
  "error": {
    "code": "GITHUB_RATE_LIMIT",
    "message": "GitHub API rate limit exceeded",
    "details": {
      "limit": 5000,
      "remaining": 0,
      "reset_at": "2026-05-16T10:00:00Z"
    }
  }
}
```

---

### GET /health

Health check endpoint for monitoring.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "prism-backend",
  "version": "1.0.0",
  "uptime_seconds": 3847,
  "dependencies": {
    "github_api": {
      "status": "healthy",
      "latency_ms": 145,
      "rate_limit_remaining": 4823
    },
    "ai_service": {
      "status": "healthy",
      "latency_ms": 23,
      "url": "http://localhost:8000"
    },
    "database": {
      "status": "healthy",
      "latency_ms": 8,
      "connection_pool": {
        "active": 3,
        "idle": 7,
        "max": 10
      }
    }
  },
  "timestamp": "2026-05-16T09:15:00Z"
}
```

**Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "service": "prism-backend",
  "version": "1.0.0",
  "dependencies": {
    "github_api": {
      "status": "healthy",
      "latency_ms": 145
    },
    "ai_service": {
      "status": "unhealthy",
      "error": "Connection refused",
      "url": "http://localhost:8000"
    },
    "database": {
      "status": "healthy",
      "latency_ms": 8
    }
  },
  "timestamp": "2026-05-16T09:15:00Z"
}
```

---

## Python AI Service API

**Base URL:** `http://localhost:8000` (development) | Internal only in production

### POST /process

Process PR data and return complete analysis.

**Request:**

```json
{
  "pr_number": 28000,
  "repository": {
    "owner": "facebook",
    "name": "react",
    "default_branch": "main",
    "language": "JavaScript",
    "clone_url": "https://github.com/facebook/react.git"
  },
  "files": [
    {
      "filename": "packages/react-dom/src/client/ReactDOMHostConfig.js",
      "status": "modified",
      "additions": 47,
      "deletions": 12,
      "patch": "@@ -245,10 +245,15 @@ export function prepareToHydrateHostInstance(\n   instance: Instance,\n   type: string,\n   props: Props,\n ): boolean {\n+  // Check for nested Suspense boundaries\n+  if (isSuspenseBoundary(instance)) {\n+    validateNestedSuspense(instance, props);\n+  }\n+\n   const hydratable = hydrateInstance(\n     instance,\n     type,\n     props,\n   );\n   return hydratable;\n }",
      "blob_url": "https://github.com/facebook/react/blob/abc123/packages/react-dom/src/client/ReactDOMHostConfig.js"
    }
  ],
  "commits": [
    {
      "sha": "abc123def456",
      "message": "Fix hydration mismatch in nested Suspense boundaries",
      "author": "gaearon",
      "date": "2026-05-15T10:30:00Z"
    }
  ],
  "reviews": [
    {
      "user": "sophiebits",
      "state": "APPROVED",
      "submitted_at": "2026-05-15T14:20:00Z",
      "body": "LGTM with one suggestion about test coverage"
    }
  ],
  "options": {
    "include_decision_memory": true,
    "risk_threshold": 0.6,
    "alpha": 0.40,
    "beta": 0.35,
    "gamma": 0.25
  }
}
```

**Response (200 OK):**

Same structure as Go Backend `/analyze` response (see above), but without `pr_metadata` field.

---

### POST /search

Search Decision Memory for past architectural decisions.

**Request:**

```json
{
  "query": "Why did we switch from Redux to Context API?",
  "repository": "facebook/react",
  "limit": 10,
  "filters": {
    "tags": ["state-management", "architecture"],
    "date_range": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2026-05-16T00:00:00Z"
    }
  }
}
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "decision_id": "dec_x1y2z3",
      "pr_number": 24567,
      "repository": "facebook/react",
      "title": "Migrate state management from Redux to Context API",
      "decision_summary": "Migrated application state management from Redux to React Context API to reduce bundle size and simplify state updates. Redux added 45KB to bundle and required significant boilerplate for simple state updates.",
      "reasoning": "Context API provides sufficient functionality for our use case (global theme, user preferences, feature flags). We don't need Redux's time-travel debugging or middleware ecosystem. Context API is built into React, reducing dependencies and bundle size.",
      "alternatives_rejected": [
        "Keep Redux — rejected due to bundle size and complexity",
        "Zustand — rejected because Context API is sufficient and built-in",
        "Recoil — rejected due to experimental status and learning curve"
      ],
      "affected_components": [
        "src/store/",
        "src/contexts/",
        "src/hooks/useTheme.js",
        "src/hooks/useUser.js"
      ],
      "risk_accepted": "Context API re-renders more components than Redux with proper memoization. Accepted because our component tree is shallow and performance impact is negligible (<5ms).",
      "reviewer_signoff": [
        "sophiebits",
        "gaearon"
      ],
      "tags": [
        "state-management",
        "architecture",
        "context-api",
        "redux",
        "bundle-size"
      ],
      "created_at": "2025-11-15T10:30:00Z",
      "pr_url": "https://github.com/facebook/react/pull/24567",
      "similarity_score": 0.92
    },
    {
      "decision_id": "dec_a2b3c4",
      "pr_number": 23456,
      "repository": "facebook/react",
      "title": "Add useReducer hook for complex state logic",
      "decision_summary": "Added useReducer hook as alternative to useState for components with complex state transitions. Provides Redux-like reducer pattern without external dependency.",
      "reasoning": "Many components had complex useState logic with multiple related state variables. useReducer provides clearer state update logic and better testability.",
      "alternatives_rejected": [
        "Keep complex useState — rejected due to readability issues",
        "Add Redux for these components — rejected as overkill"
      ],
      "affected_components": [
        "packages/react/src/ReactHooks.js",
        "packages/react-reconciler/src/ReactFiberHooks.js"
      ],
      "risk_accepted": "None — useReducer is a pure addition with no breaking changes.",
      "reviewer_signoff": [
        "acdlite",
        "sebmarkbage"
      ],
      "tags": [
        "hooks",
        "state-management",
        "usereducer",
        "api-addition"
      ],
      "created_at": "2025-08-22T14:15:00Z",
      "pr_url": "https://github.com/facebook/react/pull/23456",
      "similarity_score": 0.78
    }
  ],
  "total_results": 2,
  "query_time_ms": 145
}
```

---

### GET /health

Health check endpoint for AI service.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "prism-ai",
  "version": "1.0.0",
  "uptime_seconds": 7234,
  "dependencies": {
    "ollama": {
      "status": "healthy",
      "model": "qwen2.5-coder:7b",
      "latency_ms": 234,
      "url": "http://localhost:11434"
    },
    "bob": {
      "status": "healthy",
      "session_active": true,
      "session_id": "sess_abc123",
      "latency_ms": 456
    },
    "database": {
      "status": "healthy",
      "latency_ms": 12,
      "connection_pool": {
        "active": 2,
        "idle": 8,
        "max": 10
      }
    },
    "osv_api": {
      "status": "healthy",
      "latency_ms": 89,
      "url": "https://api.osv.dev"
    }
  },
  "tree_sitter": {
    "languages_available": [
      "javascript",
      "typescript",
      "python",
      "go",
      "java",
      "rust",
      "c",
      "cpp"
    ]
  },
  "timestamp": "2026-05-16T09:15:00Z"
}
```

---

## Error Responses

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    },
    "timestamp": "2026-05-16T09:15:00Z",
    "request_id": "req_abc123"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_URL` | PR URL format is invalid |
| 400 | `INVALID_OPTIONS` | Options object contains invalid values |
| 400 | `MISSING_REQUIRED_FIELD` | Required field is missing from request |
| 401 | `UNAUTHORIZED` | GitHub token is missing or invalid |
| 403 | `FORBIDDEN` | GitHub token lacks required permissions |
| 404 | `PR_NOT_FOUND` | Pull request does not exist or is not accessible |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests (see Rate Limiting section) |
| 429 | `GITHUB_RATE_LIMIT` | GitHub API rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Dependent service (AI, database, GitHub) is unavailable |
| 504 | `TIMEOUT` | Request took longer than 30 seconds |

---

## Rate Limiting

### Go Backend Rate Limits

- **100 requests per hour per IP address**
- **1000 requests per hour per authenticated user** (future: when user auth is added)

**Rate Limit Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1715857200
```

**Rate Limit Exceeded Response (429):**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 minutes.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2026-05-16T10:00:00Z"
    }
  }
}
```

### GitHub API Rate Limits

PRism respects GitHub's rate limits:
- **5000 requests per hour** for authenticated requests
- **60 requests per hour** for unauthenticated requests

When GitHub rate limit is exceeded, PRism returns:

```json
{
  "error": {
    "code": "GITHUB_RATE_LIMIT",
    "message": "GitHub API rate limit exceeded. Try again after reset time.",
    "details": {
      "limit": 5000,
      "remaining": 0,
      "reset_at": "2026-05-16T10:00:00Z",
      "documentation_url": "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"
    }
  }
}
```

---

## Authentication

### GitHub Personal Access Token

PRism requires a GitHub Personal Access Token with the following scopes:

**Required Scopes:**
- `repo` (or `public_repo` for public repositories only)
- `read:user`

**Token Configuration:**

Set the token as an environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Or pass it in the request header:

```
Authorization: Bearer ghp_your_token_here
```

**Token Validation:**

PRism validates the token on startup and returns an error if invalid:

```json
{
  "error": {
    "code": "INVALID_GITHUB_TOKEN",
    "message": "GitHub token is invalid or has insufficient permissions",
    "details": {
      "required_scopes": ["repo", "read:user"],
      "documentation_url": "https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
    }
  }
}
```

---

## Request/Response Examples

### Example 1: Analyze a Small PR

**Request:**

```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/facebook/react/pull/28000"
  }'
```

**Response:** (See full response structure above)

---

### Example 2: Analyze with Custom Weights

**Request:**

```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/facebook/react/pull/28000",
    "options": {
      "alpha": 0.60,
      "beta": 0.25,
      "gamma": 0.15,
      "risk_threshold": 0.7
    }
  }'
```

This increases the weight on security risk (alpha=0.60) for security-critical teams.

---

### Example 3: Search Decision Memory

**Request:**

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Why did we choose PostgreSQL over MongoDB?",
    "repository": "mycompany/backend",
    "limit": 5
  }'
```

**Response:**

```json
{
  "results": [
    {
      "decision_id": "dec_db_choice",
      "pr_number": 1234,
      "repository": "mycompany/backend",
      "title": "Migrate from MongoDB to PostgreSQL",
      "decision_summary": "Migrated from MongoDB to PostgreSQL for better transaction support and data consistency guarantees.",
      "reasoning": "MongoDB's eventual consistency model caused data integrity issues in payment processing. PostgreSQL's ACID guarantees and foreign key constraints prevent these issues.",
      "alternatives_rejected": [
        "Keep MongoDB with stronger consistency settings — rejected due to performance impact",
        "MySQL — rejected due to inferior JSON support compared to PostgreSQL"
      ],
      "affected_components": [
        "src/database/",
        "src/models/",
        "src/repositories/"
      ],
      "risk_accepted": "Migration downtime of 2 hours during off-peak. Accepted because data integrity is critical.",
      "reviewer_signoff": [
        "tech-lead",
        "cto"
      ],
      "tags": [
        "database",
        "postgresql",
        "mongodb",
        "migration",
        "architecture"
      ],
      "created_at": "2025-09-10T08:00:00Z",
      "pr_url": "https://github.com/mycompany/backend/pull/1234",
      "similarity_score": 0.95
    }
  ],
  "total_results": 1,
  "query_time_ms": 123
}
```

---

### Example 4: Health Check

**Request:**

```bash
curl http://localhost:8080/health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "prism-backend",
  "version": "1.0.0",
  "uptime_seconds": 3847,
  "dependencies": {
    "github_api": {
      "status": "healthy",
      "latency_ms": 145,
      "rate_limit_remaining": 4823
    },
    "ai_service": {
      "status": "healthy",
      "latency_ms": 23,
      "url": "http://localhost:8000"
    },
    "database": {
      "status": "healthy",
      "latency_ms": 8,
      "connection_pool": {
        "active": 3,
        "idle": 7,
        "max": 10
      }
    }
  },
  "timestamp": "2026-05-16T09:15:00Z"
}
```

---

## WebSocket API (Future)

**Note:** WebSocket support is planned for real-time analysis progress updates but not included in MVP.

**Planned Endpoint:** `ws://localhost:8080/analyze/stream`

**Planned Message Format:**

```json
{
  "type": "progress",
  "stage": "parsing_ast",
  "progress": 0.35,
  "message": "Parsing AST for 5 files...",
  "timestamp": "2026-05-16T09:15:23Z"
}
```

---

## API Versioning

Current API version: **v1**

All endpoints are currently unversioned. Future versions will use URL path versioning:

- `http://localhost:8080/v1/analyze`
- `http://localhost:8080/v2/analyze`

Breaking changes will increment the major version number.

---

## CORS Configuration

**Allowed Origins (Development):**
- `http://localhost:3000` (Next.js frontend)
- `http://127.0.0.1:3000`

**Allowed Origins (Production):**
- `https://prism-demo.railway.app`
- Custom domains configured via environment variable

**Allowed Methods:**
- `GET`, `POST`, `OPTIONS`

**Allowed Headers:**
- `Content-Type`, `Authorization`

---

## Performance Targets

| Endpoint | Target Latency (P95) | Target Throughput |
|----------|---------------------|-------------------|
| `POST /analyze` | < 5 seconds | 50 concurrent requests |
| `POST /process` | < 4 seconds | 50 concurrent requests |
| `POST /search` | < 200ms | 100 requests/second |
| `GET /health` | < 50ms | 1000 requests/second |

---

**API designed for:** Developer-friendly integration, clear error messages, and production-ready performance.