import datetime
from typing import Dict, List, Any


def compute_merge_readiness(
    pr_data: Dict[str, Any],
    risk_scores: Dict[str, Any],
    attention_scores: List[Dict[str, Any]],
    smells: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compute merge readiness based on 5 conditions.
    
    Returns status (GREEN/YELLOW/RED), blocking issues, warnings, and recommendation.
    """
    blocking = []
    warnings = []
    passing = []
    
    critical_files = check_critical_files(attention_scores)
    if critical_files:
        blocking.extend(critical_files)
    else:
        passing.append("No CRITICAL attention files")
    
    high_smells = check_high_smells(smells)
    if high_smells:
        blocking.extend(high_smells)
    else:
        passing.append("No HIGH severity smells")
    
    temporal_risk = check_temporal_risk()
    if temporal_risk:
        warnings.append(temporal_risk)
    else:
        passing.append("No temporal risk")
    
    security_threshold = check_security_threshold(risk_scores)
    if security_threshold:
        blocking.append(security_threshold)
    else:
        passing.append("Security risk acceptable")
    
    pr_size_warning = check_pr_size(smells)
    if pr_size_warning:
        warnings.append(pr_size_warning)
    else:
        passing.append("PR size reasonable")
    
    if blocking:
        status = "RED"
        recommendation = f"Cannot merge: {len(blocking)} blocking issue(s) must be resolved"
    elif warnings:
        status = "YELLOW"
        recommendation = f"Proceed with caution: {len(warnings)} warning(s) detected"
    else:
        status = "GREEN"
        recommendation = "Ready to merge"
    
    return {
        "status": status,
        "blocking": blocking,
        "warnings": warnings,
        "passing": passing,
        "recommendation": recommendation
    }


def check_critical_files(attention_scores: List[Dict[str, Any]]) -> List[str]:
    """Check for files with CRITICAL attention score."""
    critical = []
    
    for file_info in attention_scores:
        score = file_info.get('score', 0.0)
        if score >= 0.80:
            filename = file_info.get('filename', 'unknown')
            critical.append(f"{filename} (AS={score}) is CRITICAL — requires explicit review")
    
    return critical


def check_high_smells(smells: Dict[str, Any]) -> List[str]:
    """Check for HIGH severity smells."""
    high_smells = []
    
    smell_list = smells.get('smells', [])
    for smell in smell_list:
        if smell.get('severity') == 'HIGH':
            high_smells.append(smell.get('message', 'Unknown HIGH severity smell'))
    
    return high_smells


def check_temporal_risk() -> str:
    """Check if it's Friday after 3pm."""
    now = datetime.datetime.now()
    
    if now.weekday() == 4 and now.hour >= 15:
        return "Friday afternoon merge — 3x incident risk"
    
    return ""


def check_security_threshold(risk_scores: Dict[str, Any]) -> str:
    """Check if security risk is CRITICAL."""
    security = risk_scores.get('security', {})
    score = security.get('score', 0.0)
    
    if score >= 0.80:
        return "Security Risk CRITICAL — requires security review before merge"
    
    return ""


def check_pr_size(smells: Dict[str, Any]) -> str:
    """Check if PR is too large."""
    smell_list = smells.get('smells', [])
    
    for smell in smell_list:
        if smell.get('type') == 'PR Too Large':
            return "Large PR — review quality degrades above 400 lines"
    
    return ""

# Made with Bob
