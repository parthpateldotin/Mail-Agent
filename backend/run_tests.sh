#!/bin/bash

# Add the current directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Run pytest with coverage
pytest "$@" 