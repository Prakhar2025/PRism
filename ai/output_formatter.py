from datetime import datetime
from typing import Dict, List, Any, Optional


def format_output(
    pr_data: Dict[str, Any],
    dependency_graph: Dict[str, Any],
    risk: Dict[str, Any],
    attention: List[Dict[str, Any]],
    smells: Dict[str, Any],
    reviewers: Dict[str, Any],
    merge_readiness: Dict[str, Any],
    brief: Dict[str, str],
    decision_id: Optional[int]
) -> Dict[str, Any]:
    """
    Format the final PRism output.
    
    Assembles all analysis components into a structured response.
    """
    metadata = pr_data.get('metadata', {})
    
    return {
        "pr_url": metadata.get('html_url', ''),
        "pr_title": metadata.get('title', ''),
        "analyzed_at": datetime.utcnow().isoformat() + "Z",
        "decision_memory_id": decision_id,
        "review_brief": brief,
        "risk_intelligence": risk,
        "attention_scores": attention,
        "pr_smells": smells,
        "reviewer_matching": reviewers,
        "merge_readiness": merge_readiness
    }

# Made with Bob
