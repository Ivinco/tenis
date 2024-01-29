#!/bin/bash

set -e
cd $(dirname "$0")

help="
Options:
    -o Path to Nagios object.cache file (default value '/var/log/nagios/objects.cache')
    -l Path to Nagios log file (default value '/var/log/nagios/nagios.log')
    -n Path to NIP log file (default value /var/log/nip.log')
    -p Project within TENIS (default value 'main')
    -s TENIS server url (required)
    -t Access token (optional)

Note that it's more secure to write token to 'access_token' variable inside tenis_nip.py instead of adding through args.
Use this command to check files location:
    egrep 'log_file|object_cache_file' /etc/nagios/nagios.cfg
"

#Get opts
while getopts ":o:l:n:p:s:t:" opt; do
    case "$opt" in
	       (o)  opts+=("--obj '$OPTARG'");;
	       (l)  opts+=("--log '$OPTARG'");;
	       (t)  opts+=("--token '$OPTARG'");;
           (n)  opts+=("--nip_log '$OPTARG'");;
	       (p)  opts+=("--project '$OPTARG'");;
	       (s)  srv=$OPTARG; opts+=("--server '$srv'");;
           (*)  printf "$help"; exit 1;;
    esac
done
[[ $srv ]] || { printf "$help"; exit 1; }

echo "[Unit]
Description=Nagios Input Plugin for TENIS
After=multi-user.target

[Service]
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
