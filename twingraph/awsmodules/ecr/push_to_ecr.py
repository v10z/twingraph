# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

import boto3



def create_ecr_repo(repositoryName):
    client = boto3.client('ecr')
    response = client.create_repository(
        # registryId='string',
        repositoryName=repositoryName,
        # tags=[
        #     {
        #         'Key': 'string',
        #         'Value': 'string'
        #     },
        # ],
        # imageTagMutability='MUTABLE'|'IMMUTABLE',
        # imageScanningConfiguration={
        #     'scanOnPush': True|False
        # },
        # encryptionConfiguration={
        #     'encryptionType': 'AES256'|'KMS',
        #     'kmsKey': 'string'
        # }
        )
    return response