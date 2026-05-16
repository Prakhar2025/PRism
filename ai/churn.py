from datetime import datetime, timedelta
from typing import Dict, Any


BUG_KEYWORDS = ["fix", "bug", "patch", "hotfix", "revert", "repair"]


def compute_churn(pr_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Compute churn metrics for each changed file based on PR commits.
    
    For hackathon: uses all PR commits as proxy for file churn.
    In production, would query git history per file.
    """
    commits = pr_data.get('commits', [])
    total_commits = len(commits)
    
    if total_commits == 0:
        return {}
    
    bug_commits = 0
    commits_90d = 0
    now = datetime.utcnow()
    ninety_days_ago = now - timedelta(days=90)
    
    for commit in commits:
        message = commit.get('message', '').lower()
        
        if any(keyword in message for keyword in BUG_KEYWORDS):
            bug_commits += 1
        
        date_str = commit.get('date', '')
        try:
            commit_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            if commit_date >= ninety_days_ago:
                commits_90d += 1
        except (ValueError, AttributeError):
            commits_90d += 1
    
    bug_fix_ratio = bug_commits / max(1, total_commits)
    
    churn_score = min(1.0, (commits_90d / max(1, total_commits)) * bug_fix_ratio)
    
    if total_commits >= 20:
        confidence = "HIGH"
    elif total_commits >= 5:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"
    
    churn_data = {
        "churn_score": round(churn_score, 2),
        "bug_fix_ratio": round(bug_fix_ratio, 2),
        "commits_90d": commits_90d,
        "total_commits": total_commits,
        "confidence": confidence
    }
    
    files = pr_data.get('files', [])
    result = {}
    
    for file_info in files:
        filename = file_info.get('filename', '')
        if filename:
            result[filename] = churn_data.copy()
    
    return result

# Made with Bob
