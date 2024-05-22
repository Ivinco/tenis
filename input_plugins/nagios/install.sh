#!/bin/bash

set -e
cd $(dirname "$0")
cfg='/etc/nagios/nagios.cfg'

help="
Options:
    -c Path to Nagios config file (default value '/etc/nagios/nagios.cfg')
    -l Path to NIP log file (default value /var/log/nip.log')
    -p Project within TENIS (default value 'main')
    -i Plugin ID string to match alerts
    -s TENIS server url (required)
    -t Access token (optional)
"

#Get opts
while getopts ":l:p:c:s:t:i:" opt; do
    case "$opt" in
           (p)  opts+=("--project '$OPTARG'");;
           (l)  opts+=("--log '$OPTARG'");;
           (c)  opts+=("--cfg '$OPTARG'");;
           (i)  opts+=("--pid '$OPTARG'");;
           (s)  srv=$OPTARG; opts+=("--server '$srv'");;
           (t)  printf -v token -- '\nEnvironment="NIP_TOKEN=%s"' "$OPTARG";;
           (*)  printf -- "$help"; exit 1;;
    esac
done
[[ -f $cfg && $srv ]] || { printf "$help"; exit 1; }

echo "[Unit]
Description=Nagios Input Plugin for TENIS
After=multi-user.target

[Service]$token
Type=simple
Restart=always
ExecStart=/usr/bin/tenis_nip.py ${opts[@]}
WantedBy=multi-user.target
" > tenis-nip.service

sudo install -oroot -groot -m700 tenis_nip.py      /usr/bin/tenis_nip.py
sudo install -oroot -groot -m644 tenis-nip.service /lib/systemd/system/tenis-nip.service
sudo systemctl daemon-reload
sudo systemctl restart tenis-nip
rm   tenis-nip.service # cleanup

echo "Run 'systemctl status tenis-nip' to check Nagios input plugin for TENIS"
