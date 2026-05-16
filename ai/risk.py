import re
import json
import requests
from typing import Dict, List, Any, Tuple, Optional


SECURITY_PATTERNS = {
    'python': {
        'auth': [
            r'subprocess\.',
            r'pickle\.loads',
            r'yaml\.load\(',
            r'eval\(',
            r'exec\(',
            r'f["\']SELECT',
            r'password\s*=\s*["\']',
            r'secret\s*=\s*["\']',
            r'api_key\s*=\s*["\']',
        ],
        'sql': [r'f["\']SELECT', r'\.execute\(["\']SELECT.*\+'],
        'subprocess': [r'subprocess\.', r'os\.system\('],
        'pickle': [r'pickle\.loads', r'pickle\.load'],
    },
    'javascript': {
        'auth': [
            r'dangerouslySetInnerHTML',
            r'eval\(',
            r'document\.write\(',
            r'innerHTML\s*=',
            r'password\s*=\s*["\']',
            r'secret\s*=\s*["\']',
            r'api_key\s*=\s*["\']',
        ],
        'sql': [r'\.query\(.*\+', r'\.execute\(.*\+'],
        'eval': [r'eval\(', r'Function\('],
        'dom': [r'dangerouslySetInnerHTML', r'innerHTML\s*=', r'document\.write\('],
    },
    'go': {
        'auth': [
            r'\.Query\(.*\+',
            r'exec\.Command',
            r'jwt\.Parse',
            r'password\s*=\s*"',
            r'secret\s*=\s*"',
            r'api_key\s*=\s*"',
        ],
        'sql': [r'\.Query\(.*\+', r'\.Exec\(.*\+'],
        'exec': [r'exec\.Command', r'os\.Exec'],
        'jwt': [r'jwt\.Parse'],
    },
}

AUTH_FILE_PATTERNS = [
    'auth', 'jwt', 'token', 'password', 'credential', 'middleware',
    'session', 'oauth', 'login', 'security'
]

AUTH_FUNCTION_PATTERNS = [
    'validate', 'authenticate', 'authorize', 'verify', 'check',
    'login', 'logout', 'signin', 'signup'
]


def get_label(score: float) -> str:
    if score >= 0.80:
        return "CRITICAL"
    elif score >= 0.60:
        return "HIGH"
    elif score >= 0.40:
        return "MEDIUM"
    elif score >= 0.20:
        return "LOW"
    else:
        return "MINIMAL"


def compute_security_risk(pr_data: Dict[str, Any]) -> Dict[str, Any]:
    files = pr_data.get('files', [])
    patterns_found = []
    total_score = 0.0
    
    for file_info in files:
        filename = file_info.get('filename', '').lower()
        patch = file_info.get('patch', '')
        
        if not patch:
            continue
        
        language = 'unknown'
        if filename.endswith('.py'):
            language = 'python'
        elif filename.endswith(('.js', '.ts', '.jsx', '.tsx')):
            language = 'javascript'
        elif filename.endswith('.go'):
            language = 'go'
        
        if any(pattern in filename for pattern in AUTH_FILE_PATTERNS):
            patterns_found.append(f"auth_file:{filename}")
            total_score += 0.35
        
        for func_pattern in AUTH_FUNCTION_PATTERNS:
            if re.search(rf'\b{func_pattern}\b', patch, re.IGNORECASE):
                patterns_found.append(f"auth_function:{func_pattern}")
                total_score += 0.35
                break
        
        if language in SECURITY_PATTERNS:
            lang_patterns = SECURITY_PATTERNS[language]
            
            for category, patterns in lang_patterns.items():
                for pattern in patterns:
                    if re.search(pattern, patch, re.IGNORECASE):
                        pattern_name = f"{language}_{category}:{pattern[:30]}"
                        patterns_found.append(pattern_name)
                        
                        if category in ['auth', 'jwt']:
                            total_score += 0.35
                        elif category in ['sql', 'eval']:
                            total_score += 0.25
                        elif category in ['subprocess', 'pickle', 'exec', 'dom']:
                            total_score += 0.15
                        break
    
    score = min(1.0, total_score)
    label = get_label(score)
    
    explanation = f"Found {len(patterns_found)} security-sensitive patterns across {len(files)} files."
    if score >= 0.6:
        explanation += " High-risk patterns detected in authentication or data handling code."
    elif score >= 0.4:
        explanation += " Moderate security concerns identified."
    elif score > 0:
        explanation += " Minor security patterns detected."
    else:
        explanation = "No significant security patterns detected."
    
    return {
        "score": round(score, 2),
        "label": label,
        "patterns_found": patterns_found[:10],
        "explanation": explanation
    }


def compute_blast_radius(pr_data: Dict[str, Any], dependency_graph: Dict[str, Any]) -> Dict[str, Any]:
    changed_files = dependency_graph.get('changed_files', [])
    
    max_score = 0.0
    total_direct = 0
    total_transitive = 0
    domains_set = set()
    
    for file_info in changed_files:
        if file_info.get('is_test', False):
            continue
        
        direct = file_info.get('direct_dependents', 0)
        transitive = file_info.get('transitive_dependents', 0)
        dependent_files = file_info.get('dependent_files', [])
        
        total_direct = max(total_direct, direct)
        total_transitive = max(total_transitive, transitive)
        
        file_domains = set()
        for dep_file in dependent_files:
            for cf in changed_files:
                if cf['filename'] == dep_file:
                    file_domains.add(cf.get('domain', 'general'))
        
        domains_set.update(file_domains)
        
        score = min(1.0, (direct * 1.0 + transitive * 0.5) / 100)
        
        if len(file_domains) >= 3:
            score = min(1.0, score * 1.3)
        
        max_score = max(max_score, score)
    
    services_affected = len(domains_set)
    label = get_label(max_score)
    
    explanation = f"Changes affect {total_direct} direct dependents and {total_transitive} transitive dependents across {services_affected} domains."
    if max_score >= 0.6:
        explanation += " High blast radius - changes impact critical system components."
    elif max_score >= 0.4:
        explanation += " Moderate blast radius - changes affect multiple components."
    elif max_score > 0:
        explanation += " Limited blast radius - changes are relatively isolated."
    else:
        explanation = "Minimal blast radius - changes are well isolated."
    
    return {
        "score": round(max_score, 2),
        "label": label,
        "direct_dependents": total_direct,
        "transitive_dependents": total_transitive,
        "services_affected": services_affected,
        "explanation": explanation
    }


def extract_package_name(line: str, filename: str) -> Tuple[Optional[str], Optional[str]]:
    line = line.strip()
    
    if 'package.json' in filename:
        match = re.search(r'"([^"]+)"\s*:\s*"', line)
        if match:
            return match.group(1), 'npm'
    
    elif 'requirements.txt' in filename:
        match = re.match(r'([a-zA-Z0-9\-_]+)', line)
        if match:
            return match.group(1), 'PyPI'
    
    elif 'go.mod' in filename:
        match = re.match(r'([a-zA-Z0-9\-_./]+)', line)
        if match:
            return match.group(1), 'Go'
    
    elif 'Cargo.toml' in filename:
        match = re.search(r'([a-zA-Z0-9\-_]+)\s*=', line)
        if match:
            return match.group(1), 'crates.io'
    
    return None, None


def query_osv_vulnerabilities(package: str, ecosystem: str) -> List[Dict[str, str]]:
    try:
        response = requests.post(
            'https://api.osv.dev/v1/query',
            json={
                'package': {
                    'name': package,
                    'ecosystem': ecosystem
                }
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            vulns = data.get('vulns', [])
            
            results = []
            for vuln in vulns:
                severity = 'UNKNOWN'
                for item in vuln.get('severity', []):
                    if item.get('type') == 'CVSS_V3':
                        score = float(item.get('score', 0))
                        if score >= 7.0:
                            severity = 'HIGH'
                        elif score >= 4.0:
                            severity = 'MEDIUM'
                        else:
                            severity = 'LOW'
                        break
                
                results.append({
                    'package': package,
                    'severity': severity,
                    'cve': vuln.get('id', 'UNKNOWN')
                })
            
            return results
        
        return []
    except Exception:
        return []


def compute_dependency_risk(pr_data: Dict[str, Any]) -> Dict[str, Any]:
    files = pr_data.get('files', [])
    
    dependency_files = [
        'package.json', 'requirements.txt', 'go.mod', 'Cargo.toml',
        'Gemfile', 'pom.xml', 'build.gradle'
    ]
    
    vulnerabilities = []
    total_score = 0.0
    
    for file_info in files:
        filename = file_info.get('filename', '')
        
        if not any(dep_file in filename for dep_file in dependency_files):
            continue
        
        patch = file_info.get('patch', '')
        
        for line in patch.split('\n'):
            if not line.startswith('+'):
                continue
            
            line = line[1:].strip()
            if not line or line.startswith('+++'):
                continue
            
            package, ecosystem = extract_package_name(line, filename)
            
            if package and ecosystem:
                vulns = query_osv_vulnerabilities(package, ecosystem)
                
                for vuln in vulns:
                    vulnerabilities.append(vuln)
                    
                    if vuln['severity'] == 'HIGH':
                        total_score += 0.4
                    elif vuln['severity'] == 'MEDIUM':
                        total_score += 0.2
    
    if not vulnerabilities:
        has_dep_changes = any(
            any(dep_file in f.get('filename', '') for dep_file in dependency_files)
            for f in files
        )
        
        if not has_dep_changes:
            return {
                "score": 0.0,
                "label": "MINIMAL",
                "vulnerabilities": [],
                "explanation": "No dependency files changed."
            }
        else:
            return {
                "score": 0.0,
                "label": "MINIMAL",
                "vulnerabilities": [],
                "explanation": "Dependency files changed but no known vulnerabilities found."
            }
    
    score = min(1.0, total_score)
    label = get_label(score)
    
    high_count = sum(1 for v in vulnerabilities if v['severity'] == 'HIGH')
    medium_count = sum(1 for v in vulnerabilities if v['severity'] == 'MEDIUM')
    
    explanation = f"Found {len(vulnerabilities)} vulnerabilities: {high_count} HIGH, {medium_count} MEDIUM."
    if score >= 0.6:
        explanation += " Critical vulnerabilities detected in dependencies."
    elif score >= 0.4:
        explanation += " Moderate vulnerability risk in dependencies."
    
    return {
        "score": round(score, 2),
        "label": label,
        "vulnerabilities": vulnerabilities[:10],
        "explanation": explanation
    }


def compute_architectural_risk(pr_data: Dict[str, Any], dependency_graph: Dict[str, Any]) -> Dict[str, Any]:
    changed_files = dependency_graph.get('changed_files', [])
    
    filenames = [f['filename'] for f in changed_files]
    domains = list(set(f.get('domain', 'general') for f in changed_files))
    
    diff = pr_data.get('diff', '')
    diff_excerpt = diff[:500] if diff else "No diff available"
    
    prompt = f"""Analyze this PR for architectural consistency.
Files changed: {', '.join(filenames[:10])}
Domains: {', '.join(domains)}
Diff excerpt: {diff_excerpt}

Does this PR: introduce inconsistent patterns, create circular dependencies, violate module boundaries, bypass data access layers?

Respond in JSON only: {{"score":0.0-1.0,"issues":["..."],"explanation":"..."}}"""
    
    try:
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'qwen2.5-coder:7b',
                'prompt': prompt,
                'stream': False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get('response', '')
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                
                score = float(result.get('score', 0.3))
                score = max(0.0, min(1.0, score))
                
                issues = result.get('issues', [])
                explanation = result.get('explanation', 'Architectural analysis completed.')
                
                return {
                    "score": round(score, 2),
                    "label": get_label(score),
                    "issues": issues,
                    "explanation": explanation
                }
    
    except Exception:
        pass
    
    return {
        "score": 0.3,
        "label": "LOW",
        "issues": [],
        "explanation": "Ollama unavailable — manual architectural review recommended."
    }


def compute_risk(pr_data: Dict[str, Any], dependency_graph: Dict[str, Any]) -> Dict[str, Any]:
    security = compute_security_risk(pr_data)
    blast_radius = compute_blast_radius(pr_data, dependency_graph)
    dependency = compute_dependency_risk(pr_data)
    architectural = compute_architectural_risk(pr_data, dependency_graph)
    
    return {
        "security": security,
        "blast_radius": blast_radius,
        "dependency": dependency,
        "architectural": architectural
    }

# Made with Bob
