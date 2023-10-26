#!/bin/sh

set -e
cd $(dirname "$0")
dir=$(pwd)
package=$(ls dist/penis_backend-*.whl -t | head -1) # latest file in terms of mtime
sudo pip3 install --upgrade "file://$dir/$package"
sudo install -oroot -groot -m644 penis-backend.service /lib/systemd/system/penis-backend.service
sudo systemctl daemon-reload
echo "Run \`sudo systemctl restart penis-backend.service' to start Penis backend server"
