from typing import Dict, List, Any
import churn


AUTH_PATTERNS = ['auth', 'jwt', 'middleware', 'token', 'session', 'oauth', 'login']


def get_label(score: float) -> str:
    """Convert attention score to label."""
    if score >= 0.80:
        return "CRITICAL"
    elif score >= 0.60:
        return "HIGH"
    elif score >= 0.40:
        return "MEDIUM"
    elif score >= 0.20:
        return "LOW"
    else:
        return "SKIP"


def get_reviewer_action(label: str) -> str:
    """Get reviewer action based on label."""
    actions = {
        "CRITICAL": "Review line by line. Do not approve without full understanding.",
        "HIGH": "Review carefully. Check logic, not just syntax.",
        "MEDIUM": "Normal review. Look for obvious issues.",
        "LOW": "Spot check. Confirm overall approach.",
        "SKIP": "Mechanical change. Approve after confirming intent."
    }
    return actions.get(label, "Review as needed.")


def is_auth_file(filename: str) -> bool:
    """Check if filename contains auth-related patterns."""
    filename_lower = filename.lower()
    return any(pattern in filename_lower for pattern in AUTH_PATTERNS)


def compute_confidence_interval(r_conf: str, d_conf: str, c_conf: str) -> float:
    """
    Compute confidence interval based on component confidences.
    
    All HIGH: 0.04
    Any LOW: 0.25
    Otherwise: 0.12
    """
    confidences = [r_conf, d_conf, c_conf]
    
    if all(c == "HIGH" for c in confidences):
        return 0.04
    elif any(c == "LOW" for c in confidences):
        return 0.25
    else:
        return 0.12


def compute_attention(
    risk_scores: Dict[str, Any],
    dependency_graph: Dict[str, Any],
    pr_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Compute attention scores for each changed file.
    
    Formula: AS = 0.40 * R + 0.35 * D + 0.25 * C
    
    Where:
    - R: Risk score (security-weighted)
    - D: Dependency score (direct dependents)
    - C: Churn score (bug fix ratio)
    """
    churn_data = churn.compute_churn(pr_data)
    
    changed_files = dependency_graph.get('changed_files', [])
    security_score = risk_scores.get('security', {}).get('score', 0.0)
    
    attention_scores = []
    
    for file_info in changed_files:
        filename = file_info.get('filename', '')
        
        if is_auth_file(filename):
            R = security_score
        else:
            R = security_score * 0.7
        
        direct_dependents = file_info.get('direct_dependents', 0)
        D = min(1.0, direct_dependents / 100.0)
        
        if filename in churn_data:
            C = churn_data[filename]['churn_score']
            c_conf = churn_data[filename]['confidence']
        else:
            C = 0.1
            c_conf = "LOW"
        
        AS = 0.40 * R + 0.35 * D + 0.25 * C
        AS = round(AS, 2)
        
        r_conf = "HIGH" if security_score > 0 else "LOW"
        
        nodes = dependency_graph.get('nodes', 0)
        if nodes > 10:
            d_conf = "HIGH"
        elif nodes > 3:
            d_conf = "MEDIUM"
        else:
            d_conf = "LOW"
        
        interval = compute_confidence_interval(r_conf, d_conf, c_conf)
        
        label = get_label(AS)
        reviewer_action = get_reviewer_action(label)
        
        reasons = []
        if R > 0.5:
            reasons.append("Security pattern detected")
        
        if direct_dependents > 5:
            reasons.append(f"{direct_dependents} direct dependents")
        
        if C > 0.5 and filename in churn_data:
            bug_fix_ratio = churn_data[filename]['bug_fix_ratio']
            reasons.append(f"High churn: {int(bug_fix_ratio * 100)}% bug-fix commit rate")
        
        attention_scores.append({
            "filename": filename,
            "score": AS,
            "interval": interval,
            "label": label,
            "confidence": f"R:{r_conf}, D:{d_conf}, C:{c_conf}",
            "reasons": reasons,
            "reviewer_action": reviewer_action
        })
    
    attention_scores.sort(key=lambda x: x['score'], reverse=True)
    
    return attention_scores

# Made with Bob
