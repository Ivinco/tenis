Nagios input plugin for TENIS
=============================

Reads alerts from nagios.log file and send them to TENIS servers as jsons.
Paths to nagios.log and other nagios files are parsed from nagios.cfg file.

Manual run:
sudo ./tenis_nip.py --server http://192.168.0.1:8000 \
	[--cfg /etc/nagios/nagios.cfg] \
	[--log /var/log/nip.log] \
	[--token 'access_token'] \
	[--project 'main']

Or install as a service:
sudo ./install.sh -s http://192.168.0.1:8000 \
	[-c /etc/nagios/nagios.cfg] \
	[-l /var/log/nip.log] \
	[-t 'access_token'] \
	[-p 'main']

Options description:
-c|--cfg     - Path to Nagios config file (default value '/etc/nagios/nagios.cfg')
-l|--log     - Path to NIP log file (default value /var/log/nip.log')
-p|--project - Project within TENIS (default value 'main')
-s|--server  - TENIS server url (required)
-t|--token   - Access token (optional)

Note that it's more secure to write token to 'access_token' variable inside tenis_nip.py.
Or as environment variable 'NIP_TOKEN' instead of adding through args.
