# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

import boto3


def get_cloudwatch_client(region):
    return boto3.client(
        service_name='logs',
        region_name=region,
        endpoint_url='https://logs.' + region + '.amazonaws.com')
