import os
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
from collections import defaultdict

_GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')


def match_reviewers(pr_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Match reviewers based on commit history for changed files.
    
    Uses GitHub API to find contributors to changed files.
    Scores based on recency and frequency.
    """
    metadata = pr_data.get('metadata', {})
    pr_author = metadata.get('author', '')
    
    owner = extract_owner_repo(pr_data)
    repo = extract_repo(pr_data)
    
    if not owner or not repo:
        return {
            "reviewers": [],
            "note": "Could not extract repository information"
        }
    
    files = pr_data.get('files', [])
    
    max_files = min(5, len(files))
    files_to_check = files[:max_files]
    
    candidate_scores: Dict[str, Dict[str, Any]] = {}
    
    for file_info in files_to_check:
        filename = file_info.get('filename', '')
        
        contributors = fetch_file_contributors(owner, repo, filename)
        
        for contributor in contributors:
            username = contributor['username']
            days_ago = contributor['days_ago']
            
            if username == pr_author:
                continue
            
            if username not in candidate_scores:
                candidate_scores[username] = {
                    'score': 0,
                    'files': [],
                    'last_activity_days': 999
                }
            
            candidate_scores[username]['score'] += 1
            
            if days_ago <= 30:
                candidate_scores[username]['score'] += 3
            elif days_ago <= 90:
                candidate_scores[username]['score'] += 2
            elif days_ago <= 180:
                candidate_scores[username]['score'] += 1
            
            candidate_scores[username]['files'].append(filename)
            candidate_scores[username]['last_activity_days'] = min(
                candidate_scores[username]['last_activity_days'],
                days_ago
            )
    
    if not candidate_scores:
        return {
            "reviewers": [],
            "note": "Insufficient commit history"
        }
    
    sorted_candidates = sorted(
        candidate_scores.items(),
        key=lambda x: x[1]['score'],
        reverse=True
    )
    
    reviewers = []
    for username, data in sorted_candidates[:3]:
        primary_file = data['files'][0] if data['files'] else 'unknown'
        days = data['last_activity_days']
        day_text = f"{days}d ago" if days < 365 else f"{days // 365}y ago"
        files_list = list(dict.fromkeys(data['files']))  # dedupe, preserve order
        files_str = ', '.join(files_list[:2])

        reviewers.append({
            "username": username,
            "score": data['score'],
            "reason": f"Committed to {files_str} recently (last {day_text})",
            "last_activity_days": days
        })

    return {"reviewers": reviewers}


def extract_owner_repo(pr_data: Dict[str, Any]) -> str:
    """Extract owner from PR metadata."""
    metadata = pr_data.get('metadata', {})
    html_url = metadata.get('html_url', '')
    
    if 'github.com' in html_url:
        parts = html_url.split('/')
        if len(parts) >= 5:
            return parts[3]
    
    return ''


def extract_repo(pr_data: Dict[str, Any]) -> str:
    """Extract repo from PR metadata."""
    metadata = pr_data.get('metadata', {})
    html_url = metadata.get('html_url', '')
    
    if 'github.com' in html_url:
        parts = html_url.split('/')
        if len(parts) >= 5:
            return parts[4]
    
    return ''


def fetch_file_contributors(owner: str, repo: str, filepath: str) -> List[Dict[str, Any]]:
    """
    Fetch contributors for a specific file from GitHub API.
    
    Returns list of {username, days_ago}.
    """
    try:
        url = f"https://api.github.com/repos/{owner}/{repo}/commits"
        params = {
            'path': filepath,
            'per_page': 20
        }
        headers = {'User-Agent': 'PRism/1.0'}
        if _GITHUB_TOKEN:
            headers['Authorization'] = f'token {_GITHUB_TOKEN}'
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return []
        
        commits = response.json()
        contributors = []
        now = datetime.now(timezone.utc)
        
        for commit in commits:
            author_info = commit.get('author')
            if not author_info:
                continue
            
            username = author_info.get('login', '')
            if not username:
                continue
            
            commit_data = commit.get('commit', {})
            author_data = commit_data.get('author', {})
            date_str = author_data.get('date', '')
            
            try:
                commit_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                days_ago = (now - commit_date).days
            except (ValueError, AttributeError):
                days_ago = 999
            
            contributors.append({
                'username': username,
                'days_ago': days_ago
            })
        
        return contributors
    
    except Exception:
        return []

# Made with Bob
