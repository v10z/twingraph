# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from twingraph.docker.docker_utils import build_image
import os 
dir_path = os.path.dirname(os.path.realpath(__file__))

build_image(dockerfile_path=dir_path, dockerfile_name='Dockerfile', image_tag='demo2')

