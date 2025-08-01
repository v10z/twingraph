# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

import hashlib
import datetime

import time
import random
import os
from io import StringIO
import json
import ast
from collections import namedtuple

from twingraph.docker.docker_utils import get_client
from twingraph.awsmodules.batch import setup_batch_objects, submit_batch_job
from twingraph.awsmodules.awslambda import lambd_functions
from twingraph.kubernetes.k8s_class import create_container, create_pod_template, create_job
from kubernetes import client as kube_client

import subprocess
import re
import pandas as pd


def replace_full_words(text, dic):
    for i, j in dic.iteritems():
        text = re.sub(i, j, text)
    return text


def create_python_input_str(input_dict, attributes):
    input_str = ''
    for key, val in input_dict.items():
        if type(val) == str:
            input_str += key + "=¿" + str(val) + "¿,"
        else:
            input_str += key + "=" + str(val) + ","

    python_str = '\nimport sys\nfrom typing import NamedTuple\n' + attributes['Source Code'].replace("'", "¿").replace(
        '"', '§') + "\nprint(" + attributes['Name'] + "(" + input_str + "))"
    return python_str


def parse_outputs(output_str):
    # print(output_str)
    output_line = output_str.splitlines()[-1]
    # print('****', output_line)
    node = ast.parse(output_line)
    try:
        keyword_list = [key.arg for key in node.body[0].value.keywords]
    except Exception as e:
        # print(e)
        raise Exception('Code failed to run - please check function')

    keyword_values = []
    for key in node.body[0].value.keywords:
        try:
            keyword_values.append(key.value.value)
        except:
            try:
                if (ast.dump(key.value.op) == 'UAdd()'):
                    sign = +1.
                elif (ast.dump(key.value.op) == 'USub()'):
                    sign = -1.
                keyword_values.append(sign * key.value.operand.value)
            except:
                try:
                    keyword_values.append(
                        [sub_val.value for sub_val in key.value.elts])
                except:
                    pass

    outputs = namedtuple(node.body[0].value.func.id, keyword_list)
    return outputs(*keyword_values)


def run_docker_compose(docker_id, input_dict, attributes):

    python_str = create_python_input_str(input_dict, attributes)

    python_str = python_str.replace('§', '\\"').replace('¿', "\'")

    client = get_client()
    container = client.containers.run(
        docker_id, 'python -c \"' + python_str + '\"', detach=True)
    container.wait()

    output_str = container.logs().decode()

    ioutputs = parse_outputs(output_str)
    return ioutputs


def run_lambda(input_dict, attributes, lambda_config):

    python_str = create_python_input_str(input_dict, attributes)

    python_str = python_str.replace('§', '\'').replace(
        '¿', '\'').replace('\n', '\\n')

    Unfinished = True
    try_id=0
    max_retries=5
    while Unfinished and try_id<max_retries:
        try:
            output_str = lambd_functions.invoke_lambd_function(
                attributes['Name'], python_str, lambda_config['region_name'], attributes['Hash'], extended_output=lambda_config.get('extended_output','False'))
            if output_str == None:
                raise Exception('Outputs not found from Lambda')
            Unfinished = False
        except:
            pass
        try_id+=1

    ioutputs = parse_outputs(output_str)
    return ioutputs


def run_aws_batch(input_dict, attributes, batch_config):

    python_str = create_python_input_str(input_dict, attributes)

    python_str = python_str.replace('§', '\\"').replace('¿', "\'")

    if "wait" in batch_config.keys():
        wait = bool(batch_config["wait"])
    else:
        wait = True

    cw_log_name = submit_batch_job.submit_job(logGroupName=batch_config['logGroupName'],
                                              jobName='job-' +
                                              attributes['Hash'],
                                              jobQueue=batch_config['jobQueue'],
                                              jobDefinition='job-' +
                                              attributes['Name'],
                                              command=[
                                                      "/bin/bash", "-c", "python -c \"" + python_str + "\""],
                                              regionName=batch_config['region_name'],
                                              wait=wait)

    output_str = submit_batch_job.obtain_results(batch_config, cw_log_name)

    ioutputs = parse_outputs(output_str)
    return ioutputs


def run_kubernetes(docker_id, input_dict, attributes, kube_config):

    python_str = create_python_input_str(input_dict, attributes)

    python_str = python_str.replace('§', '\\"').replace('¿', "\'")

    run_container = create_container(docker_id, attributes['Hash'], kube_config.get(
        'pull_policy', "Always"), ["/bin/sh", "-c"], ['python -c \"' + python_str + '\"'])
    pod_template = create_pod_template(attributes['Hash'], run_container)
    job = create_job(attributes['Hash'], pod_template)
    k8s_batch_api = kube_client.BatchV1Api()
    k8s_batch_api.create_namespaced_job(
        kube_config.get('namespace', 'default'), job)

    subprocess.check_output(
        ["kubectl", "wait", "--for=condition=complete", "--timeout=" + kube_config.get('timeout', '360000') + "s", "job/" + attributes['Hash']])

    output_str = subprocess.check_output(
        ["kubectl", "logs", "job/" + attributes['Hash']]).decode()

    ioutputs = parse_outputs(output_str)
    return ioutputs


def remove_line_containing(file_string, match):
    return ''.join(['' if line.find(match) > 0 else line for line in file_string.splitlines(keepends=True)])


def pick_lines_containing(file_string, match):
    matching_lines = ''.join([line if line.find(
        match) > 0 else '' for line in file_string.splitlines(keepends=True)])

    return matching_lines.splitlines(keepends=True)[-1]


def line_no(inp, target):
    inp = inp.split(target)
    line_no = len(inp[0].split('\n'))
    return line_no - 1


def load_inputs(args, kwargs, argspec):
    """
    Load and process function inputs for component execution.
    
    This function has been refactored to be more robust while maintaining
    backward compatibility. The fragile string replacements have been replaced
    with proper serialization.
    """
    try:
        # Import the robust implementation
        from .robust_utils import robust_load_inputs, serialize_inputs
        
        # Use the robust implementation
        serializable_dict, runtime_dict = robust_load_inputs(args, kwargs, argspec)
        
        # Format input_vals for backward compatibility
        s = StringIO()
        print(args, kwargs, file=s)
        input_vals = s.getvalue()
        
        # Return serializable version for JSON compatibility
        return input_vals, serializable_dict
        
    except Exception as e:
        # Fallback to original implementation if robust version fails
        # This ensures backward compatibility
        s = StringIO()
        
        adjusted_args = list(argspec.args)  # Make a copy to avoid modifying original
        print(args, kwargs, file=s)
        
        # Build input dictionary more safely
        input_dict = {}
        
        # Map positional arguments
        for i, arg in enumerate(args):
            if i < len(adjusted_args):
                input_dict[adjusted_args[i]] = arg
        
        # Add keyword arguments
        input_dict.update(kwargs)
        
        input_vals = s.getvalue()
        
        # Improved serialization handling
        serialized_dict = {}
        for key, value in input_dict.items():
            if hasattr(value, 'to_json') and callable(value.to_json):
                # Handle pandas DataFrames
                serialized_dict[key] = json.loads(value.to_json(orient='records'))
            elif isinstance(value, (list, dict, str, int, float, bool, type(None))):
                # Already JSON-serializable
                serialized_dict[key] = value
            else:
                # Convert to string representation for non-serializable objects
                serialized_dict[key] = str(value)
        
        return input_vals, serialized_dict


def set_randomize_time():
    time.sleep(random.randint(0, 10000) / 10000000.0)
    pass


def set_hash(parent_hash):
    str2hash = ''.join(parent_hash)
    str2hastime = str2hash + str(datetime.datetime.now())
    encoded_child_hash = hashlib.md5(
        str2hastime.encode(), usedforsecurity=False)
    return str(encoded_child_hash.hexdigest())


def set_gremlin_port_ip(graph_config):
    """
    Get Gremlin endpoint from configuration with robust fallback.
    
    Priority order:
    1. Explicit graph_config parameter
    2. Environment variable TWINGRAPH_GREMLIN_ENDPOINT
    3. Default localhost endpoint
    """
    # Try to use robust configuration if available
    try:
        from .robust_utils import resolve_graph_config
        config = resolve_graph_config(decorator_config=graph_config)
        gremlin_ip_port = config.endpoint
    except:
        # Fallback to original logic
        if graph_config == {} or graph_config is None:
            # Check environment variable first
            gremlin_ip_port = os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', 'ws://127.0.0.1:8182/gremlin')
        else:
            try:
                gremlin_ip_port = graph_config.get('graph_endpoint', 
                    os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', 'ws://127.0.0.1:8182/gremlin'))
            except:
                gremlin_ip_port = os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', 'ws://127.0.0.1:8182/gremlin')
    
    # Ensure endpoint has /gremlin suffix if not already present
    if not gremlin_ip_port.endswith('/gremlin'):
        gremlin_ip_port = gremlin_ip_port.rstrip('/') + '/gremlin'
    
    return gremlin_ip_port


def set_AWS_ARN():
    try:
        import boto3
        client = boto3.client('sts')
        response_dict = client.get_caller_identity()
        response = response_dict['Arn']
    except:
        response = 'Unknown'
    return response


def lambda_create_component(component_docker_ids, comp_name, lambda_config):
    lambd_functions.create_lambd_function(
        comp_name, component_docker_ids, lambda_config['iam_role'], lambda_config['architecture'], lambda_config['storage_size'], lambda_config['memory_size'], lambda_config["timeout"])


def batch_create_component(component_docker_ids, comp_name, batch_config):
    setup_batch_objects.register_job_definition(jobDefName='job-' + comp_name, image=component_docker_ids, unitVCpus=batch_config["vCPU"], unitMemory=batch_config["Mem"], regionName=batch_config['region_name'], numGPUs=batch_config.get('numGPUs', 0),envType=batch_config.get("envType", 'ec2'), roleARN=batch_config.get("roleARN", ''))
