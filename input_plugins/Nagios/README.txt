Nagios input plugin for TENIS
=============================

Reads alerts from nagios.log file and send them to TENIS servers as jsons.

Manual run:
sudo ./tenis_nip.py --server http://192.168.0.1:8000 \
	[--obj /var/log/nagios/objects.cache] \
	[--log /var/log/nagios/nagios.log] \
	[--nip_log /var/log/nip.log] \
	[--token 'access_token'] \
	[--project 'main']

Or install as a service:
sudo ./install.sh -s http://192.168.0.1:8000 \
	[-o /var/log/nagios/objects.cache] \
	[-l /var/log/nagios/nagios.log] \
	[-n /var/log/nip.log] \
	[-t 'access_token'] \
	[-p 'main']

Options description:
-o|--obj     - Path to Nagios object.cache file (default value '/var/log/nagios/objects.cache')
-l|--log     - Path to Nagios log file (default value '/var/log/nagios/nagios.log')
-n|--nip_log - Path to NIP log file (default value /var/log/nip.log')
-p|--project - Project within TENIS (default value 'main')
-s|--server  - TENIS server url (required)
-t|--token   - Access token (optional)

Note that it's more secure to write token to 'access_token' variable inside tenis_nip.py instead of adding through args.
Use this command to check files location:
    egrep 'log_file|object_cache_file' /etc/nagios/nagios.cfg
