import React from 'react';

export interface CodeTemplate {
  id: string;
  name: string;
  category: 'basic' | 'ai' | 'data' | 'hpc' | 'integration';
  icon: string;
  description: string;
  code: string;
  language: 'python' | 'bash';
  inputs?: Array<{ name: string; type: string; description: string }>;
  outputs?: Array<{ name: string; type: string; description: string }>;
  computeEnvironment?: string;
}

export const codeTemplates: CodeTemplate[] = [
  // Basic Operations
  {
    id: 'addition',
    name: 'Addition',
    category: 'basic',
    icon: '➕',
    description: 'Add two numbers',
    language: 'python',
    code: `def process(input_data):
    """Add two numbers together."""
    a = input_data.get('a', 0)
    b = input_data.get('b', 0)
    result = a + b
    return {"result": result}`,
    inputs: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    outputs: [
      { name: 'result', type: 'number', description: 'Sum of a and b' }
    ]
  },
  {
    id: 'multiply',
    name: 'Multiply',
    category: 'basic',
    icon: '✖️',
    description: 'Multiply two numbers',
    language: 'python',
    code: `def process(input_data):
    """Multiply two numbers."""
    a = input_data.get('a', 1)
    b = input_data.get('b', 1)
    result = a * b
    return {"result": result}`,
    inputs: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    outputs: [
      { name: 'result', type: 'number', description: 'Product of a and b' }
    ]
  },
  
  // AI/LLM Operations
  {
    id: 'llm-prompt',
    name: 'LLM Prompt',
    category: 'ai',
    icon: '🤖',
    description: 'Execute an LLM prompt with context',
    language: 'python',
    code: `import openai
import os

def process(input_data):
    """Execute an LLM prompt with given context."""
    prompt = input_data.get('prompt', '')
    context = input_data.get('context', '')
    model = input_data.get('model', 'gpt-3.5-turbo')
    
    # Initialize OpenAI client
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    # Construct the full prompt
    full_prompt = f"{context}\\n\\n{prompt}" if context else prompt
    
    # Execute the prompt
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": full_prompt}
        ],
        temperature=0.7,
        max_tokens=1000
    )
    
    return {
        "response": response.choices[0].message.content,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
    }`,
    inputs: [
      { name: 'prompt', type: 'string', description: 'The prompt to send to the LLM' },
      { name: 'context', type: 'string', description: 'Additional context for the prompt' },
      { name: 'model', type: 'string', description: 'LLM model to use' }
    ],
    outputs: [
      { name: 'response', type: 'string', description: 'LLM response' },
      { name: 'usage', type: 'object', description: 'Token usage statistics' }
    ],
    computeEnvironment: 'docker'
  },
  
  // Data Operations
  {
    id: 's3-cfd-files',
    name: 'S3 CFD Files',
    category: 'data',
    icon: '☁️',
    description: 'List and process CFD files from S3',
    language: 'python',
    code: `import boto3
import json
from datetime import datetime

def process(input_data):
    """List and process CFD simulation files from S3."""
    bucket_name = input_data.get('bucket_name', '')
    prefix = input_data.get('prefix', 'cfd-simulations/')
    file_pattern = input_data.get('file_pattern', '*.vtk')
    
    # Initialize S3 client
    s3 = boto3.client('s3')
    
    # List objects in the bucket
    response = s3.list_objects_v2(
        Bucket=bucket_name,
        Prefix=prefix
    )
    
    # Filter CFD files
    cfd_files = []
    if 'Contents' in response:
        for obj in response['Contents']:
            key = obj['Key']
            if key.endswith(('.vtk', '.vtu', '.pvd', '.h5', '.cgns')):
                cfd_files.append({
                    'key': key,
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'file_type': key.split('.')[-1]
                })
    
    # Generate pre-signed URLs for download
    download_urls = []
    for file in cfd_files[:10]:  # Limit to first 10 files
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': file['key']},
            ExpiresIn=3600  # 1 hour
        )
        download_urls.append({
            'file': file['key'],
            'url': url
        })
    
    return {
        "total_files": len(cfd_files),
        "files": cfd_files,
        "download_urls": download_urls,
        "bucket": bucket_name,
        "prefix": prefix
    }`,
    inputs: [
      { name: 'bucket_name', type: 'string', description: 'S3 bucket name' },
      { name: 'prefix', type: 'string', description: 'S3 key prefix for CFD files' },
      { name: 'file_pattern', type: 'string', description: 'File pattern to match' }
    ],
    outputs: [
      { name: 'total_files', type: 'number', description: 'Total number of CFD files found' },
      { name: 'files', type: 'array', description: 'List of CFD file metadata' },
      { name: 'download_urls', type: 'array', description: 'Pre-signed URLs for file download' }
    ],
    computeEnvironment: 'docker'
  },
  
  // HPC Operations
  {
    id: 'hpc-cfd-workflow',
    name: 'HPC CFD Workflow',
    category: 'hpc',
    icon: '🖥️',
    description: 'Submit CFD simulation to HPC cluster',
    language: 'bash',
    code: `#!/bin/bash
# HPC CFD Workflow Submission Script

# Get input parameters
MESH_FILE=$1
SOLVER_CONFIG=$2
NUM_CORES=\${3:-32}
WALL_TIME=\${4:-"24:00:00"}
JOB_NAME=\${5:-"cfd_simulation"}

# Load required modules
module load openmpi/4.1.4
module load openfoam/v2212

# Create job submission script
cat > submit_cfd.slurm << EOF
#!/bin/bash
#SBATCH --job-name=\${JOB_NAME}
#SBATCH --nodes=1
#SBATCH --ntasks=\${NUM_CORES}
#SBATCH --time=\${WALL_TIME}
#SBATCH --partition=compute
#SBATCH --output=\${JOB_NAME}_%j.out
#SBATCH --error=\${JOB_NAME}_%j.err

# Setup OpenFOAM environment
source \$FOAM_BASH

# Copy mesh and configuration
cp \${MESH_FILE} .
cp \${SOLVER_CONFIG} .

# Decompose domain for parallel execution
decomposePar -force

# Run the solver
mpirun -np \${NUM_CORES} simpleFoam -parallel

# Reconstruct the results
reconstructPar

# Post-process results
foamToVTK

# Create results archive
tar -czf results_\${SLURM_JOB_ID}.tar.gz VTK postProcessing

echo "CFD simulation completed successfully"
echo "Results: results_\${SLURM_JOB_ID}.tar.gz"
EOF

# Submit the job
sbatch submit_cfd.slurm`,
    inputs: [
      { name: 'mesh_file', type: 'string', description: 'Path to mesh file' },
      { name: 'solver_config', type: 'string', description: 'Solver configuration file' },
      { name: 'num_cores', type: 'number', description: 'Number of CPU cores' },
      { name: 'wall_time', type: 'string', description: 'Maximum wall time' },
      { name: 'job_name', type: 'string', description: 'HPC job name' }
    ],
    outputs: [
      { name: 'job_id', type: 'string', description: 'HPC job ID' },
      { name: 'results_file', type: 'string', description: 'Path to results archive' }
    ],
    computeEnvironment: 'slurm'
  },
  
  // Integration Operations
  {
    id: 'data-transform',
    name: 'Data Transform',
    category: 'integration',
    icon: '🔄',
    description: 'Transform data between formats',
    language: 'python',
    code: `import json
import pandas as pd
import yaml

def process(input_data):
    """Transform data between different formats."""
    data = input_data.get('data')
    input_format = input_data.get('input_format', 'json')
    output_format = input_data.get('output_format', 'csv')
    
    # Parse input data based on format
    if input_format == 'json':
        if isinstance(data, str):
            parsed_data = json.loads(data)
        else:
            parsed_data = data
    elif input_format == 'yaml':
        parsed_data = yaml.safe_load(data)
    elif input_format == 'csv':
        # Assume data is a CSV string
        from io import StringIO
        df = pd.read_csv(StringIO(data))
        parsed_data = df.to_dict('records')
    else:
        parsed_data = data
    
    # Convert to output format
    if output_format == 'json':
        output = json.dumps(parsed_data, indent=2)
    elif output_format == 'yaml':
        output = yaml.dump(parsed_data, default_flow_style=False)
    elif output_format == 'csv':
        df = pd.DataFrame(parsed_data)
        output = df.to_csv(index=False)
    else:
        output = str(parsed_data)
    
    return {
        "transformed_data": output,
        "input_format": input_format,
        "output_format": output_format,
        "record_count": len(parsed_data) if isinstance(parsed_data, list) else 1
    }`,
    inputs: [
      { name: 'data', type: 'object', description: 'Input data to transform' },
      { name: 'input_format', type: 'string', description: 'Input data format' },
      { name: 'output_format', type: 'string', description: 'Desired output format' }
    ],
    outputs: [
      { name: 'transformed_data', type: 'string', description: 'Transformed data' },
      { name: 'record_count', type: 'number', description: 'Number of records processed' }
    ]
  }
];

interface CodeTemplatePanelProps {
  onSelectTemplate: (template: CodeTemplate) => void;
}

export const CodeTemplatePanel: React.FC<CodeTemplatePanelProps> = ({ onSelectTemplate }) => {
  const categories = ['basic', 'ai', 'data', 'hpc', 'integration'];
  const categoryIcons = {
    basic: '🔧',
    ai: '🤖',
    data: '📊',
    hpc: '🖥️',
    integration: '🔄'
  };

  return (
    <div className="bg-[#001733] border border-[#7aa6da20] rounded p-3">
      <h3 className="text-sm font-medium text-[#ffffff] mb-3">Code Templates</h3>
      <div className="space-y-3">
        {categories.map(category => {
          const categoryTemplates = codeTemplates.filter(t => t.category === category);
          if (categoryTemplates.length === 0) return null;
          
          return (
            <div key={category}>
              <h4 className="text-xs font-medium text-[#7aa6da] mb-2 flex items-center gap-1">
                <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {categoryTemplates.map(template => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/template', JSON.stringify(template));
                    }}
                    onClick={() => onSelectTemplate(template)}
                    className="bg-[#003666] border border-[#7aa6da20] rounded p-2 cursor-pointer hover:bg-[#00509d] transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm">{template.icon}</span>
                      <span className="text-xs font-medium text-[#bbdaff]">{template.name}</span>
                    </div>
                    <p className="text-xs text-[#5a7ca7] line-clamp-2">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};