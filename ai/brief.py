import json
import os
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Best Groq model: llama-3.3-70b-versatile (70B params, highest quality, free tier)
# Free tier: 1000 req/day, 6000 tokens/min — plenty for a PR review tool
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')

try:
    from groq import Groq
    _groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except ImportError:
    _groq_client = None
    logger.warning("groq package not installed — run: pip install groq")


def generate_brief(
    pr_data: Dict[str, Any],
    risk_scores: Dict[str, Any],
    attention_scores: List[Dict[str, Any]]
) -> Dict[str, str]:
    """
    Generate a structured code review brief using Groq (llama-3.3-70b-versatile).

    Returns dict with 5 sections: change_summary, focus_areas, tradeoffs_made,
    what_to_skip, open_questions.
    Falls back to heuristic output if Groq is unavailable.
    """
    metadata = pr_data.get('metadata', {})
    files = pr_data.get('files', [])
    diff = pr_data.get('diff', '')

    title = metadata.get('title', 'Untitled PR')
    author = metadata.get('author', 'Unknown')
    pr_url = metadata.get('html_url', '')

    filenames = [f.get('filename', '') for f in files[:15]]
    top_risk_files = [
        f"{f.get('filename', '')} (AS={f.get('score', 0):.2f}, {f.get('label', '')})"
        for f in attention_scores[:5]
    ]

    security_score = risk_scores.get('security', {}).get('score', 0)
    security_label = risk_scores.get('security', {}).get('label', 'UNKNOWN')
    security_explanation = risk_scores.get('security', {}).get('explanation', '')
    blast_label = risk_scores.get('blast_radius', {}).get('label', 'UNKNOWN')
    blast_score = risk_scores.get('blast_radius', {}).get('score', 0)
    arch_explanation = risk_scores.get('architectural', {}).get('explanation', '')

    # Limit diff to 2000 chars to stay within token budget
    diff_excerpt = diff[:2000] if diff else "No diff available"

    prompt = f"""You are a principal software engineer generating a precise code review brief.

PR Title: {title}
PR Author: {author}
PR URL: {pr_url}

Files changed ({len(filenames)} total, showing first 15):
{chr(10).join(f"  - {f}" for f in filenames)}

Attention Score Map (highest risk files first):
{chr(10).join(f"  - {f}" for f in top_risk_files)}

Risk Analysis:
- Security: {security_label} (score={security_score:.2f}) — {security_explanation}
- Blast Radius: {blast_label} (score={blast_score:.2f})
- Architectural: {arch_explanation}

Diff excerpt (first 2000 chars):
{diff_excerpt}

Generate a structured Review Brief. Be SPECIFIC to this exact PR — reference actual filenames,
actual patterns found, actual security concerns. Do not be generic.

Return ONLY valid JSON, no markdown, no explanation, no code fences:
{{
  "change_summary": "2-3 sentences describing what changed and why. Plain English. Name specific files.",
  "focus_areas": "Which specific files/functions need line-by-line review and exactly why. Name filenames.",
  "tradeoffs_made": "What design/implementation choices were made and what alternatives exist.",
  "what_to_skip": "Which changes are purely mechanical or low-risk and safe to skim.",
  "open_questions": "3-5 specific questions reviewers must answer before approving this PR."
}}"""

    # Try Groq first
    if _groq_client:
        try:
            logger.info(f"Generating brief via Groq ({GROQ_MODEL})...")
            response = _groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a principal software engineer. Return only valid JSON, never markdown."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,    # Low temperature = consistent, precise output
                max_tokens=1024,
                response_format={"type": "json_object"},  # Force JSON output
            )

            response_text = response.choices[0].message.content.strip()
            brief = json.loads(response_text)

            required_keys = [
                'change_summary', 'focus_areas', 'tradeoffs_made',
                'what_to_skip', 'open_questions'
            ]

            if all(key in brief for key in required_keys):
                logger.info("Brief generated successfully via Groq")
                return brief
            else:
                logger.warning(f"Groq response missing keys: {brief.keys()}")

        except json.JSONDecodeError as e:
            logger.warning(f"Groq returned invalid JSON: {e}")
        except Exception as e:
            logger.warning(f"Groq brief generation failed: {e}")
    else:
        if not GROQ_API_KEY:
            logger.warning("GROQ_API_KEY not set — using heuristic brief. Set it in ai/.env")
        else:
            logger.warning("Groq client unavailable — using heuristic brief")

    # Heuristic fallback — always returns real data from the analysis
    critical_files = [
        f['filename'] for f in attention_scores
        if f.get('label') in ['CRITICAL', 'HIGH']
    ]
    skip_files = [
        f['filename'] for f in attention_scores
        if f.get('label') == 'SKIP'
    ]
    medium_files = [
        f['filename'] for f in attention_scores
        if f.get('label') == 'MEDIUM'
    ]

    focus = ", ".join(critical_files[:5]) if critical_files else "All changed files"
    skippable = ", ".join(skip_files[:5]) if skip_files else "No files identified as low-risk"

    summary = f"This PR modifies {len(filenames)} files"
    if security_label in ['CRITICAL', 'HIGH']:
        summary += f" with {security_label} security risk detected"
    if blast_label in ['CRITICAL', 'HIGH']:
        summary += f" and {blast_label} blast radius"
    summary += f". Author: {author}. Set GROQ_API_KEY in ai/.env for AI-generated brief."

    return {
        "change_summary": summary,
        "focus_areas": focus,
        "tradeoffs_made": "Set GROQ_API_KEY in ai/.env to enable AI-generated tradeoff analysis.",
        "what_to_skip": skippable,
        "open_questions": "Set GROQ_API_KEY in ai/.env to enable AI-generated review questions."
    }

# Made with Bob — upgraded to Groq llama-3.3-70b-versatile
