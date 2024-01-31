#!/usr/bin/env python3
# Nagios Input Plugin for TENIS

import os
import re
import logging
import requests
from time import sleep
from argparse import ArgumentParser

access_token = ''   # TENIS Access token, it's more secure to write it here or as env var instead of adding through args
check_timeout = 60  # Main files check timeout in sec, if files where deleted or recreated we have to reopen them
objects_file = '/var/log/nagios/objects.cache'  # Default Nagios' active objects cache file path
nagios_log = '/var/log/nagios/nagios.log'       # Default Nagios' event log file path to parse
plugin_log = '/var/log/nip.log'                 # Default log file path for this script
project_name = 'main'                           # Default project name
# -------------------------------------------------------------------------------------------------------------------- #


def args_parser():
    token = os.environ.get('NIP_TOKEN', access_token)
    parser = ArgumentParser()
    parser.add_argument('-o', '--obj',     help='Path to Nagios object.cache file', default=objects_file)
    parser.add_argument('-p', '--project', help='Project within TENIS',             default=project_name)
    parser.add_argument('-d', '--debug',   help='Print some debug data',            action='store_true')
    parser.add_argument('-l', '--log',     help='Path to Nagios log file',          default=nagios_log)
    parser.add_argument('-n', '--nip_log', help='Path to NIP log file',             default=plugin_log)
    parser.add_argument('-s', '--server',  help='TENIS server url',                 required=True)
    parser.add_argument('-t', '--token',   help='Access token',                     default=token)
    return parser.parse_args()


def check_file_id(file):
    """
    Get file's st_ino by given path.

    :param file: File path(str)
    :return: file's st_ino
    """
    stats = os.stat(file)
    return stats.st_ino


def load_objects(args, objects):
    """
    Creates a dictionary with services and hosts info, needed to parse fix_instruction url.

    :param args: Script's arguments
    :param objects: Dictionary with services and hosts info to fill
    :return: nothing
    """
    with open(args.obj) as f:
        line = 1
        new_obj = ''
        obj_name = ''
        obj_dick = {}
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


def add_events(args, event, events, objects):
    """
    Append the list of alerts with new items.

    :param args: Script's arguments
    :param event: Dictionary with Alert parameters
    :param events: Lists of updates and resolves to append too
    :param objects: Dictionary with services info, needed to parse fix_instruction url
    :return: nothing
    """

    try:
        notes_url = objects[event['name']]['notes_url']
    except KeyError:
        notes_url = ''

    event_template = {
        'resolve': {
            "project": args.project,
            "host": event['host'],
            "alertName": event['name']
        },

        'update': {
            "project": args.project,
            "host": event['host'],
            "fired": event['fired'],
            "alertName": event['name'],
            "severity": event['severity'],
            "msg": event['message'],
            "responsibleUser": "",
            "comment": "",
            "isScheduled": False,
            "customFields": {
                "fixInstructions": notes_url,
            }
        }
    }

    events.append(event_template[event['type']])


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
            alerts_dick = {event_type: tmp_list}
            try:
                resp = tenis.post(args.server + '/in', json=alerts_dick)
                if args.debug:
                    print(resp.status_code, resp.text, '\n', alerts_dick)
            except Exception as e:
                can_clear_data = False
                logging.critical(f"Error during sending events to TENIS: {str(e)}")
    return can_clear_data


def main():
    """
    Main loop, open connection to TENIS server.
    Check and read files, collect events(alerts and resolves) and send them to Tenis server.
    If files were deleted/recreated function rereads them an continue.
    Start logging.

    :return: nothing
    """

    args = args_parser()
    # Nagios' log data example, we need strings with '.*ALERT.*' pattern:
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
        level=logging.INFO,
        filename=args.nip_log,
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

    while 1:  # Main loop to reopen nagios.log and objects.cache files if they were recreated
        n = 0.001
        timer = 0
        objects = {}
        load_objects(args, objects)
        log_id = check_file_id(args.log)
        obj_id = check_file_id(args.obj)
        dump = {'update': [], 'resolve': []}
        events = {'update': [], 'resolve': []}
        logging.info(f"Start reading file {args.log}")

        with open(args.log) as f:
            f.seek(0, os.SEEK_END)  # Jump to the end of log file
            while 2:  # Continuously read log file
                try:  # To log all possible errors
                    raw_alert = f.readline()
                    if raw_alert != '':  # If string is not empty parse it
                        raw_alert_split = raw_alert.split(';')

                        if re.match(r'^\[[0-9]+].*(SERVICE|HOST)\sALERT:.*', raw_alert_split[0]):
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
                                event['name'] = f"host_name\t{event['host']}"
                            else:  # it's Service alert
                                for i in range(0, len(raw_alert_split)):
                                    parameter_name = service_map[i]
                                    parameter_value = raw_alert_split[i]
                                    if parameter_name == 'fired':
                                        event['fired'] = int(re.sub(r'.*\[(.*)].*', r'\1', parameter_value))
                                        event['host'] = parameter_value.split(' ')[-1]
                                    else:
                                        event[parameter_name] = parameter_value.strip()
                            # Check INFO alerts
                            # If alert name started from '_', change severity to INFO
                            if re.match(r'^_.*', event['name']):
                                event['name'] = re.sub(r'^_', '', event['name'])
                                event['severity'] = 'INFO'
                            # If alert message started from 'INFO:', change severity to INFO
                            if re.match(r'^INFO:.*', event['message']):
                                event['severity'] = 'INFO'

                            if re.match(r'OK|UP', event['severity']):  # it's Resolve
                                event['type'] = 'resolve'

                            add_events(args, event, events[event['type']], objects)

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
                    sleep(check_timeout)

                sleep(n)  # To keep low CPU load
                timer += n
                if timer >= check_timeout:
                    timer = 0
                    try:  # Check that log file is not deleted/recreated
                        if check_file_id(args.log) != log_id:
                            break
                    except FileNotFoundError:
                        while not os.path.exists(args.log):
                            logging.critical(f"Can't find {args.log}")
                            sleep(check_timeout)
                        break

                    try:  # Check that objects file is not deleted/recreated
                        if check_file_id(args.obj) != obj_id:
                            logging.info(f"Rereading {args.obj}")
                            obj_id = check_file_id(args.obj)
                            load_objects(args, objects)
                    except FileNotFoundError:
                        logging.info(f"Can't find {args.obj}")
                        pass  # Objects.cache is not the main file, just pass if it's not ready yet


if __name__ == '__main__':
    main()
