#!/bin/sh

set -e
dir=$(dirname "$0")
cd "$dir"
python3 -m build
echo "Built packages are in $dir/dist/"
