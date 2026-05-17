import os
import json
import logging
from typing import Dict, List, Any, Optional

try:
    import psycopg2
    from psycopg2.extras import Json
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

logger = logging.getLogger(__name__)

# Neon (and all serverless PostgreSQL) closes idle connections.
# Fix: NEVER hold a persistent connection. Connect fresh per operation.
_DATABASE_URL = os.environ.get('DATABASE_URL', '')
_db_available = False


def _get_connection():
    """Open a fresh connection. Caller must close it."""
    return psycopg2.connect(_DATABASE_URL)


def _init():
    """Test the connection on startup and create tables."""
    global _db_available

    if not PSYCOPG2_AVAILABLE:
        logger.warning("psycopg2 not installed — decision memory disabled")
        return

    if not _DATABASE_URL or 'your_neon' in _DATABASE_URL:
        logger.info("DATABASE_URL not set — decision memory disabled")
        return

    try:
        conn = _get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS decisions (
                    id SERIAL PRIMARY KEY,
                    pr_url TEXT NOT NULL,
                    repo TEXT NOT NULL,
                    pr_number INT NOT NULL,
                    pr_title TEXT,
                    decision_summary TEXT,
                    reasoning TEXT,
                    tradeoffs TEXT,
                    affected_files TEXT[],
                    risk_accepted JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_decisions_repo ON decisions(repo)
            """)
            conn.commit()
        conn.close()
        _db_available = True
        logger.info("Decision memory database connected")
    except Exception as e:
        logger.warning(f"Decision memory unavailable: {e}")
        _db_available = False


def store_decision(
    pr_data: Dict[str, Any],
    brief: Dict[str, str],
    risk_scores: Dict[str, Any]
) -> Optional[int]:
    """Store a PR decision. Opens and closes its own connection."""
    if not _db_available:
        logger.warning("Decision memory unavailable - skipping storage")
        return None

    conn = None
    try:
        metadata = pr_data.get('metadata', {})
        pr_url = metadata.get('html_url', '')
        pr_title = metadata.get('title', '')
        pr_number = metadata.get('number', 0)
        repo = _extract_repo(pr_url)

        files = pr_data.get('files', [])
        affected_files = [f.get('filename', '') for f in files]

        decision_summary = brief.get('change_summary', '')
        reasoning = brief.get('focus_areas', '')
        tradeoffs = brief.get('tradeoffs_made', '')

        risk_accepted = {
            'security': risk_scores.get('security', {}),
            'blast_radius': risk_scores.get('blast_radius', {}),
            'dependency': risk_scores.get('dependency', {}),
            'architectural': risk_scores.get('architectural', {}),
        }

        conn = _get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO decisions
                (pr_url, repo, pr_number, pr_title, decision_summary,
                 reasoning, tradeoffs, affected_files, risk_accepted)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                pr_url, repo, pr_number, pr_title, decision_summary,
                reasoning, tradeoffs, affected_files, Json(risk_accepted)
            ))
            result = cur.fetchone()
            decision_id = result[0] if result else None
            conn.commit()

        logger.info(f"Stored decision {decision_id} for PR {pr_number}")
        return decision_id

    except Exception as e:
        logger.error(f"Failed to store decision: {e}")
        return None
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def search_decisions(repo: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search past decisions. Opens and closes its own connection."""
    if not _db_available:
        return []

    conn = None
    try:
        pattern = f'%{query}%'
        conn = _get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, pr_url, pr_number, pr_title, decision_summary,
                       reasoning, tradeoffs, affected_files, risk_accepted, created_at
                FROM decisions
                WHERE repo = %s
                  AND (decision_summary ILIKE %s OR reasoning ILIKE %s)
                ORDER BY created_at DESC
                LIMIT %s
            """, (repo, pattern, pattern, limit))

            results = []
            for row in cur.fetchall():
                results.append({
                    'id': row[0],
                    'pr_url': row[1],
                    'pr_number': row[2],
                    'pr_title': row[3],
                    'decision_summary': row[4],
                    'reasoning': row[5],
                    'tradeoffs': row[6],
                    'affected_files': row[7],
                    'risk_accepted': row[8],
                    'created_at': row[9].isoformat() if row[9] else None,
                })
        return results

    except Exception as e:
        logger.error(f"Failed to search decisions: {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _extract_repo(pr_url: str) -> str:
    if 'github.com' in pr_url:
        parts = pr_url.split('/')
        if len(parts) >= 5:
            return f"{parts[3]}/{parts[4]}"
    return 'unknown'


_init()

# Made with Bob
