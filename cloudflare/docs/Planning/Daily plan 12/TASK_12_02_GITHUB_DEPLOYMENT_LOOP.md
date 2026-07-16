# TASK 12-02: GitHub Deployment Loop (Integration)

## Objective
Implement the "Apply" flow to move generated code directly into the user's GitHub repository.

## Requirements
- **GitHub Integration**: Implement OAuth or GitHub App flow for repository access.
- **Implementation of `builder.apply()`**:
    - Create a new feature branch.
    - Commit the generated files to that branch.
    - Automatically open a Pull Request (PR).
- **Status Tracking**: Display the status of GitHub Actions deployments within the UI.

## Deliverables
- **Server-side (`platform-api`)**: GitHub API client, updated `builder.apply()` logic, and PR metadata storage.
- **Client-side (`portal`)**: "Apply to GitHub" button in `BuilderResultPanel` and PR status polling component.
