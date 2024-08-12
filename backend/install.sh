#!/bin/sh

set -e
cd $(dirname "$0")

sudo python3 -m pip install --upgrade pip
dir=$(pwd)
package=$(ls -t dist/tenis_backend-*.whl | head -1) # latest file in terms of mtime
sudo pip3 install --upgrade "file://$dir/$package" --force-reinstall
sudo install -oroot -groot -m644 tenis-backend.service /lib/systemd/system/tenis-backend.service
sudo systemctl daemon-reload
echo "Run \`sudo systemctl restart tenis-backend.service' to start Tenis backend server"
