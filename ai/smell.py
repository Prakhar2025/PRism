import datetime
from typing import Dict, List, Any, Optional


DOMAIN_KEYWORDS = {
    "auth", "payment", "notification", "user", "order", 
    "product", "admin", "infra", "config"
}

LOGIC_EXTENSIONS = {".py", ".js", ".ts", ".go", ".java"}
TEST_KEYWORDS = ["test", "spec", "_test.", ".test."]


def detect_pr_too_large(pr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect if PR has too many lines changed."""
    files = pr_data.get('files', [])
    total_lines = sum(f.get('additions', 0) + f.get('deletions', 0) for f in files)
    
    if total_lines > 400:
        return {
            "type": "PR Too Large",
            "severity": "HIGH",
            "message": f"PR is {total_lines} lines — consider splitting"
        }
    return None


def detect_god_pr(pr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect if PR touches too many domains."""
    files = pr_data.get('files', [])
    
    detected_domains = []
    for domain in DOMAIN_KEYWORDS:
        if any(domain in f.get('filename', '').lower() for f in files):
            detected_domains.append(domain)
    
    if len(detected_domains) > 3:
        return {
            "type": "God PR",
            "severity": "HIGH",
            "message": f"Touches {len(detected_domains)} domains: {detected_domains}"
        }
    return None


def detect_no_tests_added(pr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect if logic files changed but no tests added."""
    files = pr_data.get('files', [])
    
    logic_changed = False
    test_added = False
    
    for file_info in files:
        filename = file_info.get('filename', '').lower()
        
        has_test_keyword = any(keyword in filename for keyword in TEST_KEYWORDS)
        has_logic_extension = any(filename.endswith(ext) for ext in LOGIC_EXTENSIONS)
        
        if has_logic_extension and not has_test_keyword:
            logic_changed = True
        
        if has_test_keyword:
            test_added = True
    
    if logic_changed and not test_added:
        return {
            "type": "No Tests Added",
            "severity": "HIGH",
            "message": "Logic files changed but no tests added — regression risk"
        }
    return None


def detect_thin_description(pr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect if PR description is too short for the change size."""
    metadata = pr_data.get('metadata', {})
    body = metadata.get('body', '')
    word_count = len(body.split())
    
    files = pr_data.get('files', [])
    total_lines = sum(f.get('additions', 0) + f.get('deletions', 0) for f in files)
    
    if word_count < 50 and total_lines > 200:
        return {
            "type": "Thin Description",
            "severity": "MEDIUM",
            "message": f"PR has {word_count} word description for {total_lines} line change"
        }
    return None


def detect_merge_conflict_risk(pr_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Detect merge conflict risk. Skip for MVP."""
    return None


def detect_high_churn_no_review(attention_scores: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Detect high churn files that need experienced reviewers."""
    high_churn = [
        f for f in attention_scores 
        if f.get('label') == 'CRITICAL' and 'churn' in str(f.get('reasons', [])).lower()
    ]
    
    if len(high_churn) > 0:
        filename = high_churn[0].get('filename', 'unknown')
        return {
            "type": "High Churn No Review",
            "severity": "MEDIUM",
            "message": f"{filename} has high bug-fix commit rate — needs experienced reviewer"
        }
    return None


def detect_friday_merge_risk() -> Optional[Dict[str, Any]]:
    """Detect if merge is happening on Friday afternoon."""
    now = datetime.datetime.now()
    
    if now.weekday() == 4 and now.hour >= 15:
        return {
            "type": "Friday Merge Risk",
            "severity": "MEDIUM",
            "message": f"Friday {now.strftime('%H:%M')} merge — incident rate 3x higher"
        }
    return None


def detect_smells(pr_data: Dict[str, Any], attention_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Detect code smells in the PR.
    
    Returns dict with smells_detected count, smells list, and recommendation.
    """
    smells = []
    
    smell = detect_pr_too_large(pr_data)
    if smell:
        smells.append(smell)
    
    smell = detect_god_pr(pr_data)
    if smell:
        smells.append(smell)
    
    smell = detect_no_tests_added(pr_data)
    if smell:
        smells.append(smell)
    
    smell = detect_thin_description(pr_data)
    if smell:
        smells.append(smell)
    
    smell = detect_merge_conflict_risk(pr_data)
    if smell:
        smells.append(smell)
    
    smell = detect_high_churn_no_review(attention_scores)
    if smell:
        smells.append(smell)
    
    smell = detect_friday_merge_risk()
    if smell:
        smells.append(smell)
    
    smells_detected = len(smells)
    
    high_severity_count = sum(1 for s in smells if s['severity'] == 'HIGH')
    
    if high_severity_count > 0:
        recommendation = f"Address {high_severity_count} HIGH severity issues before merging"
    elif smells_detected > 0:
        recommendation = f"Address {smells_detected} issues before merging"
    else:
        recommendation = "Ready for review"
    
    return {
        "smells_detected": smells_detected,
        "smells": smells,
        "recommendation": recommendation
    }

# Made with Bob
