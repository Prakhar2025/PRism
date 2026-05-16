import json
import requests
from typing import Dict, List, Any


def generate_brief(
    pr_data: Dict[str, Any],
    risk_scores: Dict[str, Any],
    attention_scores: List[Dict[str, Any]]
) -> Dict[str, str]:
    """
    Generate a structured code review brief using Ollama.
    
    Returns dict with 5 sections: change_summary, focus_areas, tradeoffs_made,
    what_to_skip, open_questions.
    """
    metadata = pr_data.get('metadata', {})
    files = pr_data.get('files', [])
    diff = pr_data.get('diff', '')
    
    title = metadata.get('title', 'Untitled PR')
    author = metadata.get('author', 'Unknown')
    
    filenames = [f.get('filename', '') for f in files[:10]]
    top_risk_files = [f.get('filename', '') for f in attention_scores[:3]]
    
    security_label = risk_scores.get('security', {}).get('label', 'UNKNOWN')
    blast_radius_label = risk_scores.get('blast_radius', {}).get('label', 'UNKNOWN')
    
    diff_excerpt = diff[:1500] if diff else "No diff available"
    
    prompt = f"""You are a senior software engineer generating a structured code review brief.

PR: {title}
Author: {author}
Files changed: {filenames}
Top risk files: {top_risk_files}
Security risk: {security_label}
Blast radius: {blast_radius_label}
Diff (first 1500 chars): {diff_excerpt}

Generate a Review Brief with these EXACT five sections.
Be specific about this PR, not generic.
Return valid JSON only, no other text:
{{
  "change_summary": "What changed and why in 2-3 sentences. Plain English. Not a file list.",
  "focus_areas": "Which files need careful review and why. Reference specific filenames.",
  "tradeoffs_made": "What alternatives exist and why this approach was chosen. Be specific.",
  "what_to_skip": "Which changes are purely mechanical and safe to skim.",
  "open_questions": "What should reviewers specifically question or verify."
}}"""
    
    try:
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'qwen2.5-coder:7b',
                'prompt': prompt,
                'stream': False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('response', '')
            
            json_match = None
            start = response_text.find('{')
            end = response_text.rfind('}')
            
            if start != -1 and end != -1:
                json_str = response_text[start:end+1]
                try:
                    brief = json.loads(json_str)
                    
                    required_keys = [
                        'change_summary', 'focus_areas', 'tradeoffs_made',
                        'what_to_skip', 'open_questions'
                    ]
                    
                    if all(key in brief for key in required_keys):
                        return brief
                except json.JSONDecodeError:
                    pass
    
    except Exception:
        pass
    
    critical_high_files = [
        f['filename'] for f in attention_scores 
        if f.get('label') in ['CRITICAL', 'HIGH']
    ]
    
    skip_files = [
        f['filename'] for f in attention_scores 
        if f.get('label') == 'SKIP'
    ]
    
    return {
        "change_summary": "Brief generation unavailable — Ollama not running. Review diff directly.",
        "focus_areas": ", ".join(critical_high_files) if critical_high_files else "All changed files require review",
        "tradeoffs_made": "Unable to generate — review PR description for context.",
        "what_to_skip": ", ".join(skip_files) if skip_files else "No files identified as safe to skip",
        "open_questions": "Manual review required."
    }

# Made with Bob
