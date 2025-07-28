# TwinGraph Documentation

Welcome to the TwinGraph documentation! This guide will help you understand, install, and use TwinGraph effectively.

## 📑 Table of Contents

### Getting Started
1. **[Quick Start Guide](Getting_Started.md)**
   - Prerequisites and installation
   - Your first workflow
   - Basic concepts
   - Platform setup

2. **[Architecture Overview](Architecture.md)**
   - System components
   - Execution flow
   - Technology stack
   - Design decisions

### API Documentation
3. **[API Reference](API_Reference.md)**
   - Core decorators (@component, @pipeline)
   - REST API endpoints
   - WebSocket events
   - Python SDK
   - Authentication

4. **[Legacy API Documentation](APIDoc.md)**
   - Original decorator syntax
   - Migration guide

### Configuration & Setup
5. **[Manual Installation](ManualInstallation.md)**
   - Step-by-step setup
   - Troubleshooting
   - Platform-specific instructions

6. **[Port Forwarding Guide](PortForwarding.md)**
   - Network configuration
   - Remote access setup
   - Security considerations

### Important Information
7. **[Known Limitations](Known_Limitations.md)**
   - Current constraints
   - Platform-specific limitations
   - Workarounds
   - Future improvements

8. **[Known Issues](KnownIssuesLimitations.md)**
   - Legacy issues list
   - Common problems

## 🎯 Learning Path

### For New Users
1. Start with the [Getting Started Guide](Getting_Started.md)
2. Run the examples in `/examples/orchestration_demos/`
3. Build your first workflow using the visual designer
4. Explore the [API Reference](API_Reference.md) for advanced features

### For Developers
1. Review the [Architecture Overview](Architecture.md)
2. Study the component examples in `/examples/`
3. Check [Known Limitations](Known_Limitations.md) before designing systems
4. Contribute improvements via [GitHub](https://github.com/aws-samples/twingraph)

### For DevOps/SRE
1. Follow [Manual Installation](ManualInstallation.md) for production setup
2. Configure platforms (Kubernetes, AWS) per the guides
3. Set up monitoring using the metrics API
4. Review security best practices in the Architecture doc

## 📚 Example Workflows

The `/examples/orchestration_demos/` directory contains progressively complex examples:

| Demo | Description | Key Concepts |
|------|-------------|--------------|
| `demo_1_graph_tracing` | Basic workflow with visualization | Graph tracing, component basics |
| `demo_2_container_components` | Docker-based execution | Container isolation |
| `demo_3_diverse_components` | Multiple data sources | ETL patterns |
| `demo_4_celery_backend` | Distributed execution | Scaling with Celery |
| `demo_5_celery_K8s` | Kubernetes deployment | Production setup |
| `demo_6_celery_aws_batch` | AWS Batch integration | Cloud compute |
| `demo_7_multi_language` | Polyglot workflows | Language interop |
| `demo_8_docker_K8s_lambda_batch` | Multi-platform | Platform selection |
| `demo_9_retry_component` | Error handling | Fault tolerance |
| `demo_10_llm_workflows` | LLM integration | AI/ML workflows |
| `demo_11_genai_workflow` | Complete RAG system | Production AI app |

## 🔧 Configuration Files

### Core Configuration
- `.env` - Environment variables
- `docker-compose.yml` - Service definitions
- `pyproject.toml` - Python dependencies

### Platform Configs
- `kubernetes/` - K8s manifests
- `terraform/` - Infrastructure as code
- `config/` - Application settings

## 🐛 Troubleshooting

### Common Issues

1. **Docker not starting**
   - Check Docker Desktop is running
   - Verify port availability
   - Review logs: `docker compose logs`

2. **Component execution fails**
   - Check platform-specific logs
   - Verify credentials and permissions
   - Review [Known Limitations](Known_Limitations.md)

3. **UI not loading**
   - Check API health: http://localhost:8000/health
   - Verify WebSocket connection
   - Clear browser cache

### Getting Help

1. Check the relevant documentation section
2. Search [GitHub Issues](https://github.com/aws-samples/twingraph/issues)
3. Review example code in `/examples/`
4. Create a detailed issue with:
   - TwinGraph version
   - Platform details
   - Error messages
   - Minimal reproduction steps

## 📈 Performance Tuning

### Component Optimization
- Use appropriate platform for workload
- Minimize data serialization
- Implement caching where needed
- Profile with built-in metrics

### System Tuning
- Adjust Celery worker count
- Configure resource limits
- Use Redis clustering for scale
- Enable query optimization in graph DB

## 🔐 Security Best Practices

1. **Secrets Management**
   - Use environment variables
   - Implement secret rotation
   - Never commit credentials

2. **Network Security**
   - Use TLS for external connections
   - Implement API authentication
   - Restrict component permissions

3. **Component Security**
   - Validate all inputs
   - Use minimal container images
   - Implement resource limits

## 🚀 Next Steps

After familiarizing yourself with TwinGraph:

1. **Build Custom Components**: Extend the component library
2. **Integrate Services**: Connect to your data sources and APIs
3. **Deploy to Production**: Set up monitoring and scaling
4. **Contribute**: Share components and improvements

Remember: Start simple, test thoroughly, scale gradually!

---

**Version**: 2.0.0 | **Last Updated**: January 2024