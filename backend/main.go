package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"prism/backend/github"
)

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

type AnalyzeRequest struct {
	PRURL string `json:"pr_url"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func main() {
	// Load .env file if present (ignored in production where real env vars are set)
	_ = godotenv.Load(".env")

	http.HandleFunc("/analyze", corsMiddleware(handleAnalyze))
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s...", port)
	log.Printf("AI Service: %s", getEnv("AI_SERVICE_URL", "http://localhost:8000"))
	log.Printf("CORS Origin: %s", getEnv("FRONTEND_URL", "http://localhost:3000"))

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func handleAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid JSON request body", http.StatusBadRequest)
		return
	}

	owner, repo, prNumber, err := parsePRURL(req.PRURL)
	if err != nil {
		sendError(w, err.Error(), http.StatusBadRequest)
		return
	}

	prData, err := github.GetPRData(owner, repo, prNumber)
	if err != nil {
		sendError(w, fmt.Sprintf("Failed to fetch PR data: %v", err), http.StatusInternalServerError)
		return
	}

	pythonResponse, err := forwardToPythonService(prData)
	if err != nil {
		sendError(w, fmt.Sprintf("Failed to process PR data: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(pythonResponse)
}

func parsePRURL(prURL string) (string, string, int, error) {
	prURL = strings.TrimSpace(prURL)
	if prURL == "" {
		return "", "", 0, fmt.Errorf("pr_url is required")
	}

	prURL = strings.TrimPrefix(prURL, "https://")
	prURL = strings.TrimPrefix(prURL, "http://")
	prURL = strings.TrimPrefix(prURL, "github.com/")

	parts := strings.Split(prURL, "/")
	if len(parts) < 4 {
		return "", "", 0, fmt.Errorf("invalid PR URL format")
	}

	owner := parts[0]
	repo := parts[1]

	if parts[2] != "pull" {
		return "", "", 0, fmt.Errorf("invalid PR URL format: expected 'pull' segment")
	}

	prNumber, err := strconv.Atoi(parts[3])
	if err != nil {
		return "", "", 0, fmt.Errorf("invalid PR number: %v", err)
	}

	return owner, repo, prNumber, nil
}

func forwardToPythonService(prData github.PRData) ([]byte, error) {
	jsonData, err := json.Marshal(prData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal PR data: %w", err)
	}

	aiURL := getEnv("AI_SERVICE_URL", "http://localhost:8000") + "/process"
	resp, err := http.Post(aiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Python service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read Python service response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Python service returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

func sendError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

// Made with Bob
