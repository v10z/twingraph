# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Modern LLM components with streaming support for various providers.
"""

from typing import AsyncIterator, Dict, Any, Optional, List, Union
from abc import ABC, abstractmethod
import asyncio
import json
from datetime import datetime

from ...orchestration.modern_decorators import streaming_llm_component
from ...core.logging import get_logger

logger = get_logger(__name__)


class LLMProvider(ABC):
    """Base class for LLM providers."""
    
    @abstractmethod
    async def generate(
        self, 
        prompt: str, 
        **kwargs
    ) -> str:
        """Generate a complete response."""
        pass
    
    @abstractmethod
    async def stream(
        self, 
        prompt: str, 
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream response chunks."""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI API provider with streaming support."""
    
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model
        
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate complete response from OpenAI."""
        # This would use the actual OpenAI client
        # Simplified for demonstration
        await asyncio.sleep(0.1)  # Simulate API call
        return f"Generated response for: {prompt}"
    
    async def stream(
        self, 
        prompt: str, 
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream response from OpenAI."""
        # Simulate streaming response
        words = f"This is a streaming response for prompt: {prompt}".split()
        for i, word in enumerate(words):
            await asyncio.sleep(0.05)  # Simulate streaming delay
            yield {
                'content': word + ' ',
                'tokens': 1,
                'finish_reason': 'stop' if i == len(words) - 1 else None
            }


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider with streaming support."""
    
    def __init__(self, api_key: str, model: str = "claude-3-opus"):
        self.api_key = api_key
        self.model = model
        
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate complete response from Claude."""
        await asyncio.sleep(0.1)
        return f"Claude response for: {prompt}"
    
    async def stream(
        self, 
        prompt: str, 
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream response from Claude."""
        # Simulate Claude streaming
        response = f"Claude is thinking about: {prompt}. Here's the analysis..."
        for char in response:
            await asyncio.sleep(0.01)
            yield {
                'content': char,
                'tokens': 1 if char == ' ' else 0
            }


class LocalLLMProvider(LLMProvider):
    """Local LLM provider for open-source models."""
    
    def __init__(self, model_path: str, device: str = "cpu"):
        self.model_path = model_path
        self.device = device
        
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate from local model."""
        # This would load and run a local model
        await asyncio.sleep(0.2)
        return f"Local model response: {prompt}"
    
    async def stream(
        self, 
        prompt: str, 
        **kwargs
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream from local model."""
        tokens = ["Local", "model", "streaming", "response"]
        for token in tokens:
            await asyncio.sleep(0.1)
            yield {
                'content': token + ' ',
                'tokens': 1
            }


# Pre-configured streaming components for common use cases

@streaming_llm_component(model='gpt-4', temperature=0.7)
async def chat_completion(
    messages: List[Dict[str, str]], 
    provider: LLMProvider
) -> AsyncIterator[str]:
    """
    Streaming chat completion component.
    
    Example:
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Explain quantum computing"}
        ]
        async for chunk in chat_completion(messages, openai_provider):
            print(chunk, end='')
    """
    prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    async for chunk in provider.stream(prompt):
        yield chunk['content']


@streaming_llm_component(model='claude-3', temperature=0.3)
async def code_generation(
    description: str,
    language: str,
    provider: LLMProvider
) -> AsyncIterator[str]:
    """
    Streaming code generation component.
    
    Example:
        async for code in code_generation(
            "Binary search function",
            "python",
            anthropic_provider
        ):
            print(code, end='')
    """
    prompt = f"""Generate {language} code for: {description}
    
    Requirements:
    - Include type hints
    - Add docstrings
    - Handle edge cases
    - Optimize for performance
    
    Code:
    ```{language}"""
    
    async for chunk in provider.stream(prompt):
        yield chunk['content']


@streaming_llm_component(model='llama-3', temperature=0.5)
async def document_analysis(
    document: str,
    questions: List[str],
    provider: LLMProvider
) -> AsyncIterator[Dict[str, Any]]:
    """
    Streaming document analysis with structured output.
    
    Example:
        async for analysis in document_analysis(
            document_text,
            ["What is the main topic?", "Key findings?"],
            local_provider
        ):
            print(json.dumps(analysis, indent=2))
    """
    prompt = f"""Analyze this document and answer the questions.
    
    Document:
    {document[:2000]}...
    
    Questions:
    {json.dumps(questions, indent=2)}
    
    Provide structured JSON responses.
    """
    
    current_answer = ""
    answer_index = 0
    
    async for chunk in provider.stream(prompt):
        current_answer += chunk['content']
        
        # Detect complete JSON answers
        if chunk['content'].strip().endswith('}'):
            try:
                # Try to parse accumulated answer
                answer_data = json.loads(current_answer)
                yield {
                    'question': questions[answer_index] if answer_index < len(questions) else "Additional insight",
                    'answer': answer_data,
                    'timestamp': datetime.utcnow().isoformat()
                }
                current_answer = ""
                answer_index += 1
            except json.JSONDecodeError:
                # Continue accumulating
                pass


@streaming_llm_component(
    model='gpt-4-vision',
    temperature=0.2,
    max_tokens=4096
)
async def multimodal_analysis(
    image_data: bytes,
    prompt: str,
    provider: LLMProvider
) -> AsyncIterator[Dict[str, Any]]:
    """
    Streaming multimodal analysis for vision models.
    
    Example:
        async for analysis in multimodal_analysis(
            image_bytes,
            "Describe what you see",
            openai_provider
        ):
            print(analysis)
    """
    # In real implementation, this would encode image properly
    encoded_image = f"<image_data_length:{len(image_data)}>"
    
    full_prompt = f"""Analyze this image:
    {encoded_image}
    
    Task: {prompt}
    
    Provide detailed analysis with:
    1. Object detection results
    2. Scene understanding
    3. Text extraction (if any)
    4. Relevant insights
    """
    
    section = None
    buffer = ""
    
    async for chunk in provider.stream(full_prompt):
        buffer += chunk['content']
        
        # Detect section headers
        if "1. Object detection" in buffer:
            section = "objects"
        elif "2. Scene understanding" in buffer:
            section = "scene"
        elif "3. Text extraction" in buffer:
            section = "text"
        elif "4. Relevant insights" in buffer:
            section = "insights"
        
        if section and chunk['content'] == '\n':
            yield {
                'type': section,
                'content': buffer.strip(),
                'timestamp': datetime.utcnow().isoformat()
            }
            buffer = ""


class RAGComponent:
    """Retrieval-Augmented Generation with streaming."""
    
    def __init__(
        self,
        retriever: Any,  # Vector store retriever
        llm_provider: LLMProvider,
        rerank: bool = True
    ):
        self.retriever = retriever
        self.llm_provider = llm_provider
        self.rerank = rerank
    
    @streaming_llm_component(
        model='gpt-4',
        temperature=0.3,
        cache_enabled=True
    )
    async def query(
        self,
        question: str,
        num_chunks: int = 5
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream RAG responses with source citations.
        
        Example:
            rag = RAGComponent(vector_store, llm_provider)
            async for response in rag.query("What is quantum entanglement?"):
                if response['type'] == 'content':
                    print(response['text'], end='')
                elif response['type'] == 'sources':
                    print("\nSources:", response['sources'])
        """
        # Retrieve relevant chunks
        chunks = await self.retriever.search(question, k=num_chunks)
        
        # Format context
        context = "\n\n".join([
            f"[{i+1}] {chunk.text}" 
            for i, chunk in enumerate(chunks)
        ])
        
        prompt = f"""Answer based on the following context. Cite sources using [n].

Context:
{context}

Question: {question}

Answer:"""
        
        # Stream the answer
        async for chunk in self.llm_provider.stream(prompt):
            yield {
                'type': 'content',
                'text': chunk['content'],
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Return sources
        yield {
            'type': 'sources',
            'sources': [
                {
                    'id': i + 1,
                    'text': chunk.text[:200] + '...',
                    'metadata': chunk.metadata
                }
                for i, chunk in enumerate(chunks)
            ],
            'timestamp': datetime.utcnow().isoformat()
        }


# Export main components
__all__ = [
    'LLMProvider',
    'OpenAIProvider', 
    'AnthropicProvider',
    'LocalLLMProvider',
    'chat_completion',
    'code_generation',
    'document_analysis',
    'multimodal_analysis',
    'RAGComponent'
]