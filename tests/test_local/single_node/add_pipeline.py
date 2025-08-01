# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from twingraph import component, pipeline
from typing import NamedTuple
import numpy
import os 

@component()
def Func_A_mult(directory:list, inp_1: float, inp_2: float) -> NamedTuple:
    import numpy as np
    output_1 = np.add(inp_1, inp_2)
    numpy.savetxt(directory+'/outputs_pipeline_2.csv',np.array([output_1]))
    print(directory+'outputs_pipeline_2.csv',np.array([output_1]))
    from collections import namedtuple
    poutput = namedtuple('outputs', ['Dummy'])
    return poutput(None)


@pipeline()
def pipeline_2():
    inputs = numpy.loadtxt('inputs_pipeline_2.csv')
    Func_A_mult(os.getcwd(), inputs[0], inputs[1])
    

    
