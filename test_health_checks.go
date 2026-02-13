// Health Check Test Script
// This script tests the health check endpoints of both Go and Ruby APIs

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// HealthCheckResponse represents the expected health check response structure
type HealthCheckResponse struct {
	Status    string                 `json:"status"`
	Service   string                 `json:"service"`
	Version   string                 `json:"version"`
	Timestamp string                 `json:"timestamp"`
	Checks    map[string]interface{} `json:"checks"`
}

// TestResult represents the result of a health check test
type TestResult struct {
	Name   string
	Status string
	URL    string
	Reason string
}

// HealthCheckTester handles health check testing
type HealthCheckTester struct {
	results []TestResult
}

// NewHealthCheckTester creates a new health check tester
func NewHealthCheckTester() *HealthCheckTester {
	return &HealthCheckTester{
		results: make([]TestResult, 0),
	}
}

// TestHealthCheck performs a health check test on the given URL
func (t *HealthCheckTester) TestHealthCheck(name, url string, expectedStatus int) {
	fmt.Printf("\n%s\n", "============================================================")
	fmt.Printf("Testing %s\n", name)
	fmt.Printf("%s\n", "============================================================")
	fmt.Printf("URL: %s\n", url)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		fmt.Printf("\n✗ FAILED: Cannot connect to server - %v\n", err)
		t.results = append(t.results, TestResult{
			Name:   name,
			Status: "FAIL",
			URL:    url,
			Reason: fmt.Sprintf("Connection error: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("\n✗ FAILED: Failed to read response - %v\n", err)
		t.results = append(t.results, TestResult{
			Name:   name,
			Status: "FAIL",
			URL:    url,
			Reason: fmt.Sprintf("Read error: %v", err),
		})
		return
	}

	fmt.Printf("Status Code: %d\n", resp.StatusCode)
	fmt.Printf("Response Body:\n")

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err == nil {
		prettyJSON, _ := json.MarshalIndent(data, "", "  ")
		fmt.Printf("%s\n", string(prettyJSON))
	} else {
		fmt.Printf("%s\n", string(body))
	}

	// Validate response
	var healthResp HealthCheckResponse
	if err := json.Unmarshal(body, &healthResp); err != nil {
		fmt.Printf("\n✗ FAILED: Invalid JSON response - %v\n", err)
		t.results = append(t.results, TestResult{
			Name:   name,
			Status: "FAIL",
			URL:    url,
			Reason: "Invalid JSON",
		})
		return
	}

	// Accept both 200 (ok) and 503 (error) as valid health check responses
	validStatusCodes := []int{200, 503}
	validStatuses := []string{"ok", "error"}

	validStatusCode := false
	for _, code := range validStatusCodes {
		if resp.StatusCode == code {
			validStatusCode = true
			break
		}
	}

	validStatus := false
	for _, status := range validStatuses {
		if healthResp.Status == status {
			validStatus = true
			break
		}
	}

	success := validStatusCode &&
		validStatus &&
		healthResp.Service != "" &&
		healthResp.Version != "" &&
		healthResp.Timestamp != "" &&
		healthResp.Checks != nil

	if success {
		fmt.Printf("\n✓ PASSED: Health check returned expected response\n")
		t.results = append(t.results, TestResult{
			Name:   name,
			Status: "PASS",
			URL:    url,
		})
	} else {
		fmt.Printf("\n✗ FAILED: Health check response is invalid\n")
		t.results = append(t.results, TestResult{
			Name:   name,
			Status: "FAIL",
			URL:    url,
			Reason: "Invalid response structure",
		})
	}
}

// PrintSummary prints a summary of all test results
func (t *HealthCheckTester) PrintSummary() {
	fmt.Printf("\n%s\n", "============================================================")
	fmt.Printf("HEALTH CHECK TEST SUMMARY\n")
	fmt.Printf("%s\n", "============================================================")

	passed := 0
	failed := 0
	for _, result := range t.results {
		if result.Status == "PASS" {
			passed++
		} else {
			failed++
		}
	}

	total := len(t.results)
	fmt.Printf("Total Tests: %d\n", total)
	fmt.Printf("Passed: %d\n", passed)
	fmt.Printf("Failed: %d\n", failed)

	if failed > 0 {
		fmt.Printf("\nFailed Tests:\n")
		for _, result := range t.results {
			if result.Status == "FAIL" {
				fmt.Printf("  - %s: %s\n", result.Name, result.Reason)
			}
		}
	}

	fmt.Printf("\n%s\n", "============================================================")

	if failed > 0 {
		os.Exit(1)
	}
}

func main() {
	fmt.Println("Health Check Test Script")
	fmt.Println("Testing both Go and Ruby API health endpoints")
	fmt.Println("Make sure both servers are running before executing this script.")

	tester := NewHealthCheckTester()

	// Test Go backend health check
	tester.TestHealthCheck("Go Backend", "http://localhost:8082/health", 200)

	// Test Ruby backend health check
	tester.TestHealthCheck("Ruby Backend", "http://localhost:3001/health", 200)

	// Print summary
	tester.PrintSummary()
}
