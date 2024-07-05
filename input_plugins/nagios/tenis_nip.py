#!/usr/bin/env python3
# Nagios Input Plugin for TENIS

import os
import re
import logging
import requests
import subprocess
from time import sleep, time
from argparse import ArgumentParser

access_token = ''   # TENIS Access token, it's more secure to write it here or as env var instead of adding through args
check_files = 60    # Main files check timeout in sec, if files where deleted or recreated we have to reopen them
check_alerts = 10   # Check alerts timeout, list of alerts will be collected from Tenis and checked if alerts are actual
nagios_obj = '/var/log/nagios/objects.cache'  # Default Nagios' active objects cache file
nagios_cmd = '/var/log/nagios/rw/nagios.cmd'  # Default Nagios' command file path to send commands
nagios_log = '/var/log/nagios/nagios.log'     # Default Nagios' event log file path to parse
nagios_dat = '/var/log/nagios/status.dat'     # Default Nagios' status file path to parse
nagios_cfg = '/etc/nagios/nagios.cfg'         # Default Nagios' config file path to parse
plugin_log = '/var/log/nip.log'               # Default log file path for this script
plugin_pid = 'NIP'                            # Default plugin ID string to match alerts
project_name = 'main'                         # Default project name
max_send = 5000                               # Send max 5000 events at once
# -------------------------------------------------------------------------------------------------------------------- #


def args_parser():
    token = os.environ.get('NIP_TOKEN', access_token)
    parser = ArgumentParser()
    parser.add_argument('-p', '--project', help='Project within TENIS',       default=project_name)
    parser.add_argument('-d', '--debug',   help='Print some debug data',      action='store_true')
    parser.add_argument('-c', '--cfg',     help='Path to Nagios config file', default=nagios_cfg)
    parser.add_argument('-l', '--log',     help='Path to NIP log file',       default=plugin_log)
    parser.add_argument('-i', '--pid',     help='NIP id to match alerts',     default=plugin_pid)
    parser.add_argument('-s', '--server',  help='TENIS server url',           required=True)
    parser.add_argument('-t', '--token',   help='Access token',               default=token)
    return parser.parse_args()


def check_file_id(file):
    """
    Get file's st_ino by given path.

    :param file: File path(str)
    :return: file's st_ino or empty string if file not found
    """
    try:
        stats = os.stat(file)
        return stats.st_ino
    except FileNotFoundError:
        logging.warning(f"Can't find {file}")
        return ''


def load_objects(obj, objects):
    """
    Creates a dictionary with services and hosts info, needed to parse fix_instruction url.

    :param obj: Path to Nagios' object.cache file
    :param objects: Dictionary with services and hosts info to fill
    :return: nothing
    """
    try:
        with open(obj) as f:
            new_obj = ''
            obj_name = ''
            obj_dick = {}
            line = 1
            while line:  # Continuously read obj file
                line = f.readline()
                if re.match(r'.*^\s+}.*', line):
                    objects[obj_name.strip()] = obj_dick
                    new_obj = ''
                    obj_dick = {}
                    continue
                if re.match(r'.*define\s*(host|service)\s*{', line):
                    new_obj = line.strip().split()[1]
                    continue
                if new_obj:
                    key = line.strip().split()[0]
                    val = ' '.join(line.strip().split()[1:])
                    obj_dick[key] = val
                if new_obj == 'host':
                    if re.match(r'.*host_name.*', line):
                        obj_name = line.strip()
                if new_obj == 'service':
                    if re.match(r'.*service_description.*', line):
                        obj_name = re.sub(r'.*service_description\s*(.+)$', r'\1', line).strip()
        logging.info(f"Reloading {obj}")
    except FileNotFoundError:
        logging.warning(f"Can't find {obj}")


def send_events(args, events, dump, tenis):
    """
    Send alerts.json to TENIS server.

    :param args: Script's arguments
    :param events: Global List of alerts and resolves
    :param dump: Global List of alerts and resolves that weren't send, to try to send them again
    :param tenis: Persistent connection to Tenis server
    :return: True if data were sent ok or False in case of some error
    """
    can_clear_data = True
    for event_type in ['update', 'resolve']:
        if events[event_type] or dump[event_type]:
            tmp_list = events[event_type]
            tmp_list.extend(dump[event_type])
            i = 0
            pack = tmp_list[i:max_send]
            alerts_dick = {event_type: pack}
            while pack:
                try:
                    resp = tenis.post(args.server + '/in', json=alerts_dick)
                    if int(resp.status_code) >= 400:
                        logging.critical(f"Error during sending events to TENIS: {resp.status_code} {resp.text}")
                    if args.debug:
                        print(resp.status_code, resp.text, '\n', alerts_dick)
                except Exception as e:
                    can_clear_data = False
                    logging.critical(f"Error during sending events to TENIS: {str(e)}")
                i += max_send
                pack = tmp_list[i:i+max_send]
                alerts_dick = {event_type: pack}
                if pack:
                    sleep(1)

    return can_clear_data


def parse_nagios_config(cfg, log, obj, dat, cmd):
    """
    Parse Nagios' config file to get paths to nagios.log, status.dat and object.cache

    :param cfg: Path to Nagios' config file
    :param log: Default value for Nagios' log file
    :param obj: Default value for Nagios' object.cache
    :param dat: Default value for Nagios' status.dat
    :return: renewed log, obj, dat
    """

    new_log, new_dat, new_obj, new_cmd = '', '', '', ''
    with open(cfg) as f:
        line = 1
        while line:
            line = f.readline()
            if re.match(r'^log_file=.+', line):
                new_log = line.split('=')[1].strip()
            if re.match(r'^command_file=.+', line):
                new_cmd = line.split('=')[1].strip()
            if re.match(r'^status_file=.+', line):
                new_dat = line.split('=')[1].strip()
            if re.match(r'^object_cache_file=.+', line):
                new_obj = line.split('=')[1].strip()
            if new_obj and new_log and new_dat:
                break
    if new_log:
        log = new_log
    if new_dat:
        dat = new_dat
    if new_obj:
        obj = new_obj
    if new_cmd:
        cmd = new_cmd

    return log, obj, dat, cmd


def parse_status_dat(dat, project, pid, objects):
    """
    Parse status.dat to get alerts that already fired or resolved long ago before NIP service (re)start

    :param dat: Path to Nagios' status.dat file
    :param project: Project name
    :param pid: Plugin ID
    :param objects: Dictionary with services info, needed to parse fix_instruction url
    :return: list of alert items(dictionary)
    """

    alerts = []
    # Grep only actual alerts, the fastest method
    greps = [
        'current_state=[1-9]',
        r'(service|host)status\s',
        'last_time_up=',
        'host_name=',
        'last_hard_state_change=',
        'service_description=',
        r'\splugin_output=',
    ]
    full_grep = '|'.join(greps)
    cmd = [f"grep -E '{greps[0]}' -B16 -A17 {dat} | grep -E '{full_grep}'"]
    data = []
    try:
        data = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE).stdout.decode('utf-8').split('\n')
    except Exception as e:
        logging.warning(f"Error reading data from {dat}: {str(e)}")

    # Resulted data example (6 lines)
    # hoststatus {
    # host_name=archive01
    # current_state=0
    # plugin_output=PING OK - Packet loss = 0%, RTA = 0.14 ms
    # last_hard_state_change=1706471355
    # last_time_up=1707306034
    host_map = ('host', 'severity', 'message', 'fired', 'trash')

    # servicestatus {
    # host_name=blogse13
    # service_description=Package versions - nrpe
    # current_state=0
    # last_hard_state_change=1677065634
    # plugin_output=OK: nrpe version 4.0 OK
    service_map = ('host', 'name', 'severity', 'fired', 'message')
    srv_sev_map = ('OK', 'WARNING', 'CRITICAL', 'UNKNOWN')
    hst_sev_map = ('UP', 'DOWN', 'UNKNOWN')

    step = 6  # to process all 6 lines of each item at once
    for i in range(0, len(data), step):
        if data[i]:
            try:
                event = {'type': 'update'}
                raw = data[i:i + step]
                typ = raw.pop(0)
                for j in range(0, len(raw)):
                    parameter_name = host_map[j]
                    if re.match(r'service', typ):
                        parameter_name = service_map[j]
                    parameter_value = raw[j].split('=')[1:]
                    event[parameter_name] = '='.join(parameter_value)
                event['fired'] = int(event['fired'])
                if re.match(r'service', typ):
                    event['severity'] = srv_sev_map[int(event['severity'])]
                if re.match(r'host', typ):
                    event['severity'] = hst_sev_map[int(event['severity'])]
                    event['name'] = 'HOST DOWN'
                if event['severity'] == 'OK' or event['severity'] == 'UP':
                    event['type'] = 'resolve'
                add_events(project, event, alerts, pid, objects)
            except Exception as e:
                logging.warning(f"Error reading data from {dat}: {str(e)}")
    return alerts


def add_events(project, event, events, pid, objects):
    """
    Append the list of alerts with new items.

    :param project: Project name
    :param event: Dictionary with Alert parameters
    :param events: Lists of updates and resolves to append too
    :param pid: Plugin ID
    :param objects: Dictionary with services info, needed to parse fix_instruction url
    :return: nothing
    """

    try:
        notes_url = objects[event['name']]['notes_url']
    except KeyError:
        notes_url = ''

    # Check for INFO alerts
    # If alert name starts with '_' change severity to INFO and remove '_' from name
    # or if alert message started from 'INFO:', change severity to INFO
    if event['type'] == 'update':
        if re.match(r'^INFO:.*', event['message']):
            event['severity'] = 'INFO'
    # Note that we need to change names for resolves too, otherwise they won't work
    if re.match(r'^_', event['name']):
        event['name'] = re.sub(r'^_', '', event['name'])
        event['severity'] = 'INFO'

    event_template = {
        'resolve': {
            "project": project,
            "host": event['host'],
            "alertName": event['name'],
            "plugin_id": pid,
        },

        'update': {
            "project": project,
            "host": event['host'],
            "fired": event['fired'],
            "alertName": event['name'],
            "severity": event['severity'],
            "msg": event['message'],
            "responsibleUser": "",
            "comment": "",
            "silenced": False,
            "plugin_id": pid,
            "customFields": {
                "fixInstructions": notes_url,
            }
        }
    }

    events.append(event_template[event['type']])


def recheck(command, cmd):
    """
    Schedule force recheck for service or host

    :param command: { 'cmd': 'command_name', 'host': 'host_name', 'alertName': 'alert_name' }
    :param cmd: Path to the Nagios' command file
    :return: nothing
    """
    ts = int(time())
    nag_cmd = f"[{ts}] SCHEDULE_FORCED_SVC_CHECK;{command['host']};{command['alertName']};{ts}\n"
    if command['alertName'] == 'HOST DOWN':
        nag_cmd = f"[{ts}] SCHEDULE_FORCED_HOST_CHECK;{command['host']};{ts}\n"

    with open(cmd, 'w') as cmd_file:
        cmd_file.write(nag_cmd)


def main():
    """
    Main loop, open connection to TENIS server.
    Check and read files, collect events(alerts and resolves) and send them to Tenis server.
    If files were deleted/recreated function rereads them an continue.
    Start logging.

    :return: nothing
    """

    args = args_parser()
    log, obj, dat, cmd = parse_nagios_config(args.cfg, nagios_log, nagios_obj, nagios_dat, nagios_cmd)
    # Nagios' log data example, we need strings with '^\[[0-9]+].*(SERVICE|HOST)\sALERT:.*' pattern:
    # N of index in lst:       0            1        2      3   4       5
    # [1705421869] SERVICE ALERT: host;Alert name;CRITICAL;SOFT;1;Alert message
    #                 0        1        2          3        4         5
    service_map = ('fired', 'name', 'severity', 'trash', 'trash', 'message')

    # N of index in lst:    0         1    2  3       4
    # [1705421869] HOST ALERT: host;DOWN;SOFT;1;Alert message
    # Note that Host alerts don't have name, therefore list indexes are differs a bit
    #              0         1          2        3         4
    host_map = ('fired', 'severity', 'trash', 'trash', 'message')

    # Start logging
    logging.basicConfig(
        filemode="w",
        filename=args.log,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    logging.info('NIP service restarted')

    tenis = requests.Session()  # Open persistent connection to Tenis server
    try:
        if args.token:
            tenis.headers.update({'X-Tenis-Token': args.token})
        resp = tenis.get(args.server + '/healz')
        if resp.ok:
            logging.info(f"Connection to {args.server} established")
        else:
            logging.critical(f'Failed to establish connection to TENIS server: {resp.text}')
    except Exception as e:
        logging.critical(f"Error connection to TENIS server: {str(e)}")

    n = 0.001
    objects = {}
    first_start = True
    load_objects(obj, objects)
    dump = {'update': [], 'resolve': []}
    events = {'update': [], 'resolve': []}
    alerts = parse_status_dat(dat, args.project, args.pid, objects)
    if alerts:
        events['update'].extend(alerts)

    while 1:  # Main loop to reopen nagios.log file if it was recreated
        while not os.path.exists(log):  # wait until log file is ready
            sleep(1)

        timer_files = 0
        timer_alerts = 0
        log_id = check_file_id(log)
        obj_id = check_file_id(obj)
        logging.info(f"Start reading file {log}")

        with open(log) as f:
            if first_start:
                f.seek(0, os.SEEK_END)  # Jump to the end of log file if plugin just started
                first_start = False     # But then read file from the beginning if it's rolled

            while 2:  # Continuously read log file
                try:  # To log all possible errors
                    raw_alert = f.readline()
                    if raw_alert != '':  # If string is not empty parse it
                        if re.match(r'^\[[0-9]+].*(SERVICE|HOST)\sALERT:.*', raw_alert):
                            raw_alert_split = raw_alert.split(';')
                            event = {'type': 'update', 'fired': '', 'host': '', 'name': '', 'severity': '', 'message': ''}
                            if re.match(r'.*HOST.*', raw_alert_split[0]):  # than it's Host alert
                                for i in range(0, len(raw_alert_split)):
                                    parameter_name = host_map[i]
                                    parameter_value = raw_alert_split[i]
                                    if parameter_name == 'fired':
                                        event['fired'] = int(re.sub(r'.*\[(.*)].*', r'\1', parameter_value))
                                        event['host'] = parameter_value.split(' ')[-1]
                                    else:
                                        event[parameter_name] = parameter_value.strip()
                                event['name'] = 'HOST DOWN'
                            else:  # it's Service alert
                                for i in range(0, len(raw_alert_split)):
                                    parameter_name = service_map[i]
                                    parameter_value = raw_alert_split[i]
                                    if parameter_name == 'fired':
                                        event['fired'] = int(re.sub(r'.*\[(.*)].*', r'\1', parameter_value))
                                        event['host'] = parameter_value.split(' ')[-1]
                                    else:
                                        event[parameter_name] = parameter_value.strip()

                            if re.match(r'OK|UP', event['severity']):  # it's Resolve
                                event['type'] = 'resolve'

                            add_events(args.project, event, events[event['type']], args.pid, objects)

                    else:  # If string is empty it means we reached the end of file, send collected events, renew events
                        if events['update'] or events['resolve']:
                            if send_events(args, events, dump, tenis):  # If sender succeeded, renew data
                                events = {'update': [], 'resolve': []}
                                dump = {'update': [], 'resolve': []}
                            else:  # If sender failed, save data to dump dick to try to send it later
                                dump['update'].extend(events['update'])
                                dump['resolve'].extend(events['resolve'])
                                events = {'update': [], 'resolve': []}

                except Exception as e:  # Logg all errors
                    logging.critical(f"Some error occurred: {str(e)}")
                    sleep(check_files)

                sleep(n)  # To keep CPU load low
                timer_files += n
                timer_alerts += n
                if timer_alerts >= check_alerts:  # It's time to check alerts and commands
                    timer_alerts = 0
                    try:
                        json_hdr = {'Accept': 'application/json'}
                        n_alerts = parse_status_dat(dat, args.project, args.pid, objects)
                        t_alerts = tenis.get(args.server + f'/out?pid={args.pid}', headers=json_hdr).json()
                        commands = tenis.get(args.server + f'/out?pid={args.pid}&type=cmd', headers=json_hdr).json()

                        for command in commands:
                            if command['cmd'] == 'recheck':
                                if args.debug:
                                    print(command)
                                recheck(command, cmd)

                        if t_alerts != n_alerts:
                            for item in n_alerts:
                                tmp = [z for z in t_alerts
                                       if z['host'] == item['host']
                                       and z['alertName'] == item['alertName']
                                       and z['msg'] == item['msg']]
                                if not tmp:
                                    events['update'].append(item)

                        for item in t_alerts:
                            event = {
                                'name': item['alertName'],
                                'fired': item['fired'],
                                'host': item['host'],
                                'type': 'resolve',
                                'severity': 'OK',
                                'message': ''
                            }
                            if not n_alerts:
                                add_events(args.project, event, events['resolve'], args.pid, objects)
                            else:
                                tmp = [z for z in n_alerts
                                       if z['host'] == item['host']
                                       and z['alertName'] == item['alertName']]
                                if not tmp:
                                    add_events(args.project, event, events['resolve'], args.pid, objects)
                    except Exception as e:  # Logg all errors
                        logging.critical(f"Some error occurred: {str(e)}")

                if timer_files >= check_files:  # It's time to check Nagios' files
                    timer_files = 0
                    obj_id_new = check_file_id(obj)  # Check that objects file is not deleted/recreated
                    if obj_id_new != obj_id:
                        objects = {}
                        obj_id = obj_id_new
                        load_objects(obj, objects)
                    log_id_new = check_file_id(log)  # Check that log file is not deleted/recreated
                    if log_id_new != log_id:
                        break


if __name__ == '__main__':
    main()
