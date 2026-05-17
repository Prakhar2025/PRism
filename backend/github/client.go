package github

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

func githubHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "PRism/1.0")
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "token "+token)
	}
}

type PRMetadata struct {
	Number    int    `json:"number"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	Author    string `json:"author"`
	State     string `json:"state"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	HTMLURL   string `json:"html_url"`
}

type ChangedFile struct {
	Filename  string `json:"filename"`
	Status    string `json:"status"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	Changes   int    `json:"changes"`
	Patch     string `json:"patch"`
}

type Commit struct {
	SHA     string `json:"sha"`
	Message string `json:"message"`
	Author  string `json:"author"`
	Date    string `json:"date"`
}

type PRData struct {
	Metadata PRMetadata    `json:"metadata"`
	Files    []ChangedFile `json:"files"`
	Diff     string        `json:"diff"`
	Commits  []Commit      `json:"commits"`
}

func GetPRData(owner, repo string, prNumber int) (PRData, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	var prData PRData
	var wg sync.WaitGroup
	errChan := make(chan error, 4)

	wg.Add(4)

	go func() {
		defer wg.Done()
		metadata, err := fetchPRMetadata(client, owner, repo, prNumber)
		if err != nil {
			errChan <- fmt.Errorf("fetch metadata: %w", err)
			return
		}
		prData.Metadata = metadata
	}()

	go func() {
		defer wg.Done()
		files, err := fetchChangedFiles(client, owner, repo, prNumber)
		if err != nil {
			errChan <- fmt.Errorf("fetch files: %w", err)
			return
		}
		prData.Files = files
	}()

	go func() {
		defer wg.Done()
		commits, err := fetchCommits(client, owner, repo, prNumber)
		if err != nil {
			errChan <- fmt.Errorf("fetch commits: %w", err)
			return
		}
		prData.Commits = commits
	}()

	go func() {
		defer wg.Done()
		diff, err := fetchDiff(client, owner, repo, prNumber)
		if err != nil {
			errChan <- fmt.Errorf("fetch diff: %w", err)
			return
		}
		prData.Diff = diff
	}()

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return PRData{}, <-errChan
	}

	return prData, nil
}

func fetchPRMetadata(client *http.Client, owner, repo string, prNumber int) (PRMetadata, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d", owner, repo, prNumber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return PRMetadata{}, err
	}
	req.Header.Set("User-Agent", "PRism/1.0")
	githubHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return PRMetadata{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return PRMetadata{}, fmt.Errorf("github API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return PRMetadata{}, err
	}

	var rawPR struct {
		Number    int    `json:"number"`
		Title     string `json:"title"`
		Body      string `json:"body"`
		State     string `json:"state"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
		HTMLURL   string `json:"html_url"`
		User      struct {
			Login string `json:"login"`
		} `json:"user"`
	}

	if err := json.Unmarshal(body, &rawPR); err != nil {
		return PRMetadata{}, err
	}

	return PRMetadata{
		Number:    rawPR.Number,
		Title:     rawPR.Title,
		Body:      rawPR.Body,
		Author:    rawPR.User.Login,
		State:     rawPR.State,
		CreatedAt: rawPR.CreatedAt,
		UpdatedAt: rawPR.UpdatedAt,
		HTMLURL:   rawPR.HTMLURL,
	}, nil
}

func fetchChangedFiles(client *http.Client, owner, repo string, prNumber int) ([]ChangedFile, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/files", owner, repo, prNumber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "PRism/1.0")
	githubHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var files []ChangedFile
	if err := json.Unmarshal(body, &files); err != nil {
		return nil, err
	}

	return files, nil
}

func fetchCommits(client *http.Client, owner, repo string, prNumber int) ([]Commit, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/commits", owner, repo, prNumber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "PRism/1.0")
	githubHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var rawCommits []struct {
		SHA    string `json:"sha"`
		Commit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
				Date string `json:"date"`
			} `json:"author"`
		} `json:"commit"`
	}

	if err := json.Unmarshal(body, &rawCommits); err != nil {
		return nil, err
	}

	commits := make([]Commit, len(rawCommits))
	for i, rc := range rawCommits {
		commits[i] = Commit{
			SHA:     rc.SHA,
			Message: rc.Commit.Message,
			Author:  rc.Commit.Author.Name,
			Date:    rc.Commit.Author.Date,
		}
	}

	return commits, nil
}

func fetchDiff(client *http.Client, owner, repo string, prNumber int) (string, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d", owner, repo, prNumber)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "PRism/1.0")
	req.Header.Set("Accept", "application/vnd.github.v3.diff")
	githubHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// Made with Bob
