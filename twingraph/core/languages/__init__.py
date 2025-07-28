# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from abc import ABC, abstractmethod
from typing import Dict, Any
import asyncio
import subprocess
import json
import tempfile
import os

class LanguageExecutor(ABC):
    """Base class for language-specific code executors"""
    
    @abstractmethod
    async def execute(self, code: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code with given inputs and return outputs"""
        pass

class PythonExecutor(LanguageExecutor):
    async def execute(self, code: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Python code"""
        # Create a temporary Python file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            # Prepare the execution environment
            exec_code = f"""
import json
import sys

# Load inputs
inputs = {json.dumps(inputs)}

# User code
{code}

# Call process function if it exists
if 'process' in locals():
    result = process(inputs)
    print(json.dumps(result))
else:
    print(json.dumps({{"error": "No process function found"}}))
"""
            f.write(exec_code)
            temp_file = f.name
        
        try:
            # Execute the code
            process = await asyncio.create_subprocess_exec(
                'python', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, **config.get('environment', {})}
            )
            
            # Wait for completion with timeout
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=config.get('timeout', 30)
            )
            
            if process.returncode != 0:
                raise RuntimeError(f"Python execution failed: {stderr.decode()}")
            
            # Parse output
            return json.loads(stdout.decode())
            
        finally:
            os.unlink(temp_file)

class BashExecutor(LanguageExecutor):
    async def execute(self, code: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Bash code"""
        # Create environment with inputs
        env = os.environ.copy()
        env.update(config.get('environment', {}))
        
        # Add inputs as environment variables
        for key, value in inputs.items():
            env[f"INPUT_{key.upper()}"] = json.dumps(value)
        
        # Execute the bash script
        process = await asyncio.create_subprocess_shell(
            code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        
        # Wait for completion with timeout
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=config.get('timeout', 30)
        )
        
        if process.returncode != 0:
            raise RuntimeError(f"Bash execution failed: {stderr.decode()}")
        
        # Try to parse output as JSON, otherwise return as string
        output = stdout.decode().strip()
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            return {"output": output}

class JavaScriptExecutor(LanguageExecutor):
    async def execute(self, code: str, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute JavaScript code using Node.js"""
        # Create a temporary JavaScript file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            exec_code = f"""
const inputs = {json.dumps(inputs)};

// User code
{code}

// Call process function if it exists
if (typeof process === 'function') {{
    const result = process(inputs);
    console.log(JSON.stringify(result));
}} else {{
    console.log(JSON.stringify({{error: "No process function found"}}));
}}
"""
            f.write(exec_code)
            temp_file = f.name
        
        try:
            # Execute the code
            process = await asyncio.create_subprocess_exec(
                'node', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, **config.get('environment', {})}
            )
            
            # Wait for completion with timeout
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=config.get('timeout', 30)
            )
            
            if process.returncode != 0:
                raise RuntimeError(f"JavaScript execution failed: {stderr.decode()}")
            
            # Parse output
            return json.loads(stdout.decode())
            
        finally:
            os.unlink(temp_file)