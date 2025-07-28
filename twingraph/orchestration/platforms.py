"""
Platform-specific executors for TwinGraph components.
"""

import json
import os
import subprocess
import tempfile
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional, Tuple
import docker
import logging

from ..core.exceptions import PlatformExecutionError
from .config import ComponentConfig

logger = logging.getLogger(__name__)


class PlatformExecutor(ABC):
    """Base class for platform-specific executors."""
    
    def __init__(self, config: ComponentConfig):
        self.config = config
    
    @abstractmethod
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function on specific platform."""
        pass
    
    def serialize_inputs(self, args: Tuple[Any, ...], kwargs: Dict[str, Any]) -> str:
        """Serialize inputs for cross-platform execution."""
        return json.dumps({
            'args': list(args),
            'kwargs': kwargs
        })
    
    def deserialize_output(self, output: str) -> Any:
        """Deserialize output from platform execution."""
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            return output


class LocalExecutor(PlatformExecutor):
    """Execute components locally."""
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function locally."""
        return func(*args, **kwargs)


class DockerExecutor(PlatformExecutor):
    """Execute components in Docker containers."""
    
    def __init__(self, config: ComponentConfig):
        super().__init__(config)
        self.client = docker.from_env()
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function in Docker container."""
        if not self.config.docker_image:
            raise PlatformExecutionError("Docker image not specified")
        
        # Create temporary script
        script_content = self._create_execution_script(func, args, kwargs)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(script_content)
            script_path = f.name
        
        try:
            # Run container
            container = self.client.containers.run(
                self.config.docker_image,
                command=f"python /tmp/script.py",
                volumes={
                    script_path: {'bind': '/tmp/script.py', 'mode': 'ro'}
                },
                environment=self._get_environment(context),
                remove=True,
                detach=False,
                stdout=True,
                stderr=True
            )
            
            # Parse output
            output = container.decode('utf-8')
            return self.deserialize_output(output)
            
        except docker.errors.ContainerError as e:
            raise PlatformExecutionError(
                f"Docker execution failed: {e.stderr.decode('utf-8')}"
            )
        finally:
            os.unlink(script_path)
    
    def _create_execution_script(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any]
    ) -> str:
        """Create Python script for execution."""
        import inspect
        
        # Get function source
        func_source = inspect.getsource(func)
        
        # Create execution script
        script = f"""
import json
import sys
from collections import namedtuple

# Function definition
{func_source}

# Load inputs
inputs = {self.serialize_inputs(args, kwargs)}
args = inputs['args']
kwargs = inputs['kwargs']

# Execute function
try:
    result = {func.__name__}(*args, **kwargs)
    
    # Convert result
    if hasattr(result, '_asdict'):
        output = result._asdict()
    else:
        output = result
    
    # Output as JSON
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({{'error': str(e)}}), file=sys.stderr)
    sys.exit(1)
"""
        return script
    
    def _get_environment(self, context: Dict[str, Any]) -> Dict[str, str]:
        """Get environment variables for container."""
        env = {
            'TWINGRAPH_EXECUTION_ID': context['execution_id'],
            'TWINGRAPH_COMPONENT': context['component_name']
        }
        
        # Add custom environment
        if self.config.platform_config.get('environment'):
            env.update(self.config.platform_config['environment'])
        
        return env


class KubernetesExecutor(PlatformExecutor):
    """Execute components on Kubernetes."""
    
    def __init__(self, config: ComponentConfig):
        super().__init__(config)
        
        # Import kubernetes here to avoid dependency if not used
        try:
            from kubernetes import client, config as k8s_config
            self.k8s_client = client
            self.k8s_config = k8s_config
        except ImportError:
            raise PlatformExecutionError(
                "Kubernetes package not installed. Run: pip install kubernetes"
            )
        
        # Load kubernetes config
        try:
            self.k8s_config.load_incluster_config()
        except:
            self.k8s_config.load_kube_config()
        
        self.v1 = self.k8s_client.CoreV1Api()
        self.batch_v1 = self.k8s_client.BatchV1Api()
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function as Kubernetes Job."""
        job_name = f"twingraph-{context['execution_id']}"
        namespace = self.config.platform_config.get('namespace', 'default')
        
        # Create ConfigMap with script
        script_content = self._create_execution_script(func, args, kwargs)
        configmap = self._create_configmap(job_name, script_content, namespace)
        
        try:
            # Create Job
            job = self._create_job(job_name, namespace, context)
            
            # Wait for completion
            result = self._wait_for_job(job_name, namespace)
            
            return self.deserialize_output(result)
            
        finally:
            # Cleanup
            self._cleanup(job_name, namespace)
    
    def _create_configmap(
        self,
        name: str,
        script: str,
        namespace: str
    ) -> Any:
        """Create ConfigMap with execution script."""
        configmap = self.k8s_client.V1ConfigMap(
            metadata=self.k8s_client.V1ObjectMeta(name=f"{name}-script"),
            data={'script.py': script}
        )
        
        return self.v1.create_namespaced_config_map(
            namespace=namespace,
            body=configmap
        )
    
    def _create_job(
        self,
        name: str,
        namespace: str,
        context: Dict[str, Any]
    ) -> Any:
        """Create Kubernetes Job."""
        # Container spec
        container = self.k8s_client.V1Container(
            name='executor',
            image=self.config.docker_image or 'python:3.9',
            command=['python', '/scripts/script.py'],
            volume_mounts=[
                self.k8s_client.V1VolumeMount(
                    name='script',
                    mount_path='/scripts'
                )
            ],
            env=self._get_env_vars(context),
            resources=self._get_resources()
        )
        
        # Pod spec
        pod_spec = self.k8s_client.V1PodSpec(
            restart_policy='Never',
            containers=[container],
            volumes=[
                self.k8s_client.V1Volume(
                    name='script',
                    config_map=self.k8s_client.V1ConfigMapVolumeSource(
                        name=f"{name}-script"
                    )
                )
            ]
        )
        
        # Job spec
        job = self.k8s_client.V1Job(
            metadata=self.k8s_client.V1ObjectMeta(name=name),
            spec=self.k8s_client.V1JobSpec(
                template=self.k8s_client.V1PodTemplateSpec(
                    spec=pod_spec
                ),
                backoff_limit=self.config.max_retries,
                active_deadline_seconds=self.config.timeout
            )
        )
        
        return self.batch_v1.create_namespaced_job(
            namespace=namespace,
            body=job
        )
    
    def _get_env_vars(self, context: Dict[str, Any]) -> List[Any]:
        """Get environment variables for pod."""
        env_vars = [
            self.k8s_client.V1EnvVar(
                name='TWINGRAPH_EXECUTION_ID',
                value=context['execution_id']
            ),
            self.k8s_client.V1EnvVar(
                name='TWINGRAPH_COMPONENT',
                value=context['component_name']
            )
        ]
        
        # Add custom environment
        custom_env = self.config.platform_config.get('environment', {})
        for key, value in custom_env.items():
            env_vars.append(
                self.k8s_client.V1EnvVar(name=key, value=str(value))
            )
        
        return env_vars
    
    def _get_resources(self) -> Any:
        """Get resource requirements."""
        resources = self.config.platform_config.get('resources', {})
        
        return self.k8s_client.V1ResourceRequirements(
            requests={
                'cpu': resources.get('cpu', '100m'),
                'memory': resources.get('memory', '128Mi')
            },
            limits={
                'cpu': resources.get('cpu_limit', '1000m'),
                'memory': resources.get('memory_limit', '1Gi')
            }
        )
    
    def _wait_for_job(self, job_name: str, namespace: str) -> str:
        """Wait for job completion and get output."""
        import time
        
        timeout = self.config.timeout or 300
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check job status
            job = self.batch_v1.read_namespaced_job(
                name=job_name,
                namespace=namespace
            )
            
            if job.status.succeeded:
                # Get pod logs
                pods = self.v1.list_namespaced_pod(
                    namespace=namespace,
                    label_selector=f"job-name={job_name}"
                )
                
                if pods.items:
                    pod_name = pods.items[0].metadata.name
                    logs = self.v1.read_namespaced_pod_log(
                        name=pod_name,
                        namespace=namespace
                    )
                    return logs
                
            elif job.status.failed:
                raise PlatformExecutionError(
                    f"Kubernetes job {job_name} failed"
                )
            
            time.sleep(5)
        
        raise PlatformExecutionError(
            f"Kubernetes job {job_name} timed out"
        )
    
    def _cleanup(self, job_name: str, namespace: str):
        """Clean up Kubernetes resources."""
        try:
            # Delete job
            self.batch_v1.delete_namespaced_job(
                name=job_name,
                namespace=namespace,
                propagation_policy='Background'
            )
            
            # Delete configmap
            self.v1.delete_namespaced_config_map(
                name=f"{job_name}-script",
                namespace=namespace
            )
        except Exception as e:
            logger.warning(f"Failed to cleanup Kubernetes resources: {e}")
    
    def _create_execution_script(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any]
    ) -> str:
        """Create execution script for Kubernetes."""
        # Similar to DockerExecutor but with Kubernetes-specific handling
        return super()._create_execution_script(func, args, kwargs)


class LambdaExecutor(PlatformExecutor):
    """Execute components on AWS Lambda."""
    
    def __init__(self, config: ComponentConfig):
        super().__init__(config)
        
        try:
            import boto3
            self.lambda_client = boto3.client('lambda')
        except ImportError:
            raise PlatformExecutionError(
                "boto3 not installed. Run: pip install boto3"
            )
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function on AWS Lambda."""
        lambda_config = self.config.lambda_config or {}
        function_name = lambda_config.get(
            'function_name',
            f"twingraph-{context['component_name']}"
        )
        
        # Create payload
        payload = {
            'component': context['component_name'],
            'execution_id': context['execution_id'],
            'inputs': self.serialize_inputs(args, kwargs)
        }
        
        try:
            # Invoke Lambda
            response = self.lambda_client.invoke(
                FunctionName=function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps(payload)
            )
            
            # Parse response
            result = json.loads(response['Payload'].read())
            
            if 'errorMessage' in result:
                raise PlatformExecutionError(
                    f"Lambda execution failed: {result['errorMessage']}"
                )
            
            return result
            
        except Exception as e:
            raise PlatformExecutionError(
                f"Lambda invocation failed: {str(e)}"
            )


class BatchExecutor(PlatformExecutor):
    """Execute components on AWS Batch."""
    
    def __init__(self, config: ComponentConfig):
        super().__init__(config)
        
        try:
            import boto3
            self.batch_client = boto3.client('batch')
        except ImportError:
            raise PlatformExecutionError(
                "boto3 not installed. Run: pip install boto3"
            )
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function on AWS Batch."""
        batch_config = self.config.batch_config or {}
        
        job_name = f"twingraph-{context['execution_id']}"
        job_queue = batch_config.get('job_queue')
        job_definition = batch_config.get('job_definition')
        
        if not job_queue or not job_definition:
            raise PlatformExecutionError(
                "AWS Batch job_queue and job_definition required"
            )
        
        # Submit job
        response = self.batch_client.submit_job(
            jobName=job_name,
            jobQueue=job_queue,
            jobDefinition=job_definition,
            parameters={
                'component': context['component_name'],
                'inputs': self.serialize_inputs(args, kwargs)
            },
            timeout={
                'attemptDurationSeconds': self.config.timeout or 3600
            }
        )
        
        job_id = response['jobId']
        
        # Wait for completion
        result = self._wait_for_job(job_id)
        
        return self.deserialize_output(result)
    
    def _wait_for_job(self, job_id: str) -> str:
        """Wait for Batch job completion."""
        import time
        
        timeout = self.config.timeout or 3600
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check job status
            response = self.batch_client.describe_jobs(jobs=[job_id])
            
            if not response['jobs']:
                raise PlatformExecutionError(f"Job {job_id} not found")
            
            job = response['jobs'][0]
            status = job['status']
            
            if status == 'SUCCEEDED':
                # Get output from CloudWatch logs
                return self._get_job_output(job)
            
            elif status in ['FAILED', 'CANCELLED']:
                reason = job.get('statusReason', 'Unknown')
                raise PlatformExecutionError(
                    f"Batch job {job_id} failed: {reason}"
                )
            
            time.sleep(10)
        
        raise PlatformExecutionError(f"Batch job {job_id} timed out")
    
    def _get_job_output(self, job: Dict[str, Any]) -> str:
        """Get job output from CloudWatch logs."""
        # This would retrieve logs from CloudWatch
        # For now, return a placeholder
        return json.dumps({'status': 'completed'})


class SlurmExecutor(PlatformExecutor):
    """Execute components on SLURM cluster."""
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function via SLURM job submission."""
        
        # Create SLURM job script
        script_content = self._create_slurm_script(func, args, kwargs, context)
        
        # Write script to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
            f.write(script_content)
            script_path = f.name
        
        try:
            # Submit job to SLURM
            job_id = self._submit_slurm_job(script_path)
            
            # Wait for completion and get output
            return self._wait_for_completion(job_id)
            
        finally:
            # Clean up script file
            if os.path.exists(script_path):
                os.unlink(script_path)
    
    def _create_slurm_script(self, func, args, kwargs, context) -> str:
        """Create SLURM batch script."""
        config = self.config.platform_config
        
        # SLURM directives
        directives = [
            f"#SBATCH --job-name={config.get('job_name', 'twingraph-job')}",
            f"#SBATCH --nodes={config.get('nodes', 1)}",
            f"#SBATCH --ntasks={config.get('ntasks', 1)}",
            f"#SBATCH --cpus-per-task={config.get('cpus_per_task', 1)}",
            f"#SBATCH --time={config.get('time', '01:00:00')}",
            f"#SBATCH --mem={config.get('memory', '4GB')}",
            f"#SBATCH --output={config.get('output_file', 'slurm-%j.out')}",
            f"#SBATCH --error={config.get('error_file', 'slurm-%j.err')}"
        ]
        
        # Optional directives
        if config.get('partition'):
            directives.append(f"#SBATCH --partition={config['partition']}")
        if config.get('account'):
            directives.append(f"#SBATCH --account={config['account']}")
        if config.get('qos'):
            directives.append(f"#SBATCH --qos={config['qos']}")
        
        # Function source and execution
        import inspect
        func_source = inspect.getsource(func)
        serialized_input = self.serialize_inputs(args, kwargs)
        
        script = f"""#!/bin/bash
{chr(10).join(directives)}

# Load environment
module load python/3.9  # Adjust as needed

# Execute function
python3 << 'EOF'
import json
import sys

{func_source}

# Deserialize inputs
input_data = {serialized_input}
args = input_data['args']
kwargs = input_data['kwargs']

try:
    result = {func.__name__}(*args, **kwargs)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{'error': str(e)}}), file=sys.stderr)
    sys.exit(1)
EOF
"""
        return script
    
    def _submit_slurm_job(self, script_path: str) -> str:
        """Submit job to SLURM and return job ID."""
        try:
            result = subprocess.run(
                ['sbatch', script_path],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Extract job ID from sbatch output
            # Output format: "Submitted batch job 12345"
            output_lines = result.stdout.strip().split('\n')
            for line in output_lines:
                if 'Submitted batch job' in line:
                    job_id = line.split()[-1]
                    return job_id
            
            raise PlatformExecutionError("Could not parse job ID from sbatch output")
            
        except subprocess.CalledProcessError as e:
            raise PlatformExecutionError(f"Failed to submit SLURM job: {e.stderr}")
    
    def _wait_for_completion(self, job_id: str) -> str:
        """Wait for SLURM job completion and return output."""
        import time
        
        timeout = self.config.timeout or 3600
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check job status
            try:
                result = subprocess.run(
                    ['squeue', '-j', job_id, '-h', '-o', '%T'],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    # Job might be completed and no longer in queue
                    return self._get_job_output(job_id)
                
                status = result.stdout.strip()
                
                if status in ['COMPLETED', 'COMPLETING']:
                    return self._get_job_output(job_id)
                elif status in ['FAILED', 'CANCELLED', 'TIMEOUT']:
                    raise PlatformExecutionError(f"SLURM job {job_id} failed with status: {status}")
                
            except subprocess.CalledProcessError:
                # Job might be completed
                return self._get_job_output(job_id)
            
            time.sleep(10)
        
        raise PlatformExecutionError(f"SLURM job {job_id} timed out")
    
    def _get_job_output(self, job_id: str) -> str:
        """Get output from completed SLURM job."""
        config = self.config.platform_config
        output_file = config.get('output_file', 'slurm-%j.out').replace('%j', job_id)
        
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                return f.read().strip()
        else:
            raise PlatformExecutionError(f"Output file {output_file} not found")


class SSHExecutor(PlatformExecutor):
    """Execute components on remote machines via SSH."""
    
    def execute(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function on remote machine via SSH."""
        
        import paramiko
        
        config = self.config.platform_config
        hostname = config.get('hostname')
        username = config.get('username')
        key_file = config.get('key_file', '~/.ssh/id_rsa')
        port = config.get('port', 22)
        
        if not hostname or not username:
            raise PlatformExecutionError("SSH hostname and username are required")
        
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            # Connect to remote host
            key_file_expanded = os.path.expanduser(key_file)
            if os.path.exists(key_file_expanded):
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    key_filename=key_file_expanded,
                    timeout=config.get('timeout', 30)
                )
            else:
                # Try password authentication or agent
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    timeout=config.get('timeout', 30)
                )
            
            # Create remote execution script
            script_content = self._create_remote_script(func, args, kwargs, context)
            
            # Setup remote working directory
            remote_workdir = config.get('remote_workdir', '/tmp/twingraph')
            ssh.exec_command(f'mkdir -p {remote_workdir}')
            
            # Transfer and execute script
            return self._execute_remote_script(ssh, script_content, remote_workdir, config)
            
        finally:
            ssh.close()
    
    def _create_remote_script(self, func, args, kwargs, context) -> str:
        """Create Python script for remote execution."""
        import inspect
        
        func_source = inspect.getsource(func)
        serialized_input = self.serialize_inputs(args, kwargs)
        
        script = f"""#!/usr/bin/env python3
import json
import sys

{func_source}

# Deserialize inputs
input_data = {serialized_input}
args = input_data['args']
kwargs = input_data['kwargs']

try:
    result = {func.__name__}(*args, **kwargs)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{'error': str(e)}}), file=sys.stderr)
    sys.exit(1)
"""
        return script
    
    def _execute_remote_script(self, ssh, script_content: str, remote_workdir: str, config: Dict) -> str:
        """Execute script on remote machine."""
        import uuid
        
        # Generate unique script name
        script_name = f"twingraph_script_{uuid.uuid4().hex[:8]}.py"
        script_path = f"{remote_workdir}/{script_name}"
        
        try:
            # Transfer script to remote
            sftp = ssh.open_sftp()
            with sftp.file(script_path, 'w') as f:
                f.write(script_content)
            sftp.chmod(script_path, 0o755)
            sftp.close()
            
            # Execute script
            python_path = config.get('python_path', 'python3')
            stdin, stdout, stderr = ssh.exec_command(f'{python_path} {script_path}')
            
            # Get output
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code != 0:
                raise PlatformExecutionError(f"Remote execution failed: {error}")
            
            return output.strip()
            
        finally:
            # Cleanup remote script if requested
            if config.get('cleanup_remote', True):
                try:
                    ssh.exec_command(f'rm -f {script_path}')
                except:
                    pass  # Best effort cleanup