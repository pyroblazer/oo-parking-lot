# Security Scanning Setup Guide

This guide provides comprehensive information about security scanning and SARIF file generation for the OO Parking Lot project.

## Overview

The CI/CD pipeline includes automated security scanning that generates SARIF (Static Analysis Results Interchange Format) files. These files are available as CI/CD artifacts for security analysis.

### Current Status

**Note**: This is a **private repository**, so GitHub Security code scanning is not used. All security scan results are available as CI/CD artifacts for review.

The workflow is configured to handle all scenarios:
- All security scans will run (gosec, trivy, brakeman, npm-audit, bundler-audit)
- SARIF files will be generated and uploaded as artifacts (30-day retention)
- Results are available for manual review in the Actions tab

## Current Workflow Configuration

The CI/CD pipeline (`.github/workflows/ci.yml`) has the following security scanning jobs:

### GoSec Security Scan (Go)
- **Job**: `gosec` (lines 571-610)
- **Tool**: securego/gosec@master
- **Output**: `gosec-results.sarif`
- **Artifact**: Results available for 30 days

### Trivy Vulnerability Scan
- **Job**: `trivy-scan` (lines 612-634)
- **Tool**: aquasecurity/trivy-action@master
- **Output**: `trivy-results.sarif`
- **Artifact**: Results available for 30 days

### Permissions Configuration

The workflow has the correct permissions set (lines 12-17):

```yaml
permissions:
  contents: read
  actions: read
  checks: write
  pull-requests: write
  # Note: security-events: write is not used for this private repository
```

## Accessing Security Scan Results

Since this is a private repository without GitHub Security code scanning enabled, security scan results are available as CI/CD artifacts:

1. **Navigate to GitHub Actions**
   - Go to your repository on GitHub
   - Click on the **Actions** tab

2. **Select a Workflow Run**
   - Click on a recent workflow run (e.g., "CI" or "Security Scan")

3. **Download Artifacts**
   - Scroll down to the "Artifacts" section
   - Download `gosec-results.sarif`, `trivy-results.sarif`, or other security scan results

4. **View Results Locally**
   - SARIF files can be viewed using SARIF viewers or converted to human-readable formats
   - Use tools like `sarif-viewer` or online SARIF validators

## Verification Steps

### 1. Test Local SARIF Generation

The gosec scan works correctly locally and generates valid SARIF files:

```bash
cd go-backend
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec -no-fail -fmt sarif -out gosec-results.sarif -verbose=text -stdout ./...
```

**Result**: Successfully generates `gosec-results.sarif` with security findings.

### 2. Verify Workflow Permissions

The workflow already has the required permissions:
- `contents: read` - Required for code checkout
- `pull-requests: write` - Required for PR annotations
- Note: `security-events: write` is not used for this private repository

### 3. Check CI/CD Artifacts

After workflow runs, verify:
- Artifacts are available in the Actions tab
- SARIF files are preserved for 30 days
- Security scan results can be downloaded and reviewed

## Alternative Solutions

### Option A: Current Workflow Configuration (Recommended)

The CI workflow is configured to handle all scenarios:

- Runs all security scans (gosec, trivy, brakeman, npm-audit, etc.)
- Generates SARIF files for all tools
- Uploads SARIF files as artifacts (available for 30 days)
- Results are available for manual review

This configuration ensures the workflow works for private repositories.

### Option B: Use Third-Party Security Tools

Integrate with external security platforms that support SARIF:
- **SonarQube**: Import SARIF files and display security findings
- **Snyk**: Supports SARIF import for vulnerability tracking
- **DefectDoja**: Open-source vulnerability management platform

### Option C: Display Results in Pull Requests

Use actions to display security findings directly in PR comments:

```yaml
- name: Comment PR with GoSec results
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const sarif = JSON.parse(fs.readFileSync('gosec-results.sarif', 'utf8'));
      const issues = sarif.runs[0].results;

      let comment = '## Security Scan Results\n\n';
      comment += `Found ${issues.length} security issues:\n\n`;

      issues.forEach(issue => {
        const ruleId = issue.ruleId;
        const message = issue.message.text;
        const file = issue.locations[0].physicalLocation.artifactLocation.uri;
        const line = issue.locations[0].physicalLocation.region.startLine;

        comment += `- **${ruleId}**: ${message}\n`;
        comment += `  Location: ${file}:${line}\n\n`;
      });

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

## Troubleshooting

### Error: "SARIF file is too large"

**Cause**: SARIF file exceeds artifact size limits.

**Solution**:
- Filter results to only high-severity issues
- Split scans across multiple jobs
- Use SARIF compression features

### Error: "Invalid SARIF format"

**Cause**: SARIF file is malformed or doesn't comply with SARIF 2.1.0 specification.

**Solution**:
- Validate SARIF file using online validators
- Ensure that security tool outputs SARIF 2.1.0 format
- Check for encoding issues (UTF-8 is required)

## Best Practices

1. **Run Security Scans Regularly**: Ensure all security scans run on every push and pull request
2. **Review Artifacts**: Regularly review security scan artifacts in the Actions tab
3. **Address Findings**: Promptly address security findings identified in scans
4. **Keep Dependencies Updated**: Regularly update dependencies to patch known vulnerabilities
5. **Use Multiple Tools**: Run multiple security scanning tools for comprehensive coverage

## Additional Resources

- [SARIF 2.1.0 Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
- [GoSec Documentation](https://github.com/securego/gosec)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Brakeman Documentation](https://brakemanscanner.org/)
- [SonarQube](https://www.sonarqube.org/)
- [Snyk](https://snyk.io/)
