# Demo 11: GenAI Workflow with TwinGraph v2

This demo showcases the new GenAI capabilities in TwinGraph v2, including:

- LLM integration for text processing
- Vector embeddings and similarity search
- Multi-stage AI pipelines
- Real-time monitoring and visualization

## Overview

This example implements a Retrieval-Augmented Generation (RAG) pipeline that:

1. **Ingests documents** from various sources
2. **Generates embeddings** using sentence transformers
3. **Stores vectors** in a vector database
4. **Processes queries** using LLMs
5. **Visualizes the workflow** in the web UI

## Prerequisites

```bash
# Install additional dependencies
pip install sentence-transformers openai chromadb

# Set environment variables
export OPENAI_API_KEY="your-api-key"
```

## Running the Demo

### Option 1: Using the Web UI (Recommended)

1. Start TwinGraph v2:
   ```bash
   sh start_twingraph_v2.sh
   ```

2. Open the web UI at http://localhost:4000

3. Import the workflow:
   - Click "Import" in the toolbar
   - Select `genai_workflow.json`

4. Configure your API keys in the component settings

5. Click "Run" to execute the workflow

### Option 2: Using Python Code

```bash
python deployment.py
```

## Workflow Components

### 1. Document Loader
Loads documents from various sources (PDF, TXT, MD, etc.)

### 2. Text Splitter
Chunks documents into smaller segments for processing

### 3. Embedding Generator
Creates vector embeddings using sentence-transformers

### 4. Vector Store
Stores and indexes embeddings for similarity search

### 5. Query Processor
Handles user queries and retrieves relevant context

### 6. LLM Generator
Generates responses using OpenAI GPT models

### 7. Response Formatter
Formats and enhances the final output

## Monitoring

The workflow execution can be monitored in real-time:

- **Web UI**: See live node status updates
- **Logs**: Check `logs/` directory for detailed execution logs
- **Metrics**: View performance metrics in the monitoring dashboard

## Customization

You can customize the workflow by:

1. **Changing models**: Edit component code to use different LLMs or embeddings
2. **Adding components**: Drag new components from the sidebar
3. **Modifying prompts**: Double-click components to edit their code
4. **Adjusting parameters**: Configure retry logic, timeouts, and resources

## Example Output

```json
{
  "query": "What is TwinGraph?",
  "context": [
    "TwinGraph is a Python-based orchestration framework...",
    "It supports GenAI workflows with LLM integration..."
  ],
  "response": "TwinGraph is a modern orchestration platform that enables you to build and execute complex AI workflows. It provides visual editing, multi-language support, and seamless integration with various AI models and services.",
  "metadata": {
    "model": "gpt-4",
    "tokens_used": 256,
    "execution_time": 2.3
  }
}
```

## Best Practices

1. **Error Handling**: Components include retry logic for API failures
2. **Cost Management**: Monitor token usage to control API costs
3. **Caching**: Enable caching for embeddings to improve performance
4. **Security**: Store API keys in environment variables, not in code

## Troubleshooting

### Common Issues

1. **API Rate Limits**: Implement exponential backoff in retry logic
2. **Memory Usage**: Batch process large documents
3. **Network Timeouts**: Increase component timeout settings

### Debug Mode

Enable debug logging:
```python
@component(additional_attributes={'debug': True})
```

## Next Steps

- Try different LLM models (GPT-4, Claude, Llama)
- Implement streaming responses
- Add multi-modal capabilities (images, audio)
- Create custom GenAI components