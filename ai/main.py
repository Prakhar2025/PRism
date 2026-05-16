from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

import pr_parser
import risk
import attention
import smell
import reviewer
import merge_readiness
import brief
import memory
import output_formatter


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


@app.post("/process")
async def process_pr(pr_data: PRDataRequest):
    try:
        pr_data_dict = pr_data.model_dump()
        
        dependency_graph = pr_parser.parse_pr(pr_data_dict)
        
        risk_scores = risk.compute_risk(pr_data_dict, dependency_graph)
        
        attention_scores = attention.compute_attention(risk_scores, dependency_graph, pr_data_dict)
        
        smells = smell.detect_smells(pr_data_dict, attention_scores)
        
        reviewers = reviewer.match_reviewers(pr_data_dict)
        
        merge_readiness_result = merge_readiness.compute_merge_readiness(
            pr_data_dict, risk_scores, attention_scores, smells
        )
        
        review_brief = brief.generate_brief(pr_data_dict, risk_scores, attention_scores)
        
        decision_id = memory.store_decision(pr_data_dict, review_brief, risk_scores)
        
        output = output_formatter.format_output(
            pr_data_dict,
            dependency_graph,
            risk_scores,
            attention_scores,
            smells,
            reviewers,
            merge_readiness_result,
            review_brief,
            decision_id
        )
        
        return output
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Made with Bob
