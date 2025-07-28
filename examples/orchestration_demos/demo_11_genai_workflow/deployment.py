"""
Demo 11: GenAI Workflow with TwinGraph v2

This example demonstrates a modern RAG (Retrieval-Augmented Generation) pipeline
using the enhanced TwinGraph features.
"""

import os
from typing import List, Dict, Any, NamedTuple
from collections import namedtuple

from twingraph import component, pipeline


# ============================================================================
# Document Processing Components
# ============================================================================

@component(
    timeout=60,
    additional_attributes={
        'category': 'data-ingestion',
        'description': 'Loads documents from various sources'
    }
)
def load_documents(
    source_path: str,
    file_types: List[str] = None
) -> NamedTuple:
    """
    Load documents from a directory or file path.
    
    Supports: PDF, TXT, MD, JSON, CSV
    """
    import os
    import glob
    from pathlib import Path
    
    if file_types is None:
        file_types = ['*.txt', '*.md', '*.pdf', '*.json']
    
    documents = []
    
    if os.path.isdir(source_path):
        for file_type in file_types:
            pattern = os.path.join(source_path, '**', file_type)
            files = glob.glob(pattern, recursive=True)
            
            for file_path in files:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    documents.append({
                        'path': file_path,
                        'content': content,
                        'metadata': {
                            'source': file_path,
                            'type': Path(file_path).suffix
                        }
                    })
    else:
        # Single file
        with open(source_path, 'r', encoding='utf-8') as f:
            content = f.read()
            documents.append({
                'path': source_path,
                'content': content,
                'metadata': {
                    'source': source_path,
                    'type': Path(source_path).suffix
                }
            })
    
    Output = namedtuple('Output', ['documents', 'count'])
    return Output(documents=documents, count=len(documents))


@component(
    additional_attributes={
        'category': 'text-processing',
        'description': 'Splits documents into chunks'
    }
)
def split_text(
    documents: List[Dict[str, Any]],
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> NamedTuple:
    """
    Split documents into smaller chunks for processing.
    """
    chunks = []
    
    for doc in documents:
        text = doc['content']
        metadata = doc['metadata']
        
        # Simple chunking (in production, use langchain or similar)
        for i in range(0, len(text), chunk_size - chunk_overlap):
            chunk = text[i:i + chunk_size]
            chunks.append({
                'text': chunk,
                'metadata': {
                    **metadata,
                    'chunk_index': i // (chunk_size - chunk_overlap),
                    'chunk_start': i,
                    'chunk_end': min(i + chunk_size, len(text))
                }
            })
    
    Output = namedtuple('Output', ['chunks', 'total_chunks'])
    return Output(chunks=chunks, total_chunks=len(chunks))


# ============================================================================
# AI/ML Components
# ============================================================================

@component(
    platform='docker',
    docker_image='python:3.9',
    timeout=300,
    additional_attributes={
        'category': 'ai-embedding',
        'model': 'sentence-transformers/all-MiniLM-L6-v2'
    }
)
def generate_embeddings(
    chunks: List[Dict[str, Any]],
    model_name: str = 'sentence-transformers/all-MiniLM-L6-v2'
) -> NamedTuple:
    """
    Generate embeddings for text chunks using sentence transformers.
    """
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        # Fallback for demo
        import random
        embeddings = []
        for chunk in chunks:
            # Generate dummy embeddings
            embedding = [random.random() for _ in range(384)]
            embeddings.append({
                'text': chunk['text'],
                'embedding': embedding,
                'metadata': chunk['metadata']
            })
        
        Output = namedtuple('Output', ['embeddings', 'dimension'])
        return Output(embeddings=embeddings, dimension=384)
    
    # Real implementation
    model = SentenceTransformer(model_name)
    
    texts = [chunk['text'] for chunk in chunks]
    vectors = model.encode(texts)
    
    embeddings = []
    for chunk, vector in zip(chunks, vectors):
        embeddings.append({
            'text': chunk['text'],
            'embedding': vector.tolist(),
            'metadata': chunk['metadata']
        })
    
    Output = namedtuple('Output', ['embeddings', 'dimension'])
    return Output(embeddings=embeddings, dimension=len(vectors[0]))


@component(
    additional_attributes={
        'category': 'vector-storage',
        'database': 'chromadb'
    }
)
def store_vectors(
    embeddings: List[Dict[str, Any]],
    collection_name: str = 'twingraph_demo'
) -> NamedTuple:
    """
    Store embeddings in a vector database.
    """
    try:
        import chromadb
        from chromadb.config import Settings
    except ImportError:
        # Fallback for demo
        Output = namedtuple('Output', ['stored_count', 'collection'])
        return Output(stored_count=len(embeddings), collection=collection_name)
    
    # Initialize ChromaDB
    client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory="./chroma_db"
    ))
    
    # Get or create collection
    collection = client.get_or_create_collection(name=collection_name)
    
    # Prepare data for insertion
    ids = [f"chunk_{i}" for i in range(len(embeddings))]
    documents = [emb['text'] for emb in embeddings]
    metadatas = [emb['metadata'] for emb in embeddings]
    vectors = [emb['embedding'] for emb in embeddings]
    
    # Add to collection
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=vectors
    )
    
    Output = namedtuple('Output', ['stored_count', 'collection'])
    return Output(stored_count=len(embeddings), collection=collection_name)


@component(
    auto_retry=True,
    max_retries=3,
    timeout=120,
    additional_attributes={
        'category': 'ai-search',
        'description': 'Retrieves relevant context for queries'
    }
)
def retrieve_context(
    query: str,
    collection_name: str = 'twingraph_demo',
    top_k: int = 5
) -> NamedTuple:
    """
    Retrieve relevant context for a query using vector similarity.
    """
    try:
        import chromadb
        from chromadb.config import Settings
        from sentence_transformers import SentenceTransformer
    except ImportError:
        # Fallback for demo
        mock_results = [
            {
                'text': 'TwinGraph is a Python-based orchestration framework...',
                'score': 0.95,
                'metadata': {'source': 'README.md'}
            },
            {
                'text': 'It supports GenAI workflows with LLM integration...',
                'score': 0.89,
                'metadata': {'source': 'docs/features.md'}
            }
        ]
        Output = namedtuple('Output', ['results', 'query'])
        return Output(results=mock_results[:top_k], query=query)
    
    # Generate query embedding
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    query_embedding = model.encode(query).tolist()
    
    # Search in ChromaDB
    client = chromadb.Client(Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory="./chroma_db"
    ))
    
    collection = client.get_collection(name=collection_name)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    # Format results
    formatted_results = []
    for i in range(len(results['ids'][0])):
        formatted_results.append({
            'text': results['documents'][0][i],
            'score': 1 - results['distances'][0][i],  # Convert distance to similarity
            'metadata': results['metadatas'][0][i]
        })
    
    Output = namedtuple('Output', ['results', 'query'])
    return Output(results=formatted_results, query=query)


@component(
    platform='docker',
    docker_image='python:3.9',
    timeout=180,
    auto_retry=True,
    max_retries=2,
    additional_attributes={
        'category': 'ai-generation',
        'model': 'gpt-3.5-turbo',
        'provider': 'openai'
    }
)
def generate_response(
    query: str,
    context: List[Dict[str, Any]],
    model: str = 'gpt-3.5-turbo',
    temperature: float = 0.7
) -> NamedTuple:
    """
    Generate response using LLM with retrieved context.
    """
    # Check for API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        # Fallback response for demo
        mock_response = (
            f"Based on the context provided, here's what I found about '{query}':\n\n"
            f"TwinGraph is a modern orchestration platform that enables you to build "
            f"and execute complex AI workflows. It provides visual editing, "
            f"multi-language support, and seamless integration with various AI models "
            f"and services.\n\n"
            f"Key features include:\n"
            f"- Visual workflow editor\n"
            f"- Multi-language component support\n"
            f"- Real-time execution monitoring\n"
            f"- Built-in error handling and retries"
        )
        
        Output = namedtuple('Output', ['response', 'model_used', 'tokens_used'])
        return Output(
            response=mock_response,
            model_used='mock-model',
            tokens_used=100
        )
    
    try:
        import openai
    except ImportError:
        raise ImportError("Please install openai: pip install openai")
    
    # Prepare context
    context_text = "\n\n".join([
        f"[Source: {r['metadata'].get('source', 'Unknown')}]\n{r['text']}"
        for r in context
    ])
    
    # Create prompt
    system_prompt = (
        "You are a helpful AI assistant. Use the provided context to answer "
        "questions accurately. If the context doesn't contain relevant information, "
        "say so clearly."
    )
    
    user_prompt = f"""Context:
{context_text}

Question: {query}

Please provide a comprehensive answer based on the context above."""
    
    # Call OpenAI API
    openai.api_key = api_key
    
    response = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=temperature,
        max_tokens=500
    )
    
    Output = namedtuple('Output', ['response', 'model_used', 'tokens_used'])
    return Output(
        response=response.choices[0].message.content,
        model_used=model,
        tokens_used=response.usage.total_tokens
    )


# ============================================================================
# Pipeline Definition
# ============================================================================

@pipeline(
    name='genai_rag_pipeline',
    monitoring_enabled=True,
    clear_graph=True
)
def genai_workflow():
    """
    Complete RAG pipeline for document Q&A.
    """
    import json
    
    # Step 1: Load documents
    print("Loading documents...")
    docs = load_documents(
        source_path='./sample_docs',  # Change to your document path
        file_types=['*.txt', '*.md']
    )
    print(f"Loaded {docs['outputs']['count']} documents")
    
    # Step 2: Split into chunks
    print("Splitting text into chunks...")
    chunks = split_text(
        documents=docs['outputs']['documents'],
        chunk_size=500,
        chunk_overlap=50,
        parent_hash=docs['hash']
    )
    print(f"Created {chunks['outputs']['total_chunks']} chunks")
    
    # Step 3: Generate embeddings
    print("Generating embeddings...")
    embeddings = generate_embeddings(
        chunks=chunks['outputs']['chunks'],
        parent_hash=[docs['hash'], chunks['hash']]
    )
    print(f"Generated embeddings with dimension {embeddings['outputs']['dimension']}")
    
    # Step 4: Store vectors
    print("Storing vectors in database...")
    storage = store_vectors(
        embeddings=embeddings['outputs']['embeddings'],
        collection_name='twingraph_demo_v2',
        parent_hash=embeddings['hash']
    )
    print(f"Stored {storage['outputs']['stored_count']} vectors")
    
    # Step 5: Example query
    query = "What is TwinGraph and what are its main features?"
    print(f"\nProcessing query: {query}")
    
    # Step 6: Retrieve context
    context = retrieve_context(
        query=query,
        collection_name=storage['outputs']['collection'],
        top_k=3,
        parent_hash=storage['hash']
    )
    print(f"Retrieved {len(context['outputs']['results'])} relevant chunks")
    
    # Step 7: Generate response
    print("Generating response...")
    response = generate_response(
        query=query,
        context=context['outputs']['results'],
        temperature=0.7,
        parent_hash=[storage['hash'], context['hash']]
    )
    
    # Final output
    result = {
        'query': query,
        'response': response['outputs']['response'],
        'model': response['outputs']['model_used'],
        'tokens_used': response['outputs']['tokens_used'],
        'context_sources': [
            r['metadata'].get('source', 'Unknown') 
            for r in context['outputs']['results']
        ]
    }
    
    print("\n" + "="*60)
    print("FINAL RESULT:")
    print("="*60)
    print(json.dumps(result, indent=2))
    
    return result


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == '__main__':
    # Create sample documents if they don't exist
    import os
    os.makedirs('./sample_docs', exist_ok=True)
    
    if not os.path.exists('./sample_docs/twingraph_intro.txt'):
        with open('./sample_docs/twingraph_intro.txt', 'w') as f:
            f.write("""TwinGraph v2.0 - GenAI Orchestration Platform

TwinGraph is a cutting-edge orchestration framework designed specifically for 
building and managing GenAI workflows. It combines the power of visual programming 
with the flexibility of code-based components.

Key Features:
- Visual workflow editor with drag-and-drop interface
- Multi-language support (Python, JavaScript, Bash, C++, Rust)
- Seamless integration with LLMs and vector databases
- Real-time execution monitoring and debugging
- Built-in error handling and retry mechanisms
- Cloud and local execution options
- Automatic graph tracing for reproducibility

Use Cases:
- RAG (Retrieval-Augmented Generation) pipelines
- Multi-agent AI systems
- Document processing and analysis
- Data transformation workflows
- MLOps and model deployment pipelines
""")
    
    # Run the pipeline
    genai_workflow()