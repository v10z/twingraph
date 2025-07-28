"""
Simple test to verify TwinGraph is working correctly
"""

from collections import namedtuple
from twingraph import component, pipeline

# Set the graph configuration for Docker environment
GRAPH_CONFIG = {'graph_endpoint': 'ws://tinkergraph-server:8182'}

@component(graph_config=GRAPH_CONFIG)
def add_numbers(a: float, b: float):
    """Simple addition component"""
    result = a + b
    Output = namedtuple('outputs', ['sum'])
    return Output(sum=result)

@component(graph_config=GRAPH_CONFIG)
def multiply_numbers(a: float, b: float):
    """Simple multiplication component"""
    result = a * b
    Output = namedtuple('outputs', ['product'])
    return Output(product=result)

@pipeline(graph_config=GRAPH_CONFIG, clear_graph=True)
def simple_test():
    """Test basic TwinGraph functionality"""
    print("Starting simple TwinGraph test...")
    
    # Step 1: Add two numbers
    result1 = add_numbers(10.0, 5.0)
    print(f"Addition result: {result1['outputs']['sum']}")
    
    # Step 2: Multiply using the sum
    result2 = multiply_numbers(
        result1['outputs']['sum'], 
        2.0,
        parent_hash=result1['hash']
    )
    print(f"Multiplication result: {result2['outputs']['product']}")
    
    print("Test completed successfully!")
    return {
        'sum': result1['outputs']['sum'],
        'product': result2['outputs']['product']
    }

if __name__ == '__main__':
    simple_test()