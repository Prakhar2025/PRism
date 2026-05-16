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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_db_available = False
_connection = None


def _init_connection():
    """Initialize database connection on module import."""
    global _db_available, _connection
    
    if not PSYCOPG2_AVAILABLE:
        logger.warning("psycopg2 not installed - decision memory disabled")
        return
    
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://prism:prism@localhost:5432/prism'
    )
    
    try:
        _connection = psycopg2.connect(database_url)
        _create_tables()
        _db_available = True
        logger.info("Decision memory database connected")
    except Exception as e:
        logger.warning(f"Decision memory unavailable: {e}")
        _db_available = False


def _create_tables():
    """Create decisions table if it doesn't exist."""
    if not _connection:
        return
    
    try:
        with _connection.cursor() as cursor:
            cursor.execute("""
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
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_decisions_repo 
                ON decisions(repo)
            """)
            
            _connection.commit()
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        _connection.rollback()


def store_decision(
    pr_data: Dict[str, Any],
    brief: Dict[str, str],
    risk_scores: Dict[str, Any]
) -> Optional[int]:
    """
    Store a PR decision in the database.
    
    Returns decision ID if successful, None otherwise.
    """
    if not _db_available or not _connection:
        logger.warning("Decision memory unavailable - skipping storage")
        return None
    
    try:
        metadata = pr_data.get('metadata', {})
        pr_url = metadata.get('html_url', '')
        pr_title = metadata.get('title', '')
        pr_number = metadata.get('number', 0)
        
        repo = extract_repo_from_url(pr_url)
        
        files = pr_data.get('files', [])
        affected_files = [f.get('filename', '') for f in files]
        
        decision_summary = brief.get('change_summary', '')
        reasoning = brief.get('focus_areas', '')
        tradeoffs = brief.get('tradeoffs_made', '')
        
        risk_accepted = {
            'security': risk_scores.get('security', {}),
            'blast_radius': risk_scores.get('blast_radius', {}),
            'dependency': risk_scores.get('dependency', {}),
            'architectural': risk_scores.get('architectural', {})
        }
        
        with _connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO decisions 
                (pr_url, repo, pr_number, pr_title, decision_summary, 
                 reasoning, tradeoffs, affected_files, risk_accepted)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                pr_url, repo, pr_number, pr_title, decision_summary,
                reasoning, tradeoffs, affected_files, Json(risk_accepted)
            ))
            
            result = cursor.fetchone()
            if result:
                decision_id = result[0]
            else:
                return None
            
            _connection.commit()
            
            logger.info(f"Stored decision {decision_id} for PR {pr_number}")
            return decision_id
    
    except Exception as e:
        logger.error(f"Failed to store decision: {e}")
        if _connection:
            _connection.rollback()
        return None


def search_decisions(repo: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for past decisions in a repository.
    
    Returns list of matching decisions.
    """
    if not _db_available or not _connection:
        return []
    
    try:
        with _connection.cursor() as cursor:
            search_pattern = f'%{query}%'
            
            cursor.execute("""
                SELECT id, pr_url, pr_number, pr_title, decision_summary,
                       reasoning, tradeoffs, affected_files, risk_accepted,
                       created_at
                FROM decisions
                WHERE repo = %s 
                  AND (decision_summary ILIKE %s OR reasoning ILIKE %s)
                ORDER BY created_at DESC
                LIMIT %s
            """, (repo, search_pattern, search_pattern, limit))
            
            results = []
            for row in cursor.fetchall():
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
                    'created_at': row[9].isoformat() if row[9] else None
                })
            
            return results
    
    except Exception as e:
        logger.error(f"Failed to search decisions: {e}")
        return []


def extract_repo_from_url(pr_url: str) -> str:
    """Extract repo name from PR URL."""
    if 'github.com' in pr_url:
        parts = pr_url.split('/')
        if len(parts) >= 5:
            return f"{parts[3]}/{parts[4]}"
    return 'unknown'


_init_connection()

# Made with Bob
