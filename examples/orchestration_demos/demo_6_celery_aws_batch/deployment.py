# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from twingraph import pipeline
from components.component_1 import Func_C, Func_D
from components.component_2 import Func_A, Func_B
import json

@pipeline(batch_pipeline=True, celery_pipeline=True, celery_concurrency_threads=16, celery_include_files=['components/component_1.py', 'components/component_2.py'])
def test_orchestration():
    i_1 = 5
    f_1 = 1.28

    g = Func_A(inp_1=i_1, inp_2=f_1)

    h = Func_B(parent_hash=[g['hash']], inp_1=[
                   i_1, g['outputs']['index'], g['outputs']['val']], inp_2=f_1)

    m = []
    for n in range(250): 
        m.append(Func_C(parent_hash=[
            g['hash'], h['hash']], inp_1='hello' + str(h['outputs']['index']), inp_2=g['outputs']['val']))

    q = []
    for j in range(122):
        q.append(Func_D(parent_hash=[
            m[2 * j]['hash'], g['hash'], h['hash']], inp_1=m[2 * j]['outputs']['val'], inp_2=i_1, inp_3=g['outputs']['val'], inp_4=h['outputs']['val']))


test_orchestration()
