#!/usr/bin/env python
"""
Run the TwinGraph API server with proper configuration.
"""

import os
import uvicorn
from .main import app

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("TWINGRAPH_API_HOST", "0.0.0.0")
    port = int(os.getenv("TWINGRAPH_API_PORT", "8000"))
    
    # Set graph endpoint for Docker environment
    if os.getenv("TWINGRAPH_DOCKER_ENV"):
        os.environ["TWINGRAPH_GREMLIN_ENDPOINT"] = "ws://tinkergraph-server:8182"
    
    print(f"Starting TwinGraph API on {host}:{port}")
    print(f"Graph endpoint: {os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', 'ws://localhost:8182')}")
    
    uvicorn.run(app, host=host, port=port, reload=False)