# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

# Dependency Updates (January 2025)

This document tracks the dependency updates performed to modernize TwinGraph to use the latest stable versions.

## Summary

All dependencies have been updated to their latest stable versions as of January 2025, ensuring better performance, security, and compatibility with modern development practices.

## Python Dependencies (pyproject.toml)

### Core Dependencies
- **gremlinpython**: 3.6.1 → 3.7.2 (matches TinkerGraph server version)
- **boto3**: 1.26.45 → 1.35.0
- **numpy**: 1.24.1 → 1.26.0
- **docker**: 6.0.1 → 7.1.0
- **celery**: 5.2.7 → 5.3.0
- **flower**: 1.2.0 → 2.0.0
- **simplejson**: 3.18.1 → 3.19.0
- **kombu**: 5.2.4 → 5.3.0
- **redis**: 4.4.2 → 5.0.0
- **kubernetes**: 25.3.0 → 31.0.0
- **pandas**: 2.0.2 → 2.2.0
- **pytest**: 7.3.1 → 8.3.0
- **gitpython**: 3.1.41 → 3.1.43
- **aiohttp**: 3.9.4 → 3.10.0
- **fastapi**: 0.104.0 → 0.115.0
- **uvicorn**: 0.24.0 → 0.32.0
- **python-socketio**: 5.10.0 → 5.11.0
- **pydantic**: 2.5.0 → 2.9.0

### Development Dependencies
- **mypy**: 0.982 → 1.13.0
- **wemake-python-styleguide**: 0.17 → 0.19.0
- **flake8-pytest-style**: 1.6 → 2.0.0
- **doc8**: 1.0 → 1.1.0
- **nitpick**: 0.32 → 0.35.0
- **safety**: 2.3 → 3.2.0
- **pytest-cov**: 4.0 → 5.0.0
- **pytest-randomly**: 3.12 → 3.15.0
- **sphinx-autodoc-typehints**: 1.19/1.23.0 → 2.5.0

## Node.js Dependencies (package.json)

### Production Dependencies
- **react-flow-renderer**: 10.3.0 → **reactflow**: 11.11.0 (package renamed)
- **@tanstack/react-query**: 5.0.0 → 5.59.0
- **@types/node**: 20.0.0 → 22.9.0
- **@types/react**: 18.2.0 → 18.3.0
- **@types/react-dom**: 18.2.0 → 18.3.0
- **axios**: 1.6.0 → 1.7.0
- **react-router-dom**: 6.20.0 → 6.28.0
- **socket.io-client**: 4.7.0 → 4.8.0
- **zustand**: 4.4.0 → 5.0.0
- **typescript**: 5.3.0 → 5.7.0
- **vite**: 5.0.0 → 5.4.0
- **@vitejs/plugin-react**: 4.2.0 → 4.3.0
- **vis-network**: 9.1.0 → 9.1.9
- **vis-data**: 7.1.0 → 7.1.9

### Development Dependencies
- **@typescript-eslint/eslint-plugin**: 6.0.0 → 8.15.0
- **@typescript-eslint/parser**: 6.0.0 → 8.15.0
- **eslint**: 8.50.0 → 9.15.0
- **eslint-plugin-react-refresh**: 0.4.0 → 0.4.14

## Docker Base Images

- **Python base image**: python:3.10 → python:3.12-slim
- **TinkerGraph server**: tinkerpop/gremlin-server:3.6.1 → 3.7.2
- **RabbitMQ**: rabbitmq:latest → rabbitmq:4-management
- **Redis**: redis/redis-stack:latest → redis/redis-stack:7.4.1
- **AWS Lambda Python**: public.ecr.aws/docker/library/python:buster → public.ecr.aws/lambda/python:3.12
- **Node.js (UI)**: Added node:22-alpine for UI builds

## Breaking Changes and Migration Notes

### React Flow Migration
The most significant change is the migration from `react-flow-renderer` to `reactflow`. The package was renamed and restructured:

```typescript
// Old import
import ReactFlow from 'react-flow-renderer';

// New import
import ReactFlow from 'reactflow';
import 'reactflow/dist/style.css'; // Now required
```

### Python 3.12 Compatibility
Updated to Python 3.12 which offers:
- Performance improvements (10-20% faster)
- Better error messages
- Enhanced type hints
- Improved asyncio performance

### Zustand v5
The state management library Zustand was updated to v5, which has a slightly different API for TypeScript users but maintains backward compatibility for JavaScript.

### ESLint v9
ESLint was updated to v9 which uses a new flat configuration format. The existing configuration should still work but may need updates for optimal performance.

## Testing Recommendations

After updating dependencies, run the following tests:

```bash
# Python tests
poetry install
python run_tests.py --verbose

# Node.js tests
cd twingraph-ui
npm install
npm run build
npm run lint

# Docker builds
docker compose build
docker compose up -d

# Integration tests
python examples/orchestration_demos/demo_1_graph_tracing.py
```

## Security Improvements

Several of the dependency updates include important security fixes:
- **aiohttp**: Fixed multiple security vulnerabilities
- **certifi**: Updated certificate bundle
- **safety**: Now includes more comprehensive vulnerability scanning
- **Node.js dependencies**: Multiple security patches in the dependency tree

## Performance Improvements

Expected performance improvements from updates:
- **Python 3.12**: ~15% faster execution
- **Redis 7.4**: Improved memory efficiency and faster operations
- **FastAPI 0.115**: Better async performance
- **React 18.3**: Improved rendering performance
- **Vite 5.4**: Faster build times and HMR

## Rollback Instructions

If issues are encountered, dependencies can be rolled back by:

1. Restore the original `pyproject.toml` and `package.json` files
2. Run `poetry install` and `npm install`
3. Rebuild Docker images with original Dockerfiles
4. Restart all services

## Future Updates

Consider setting up automated dependency updates using:
- **Dependabot** for GitHub repositories
- **Renovate** for more complex update strategies
- **Poetry** update commands: `poetry update`
- **npm** update commands: `npm update`

Regular dependency updates should be performed quarterly to maintain security and performance.