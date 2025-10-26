# CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

## Workflows

### Main Pipeline (`main.yml`)

Triggers on push and pull requests to `main` and `develop` branches.

**Jobs:**

1. **backend-test**: Runs backend tests with PostgreSQL and Redis
   - Linting
   - Unit tests
   - Coverage report

2. **frontend-test**: Runs frontend tests
   - Linting
   - Build verification

3. **docker-build**: Builds and pushes Docker images (only on `main` branch)
   - Backend image
   - Frontend image

## Required Secrets

Configure these secrets in your GitHub repository settings:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password or access token

## Local Testing

Run the same checks locally:

```bash
# Backend
cd backend
npm run lint
npm run test:cov

# Frontend
cd frontend
npm run lint
npm run build
```

