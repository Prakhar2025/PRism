from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

import pr_parser
import risk
import attention


app = FastAPI(title="PRism AI Service", version="1.0.0")


class PRMetadata(BaseModel):
    number: int
    title: str
    body: str
    author: str
    state: str
    created_at: str
    updated_at: str
    html_url: str


class ChangedFile(BaseModel):
    filename: str
    status: str
    additions: int
    deletions: int
    changes: int
    patch: Optional[str] = ""


class Commit(BaseModel):
    sha: str
    message: str
    author: str
    date: str


class PRDataRequest(BaseModel):
    metadata: PRMetadata
    files: List[ChangedFile]
    diff: str
    commits: List[Commit]


class HealthResponse(BaseModel):
    status: str
    service: str


class PRismOutput(BaseModel):
    pr_url: str
    pr_number: int
    title: str
    author: str
    dependency_graph: Dict[str, Any]
    risk_scores: Dict[str, Any]
    attention_scores: Dict[str, Any]
    smells: List[Dict[str, Any]]
    reviewers: List[Dict[str, Any]]
    summary: Dict[str, Any]


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return {"status": "ok", "service": "prism-ai"}


@app.post("/process", response_model=PRismOutput)
async def process_pr(pr_data: PRDataRequest):
    try:
        pr_data_dict = pr_data.model_dump()
        
        dependency_graph = pr_parser.parse_pr(pr_data_dict)
        
        risk_scores = risk.compute_risk(pr_data_dict, dependency_graph)
        
        attention_scores = attention.compute_attention(risk_scores, dependency_graph, pr_data_dict)
        
        smells = detect_smells_placeholder(pr_data_dict, attention_scores)
        
        reviewers = match_reviewers_placeholder(pr_data_dict)
        
        output = format_output(
            pr_data_dict,
            dependency_graph,
            risk_scores,
            attention_scores,
            smells,
            reviewers
        )
        
        return output
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


def compute_risk_placeholder(pr_data: Dict[str, Any], dependency_graph: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "overall_risk": 0.0,
        "file_risks": {},
        "risk_factors": []
    }


def compute_attention_placeholder(
    risk_scores: Dict[str, Any],
    dependency_graph: Dict[str, Any],
    pr_data: Dict[str, Any]
) -> Dict[str, Any]:
    return {
        "attention_distribution": {},
        "high_attention_files": [],
        "attention_metrics": {}
    }


def detect_smells_placeholder(pr_data: Dict[str, Any], attention_scores: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return []


def match_reviewers_placeholder(pr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return []


def format_output(
    pr_data: Dict[str, Any],
    dependency_graph: Dict[str, Any],
    risk_scores: Dict[str, Any],
    attention_scores: List[Dict[str, Any]],
    smells: List[Dict[str, Any]],
    reviewers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    metadata = pr_data.get('metadata', {})
    
    return {
        "pr_url": metadata.get('html_url', ''),
        "pr_number": metadata.get('number', 0),
        "title": metadata.get('title', ''),
        "author": metadata.get('author', ''),
        "dependency_graph": dependency_graph,
        "risk_scores": risk_scores,
        "attention_scores": attention_scores,
        "smells": smells,
        "reviewers": reviewers,
        "summary": {
            "total_files_changed": len(pr_data.get('files', [])),
            "total_commits": len(pr_data.get('commits', [])),
            "graph_nodes": dependency_graph.get('nodes', 0),
            "graph_edges": dependency_graph.get('edges', 0),
            "high_risk_files": len([f for f in dependency_graph.get('changed_files', []) 
                                   if f.get('transitive_dependents', 0) > 5]),
            "test_files": len([f for f in dependency_graph.get('changed_files', []) 
                              if f.get('is_test', False)]),
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Made with Bob
