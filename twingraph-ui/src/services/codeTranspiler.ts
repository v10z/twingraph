/**
 * Code Transpiler Service
 * Handles conversion of non-Python code to Python-wrapped execution
 */

export interface TranspiledCode {
  pythonWrapper: string;
  originalCode: string;
  language: string;
  executionMethod: 'subprocess' | 'docker' | 'native';
}

export class CodeTranspiler {
  /**
   * Transpile non-Python code to Python wrapper for execution
   */
  static transpile(code: string, language: string, decoratorInputs: Record<string, any>): TranspiledCode {
    const computeEnv = decoratorInputs.compute_environment || 'local';
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.transpileJavaScript(code, language, computeEnv, decoratorInputs);
      
      case 'bash':
        return this.transpileBash(code, computeEnv, decoratorInputs);
      
      case 'cpp':
        return this.transpileCpp(code, computeEnv, decoratorInputs);
      
      case 'rust':
        return this.transpileRust(code, computeEnv, decoratorInputs);
      
      default:
        return {
          pythonWrapper: code,
          originalCode: code,
          language: 'python',
          executionMethod: 'native'
        };
    }
  }

  private static transpileJavaScript(
    code: string, 
    language: string,
    computeEnv: string,
    decoratorInputs: Record<string, any>
  ): TranspiledCode {
    const dockerImage = decoratorInputs.docker_image || 'node:18-alpine';
    
    if (computeEnv === 'docker') {
      return {
        pythonWrapper: `
import subprocess
import json
import tempfile
import os
from typing import NamedTuple
from collections import namedtuple

@component(
    platform='docker',
    docker_image='${dockerImage}',
    ${this.generateDecoratorFlags(decoratorInputs)}
)
def execute_js(**kwargs):
    """Execute JavaScript code in Docker container"""
    Output = namedtuple('Output', ['result', 'stdout', 'stderr'])
    
    # Write JS code to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write('''${code.replace(/'/g, "\\'")}''')
        js_file = f.name
    
    try:
        # Execute in container
        result = subprocess.run(
            ['node', js_file],
            capture_output=True,
            text=True,
            cwd='${decoratorInputs.workdir || '.'}'
        )
        
        output = {
            'result': json.loads(result.stdout) if result.stdout else None,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
        
        return Output(**output)
    finally:
        os.unlink(js_file)
`,
        originalCode: code,
        language: language,
        executionMethod: 'docker'
      };
    } else {
      // Local execution
      return {
        pythonWrapper: `
import subprocess
import json
import tempfile
import os
from typing import NamedTuple
from collections import namedtuple

@component(${this.generateDecoratorFlags(decoratorInputs)})
def execute_js(**kwargs):
    """Execute JavaScript code locally"""
    Output = namedtuple('Output', ['result', 'stdout', 'stderr'])
    
    # Write JS code to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write('''${code.replace(/'/g, "\\'")}''')
        js_file = f.name
    
    try:
        # Execute locally
        result = subprocess.run(
            ['node', js_file],
            capture_output=True,
            text=True
        )
        
        output = {
            'result': json.loads(result.stdout) if result.stdout else None,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
        
        return Output(**output)
    finally:
        os.unlink(js_file)
`,
        originalCode: code,
        language: language,
        executionMethod: 'subprocess'
      };
    }
  }

  private static transpileBash(
    code: string,
    computeEnv: string,
    decoratorInputs: Record<string, any>
  ): TranspiledCode {
    const dockerImage = decoratorInputs.docker_image || 'bash:5';
    const workdir = decoratorInputs.workdir || '.';
    
    if (computeEnv === 'docker') {
      return {
        pythonWrapper: `
import subprocess
from typing import NamedTuple
from collections import namedtuple

@component(
    platform='docker',
    docker_image='${dockerImage}',
    ${this.generateDecoratorFlags(decoratorInputs)}
)
def execute_bash(**kwargs):
    """Execute Bash commands in Docker container"""
    Output = namedtuple('Output', ['stdout', 'stderr', 'exit_code'])
    
    result = subprocess.run(
        ['bash', '-c', '''${code.replace(/'/g, "\\'")}'''],
        capture_output=True,
        text=True,
        cwd='${workdir}'
    )
    
    return Output(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.returncode
    )
`,
        originalCode: code,
        language: 'bash',
        executionMethod: 'docker'
      };
    } else {
      return {
        pythonWrapper: `
import subprocess
from typing import NamedTuple
from collections import namedtuple

@component(${this.generateDecoratorFlags(decoratorInputs)})
def execute_bash(**kwargs):
    """Execute Bash commands locally"""
    Output = namedtuple('Output', ['stdout', 'stderr', 'exit_code'])
    
    result = subprocess.run(
        ['bash', '-c', '''${code.replace(/'/g, "\\'")}'''],
        capture_output=True,
        text=True,
        cwd='${workdir}'
    )
    
    return Output(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.returncode
    )
`,
        originalCode: code,
        language: 'bash',
        executionMethod: 'subprocess'
      };
    }
  }

  private static transpileCpp(
    code: string,
    computeEnv: string,
    decoratorInputs: Record<string, any>
  ): TranspiledCode {
    const dockerImage = decoratorInputs.docker_image || 'gcc:latest';
    const compilerFlags = decoratorInputs.compiler_flags || '-O2';
    
    return {
      pythonWrapper: `
import subprocess
import tempfile
import os
from typing import NamedTuple
from collections import namedtuple

@component(
    platform='${computeEnv}',
    docker_image='${dockerImage}',
    ${this.generateDecoratorFlags(decoratorInputs)}
)
def execute_cpp(**kwargs):
    """Compile and execute C++ code"""
    Output = namedtuple('Output', ['result', 'stdout', 'stderr'])
    
    # Write C++ code to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
        f.write('''${code.replace(/'/g, "\\'")}''')
        cpp_file = f.name
    
    exe_file = cpp_file.replace('.cpp', '')
    
    try:
        # Compile
        compile_result = subprocess.run(
            ['g++', '${compilerFlags}', cpp_file, '-o', exe_file],
            capture_output=True,
            text=True
        )
        
        if compile_result.returncode != 0:
            return Output(
                result=None,
                stdout='',
                stderr=f'Compilation failed: {compile_result.stderr}'
            )
        
        # Execute
        run_result = subprocess.run(
            [exe_file],
            capture_output=True,
            text=True
        )
        
        return Output(
            result=run_result.returncode,
            stdout=run_result.stdout,
            stderr=run_result.stderr
        )
    finally:
        if os.path.exists(cpp_file):
            os.unlink(cpp_file)
        if os.path.exists(exe_file):
            os.unlink(exe_file)
`,
      originalCode: code,
      language: 'cpp',
      executionMethod: computeEnv === 'docker' ? 'docker' : 'subprocess'
    };
  }

  private static transpileRust(
    code: string,
    computeEnv: string,
    decoratorInputs: Record<string, any>
  ): TranspiledCode {
    const dockerImage = decoratorInputs.docker_image || 'rust:latest';
    
    return {
      pythonWrapper: `
import subprocess
import tempfile
import os
from typing import NamedTuple
from collections import namedtuple

@component(
    platform='${computeEnv}',
    docker_image='${dockerImage}',
    ${this.generateDecoratorFlags(decoratorInputs)}
)
def execute_rust(**kwargs):
    """Compile and execute Rust code"""
    Output = namedtuple('Output', ['result', 'stdout', 'stderr'])
    
    # Write Rust code to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.rs', delete=False) as f:
        f.write('''${code.replace(/'/g, "\\'")}''')
        rust_file = f.name
    
    exe_file = rust_file.replace('.rs', '')
    
    try:
        # Compile
        compile_result = subprocess.run(
            ['rustc', rust_file, '-o', exe_file],
            capture_output=True,
            text=True
        )
        
        if compile_result.returncode != 0:
            return Output(
                result=None,
                stdout='',
                stderr=f'Compilation failed: {compile_result.stderr}'
            )
        
        # Execute
        run_result = subprocess.run(
            [exe_file],
            capture_output=True,
            text=True
        )
        
        return Output(
            result=run_result.returncode,
            stdout=run_result.stdout,
            stderr=run_result.stderr
        )
    finally:
        if os.path.exists(rust_file):
            os.unlink(rust_file)
        if os.path.exists(exe_file):
            os.unlink(exe_file)
`,
      originalCode: code,
      language: 'rust',
      executionMethod: computeEnv === 'docker' ? 'docker' : 'subprocess'
    };
  }

  private static generateDecoratorFlags(decoratorInputs: Record<string, any>): string {
    const flags: string[] = [];
    
    // Add boolean flags
    if (decoratorInputs.graph_tracing) flags.push('graph_tracing=True');
    if (decoratorInputs.clear_graph) flags.push('clear_graph=True');
    if (decoratorInputs.multipipeline) flags.push('multipipeline=True');
    if (decoratorInputs.celery_pipeline) flags.push('celery_pipeline=True');
    if (decoratorInputs.kubernetes_pipeline) flags.push('kubernetes_pipeline=True');
    
    // Add celery include files
    if (decoratorInputs.celery_include_files && Array.isArray(decoratorInputs.celery_include_files)) {
      const files = decoratorInputs.celery_include_files.map((f: string) => `'${f}'`).join(', ');
      flags.push(`celery_include_files=[${files}]`);
    }
    
    // Add graph config
    if (decoratorInputs.graph_config && typeof decoratorInputs.graph_config === 'object') {
      flags.push(`graph_config=${JSON.stringify(decoratorInputs.graph_config)}`);
    }
    
    // Add additional attributes
    if (decoratorInputs.additional_attributes && typeof decoratorInputs.additional_attributes === 'object') {
      flags.push(`additional_attributes=${JSON.stringify(decoratorInputs.additional_attributes)}`);
    }
    
    // Add docker_id if present
    if (decoratorInputs.docker_id) {
      flags.push(`docker_id='${decoratorInputs.docker_id}'`);
    }
    
    return flags.join(',\\n    ');
  }
}

export default CodeTranspiler;