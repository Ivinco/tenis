#!/usr/bin/env python3
# Nagios Input Plugin for TENIS

import os
import re
# import json
import logging
import requests
from time import sleep
from argparse import ArgumentParser

access_token = ''   # TENIS Access token, it's more secure to write it here instead of adding through args
check_timeout = 60  # Main files check timeout in sec, if files where deleted or recreated we have to reopen them

# -------------------------------------------------------------------------------------------------------------------- #
parser = ArgumentParser()
parser.add_argument('-o', '--obj',     help='Path to Nagios object.cache file', default='/var/log/nagios/objects.cache')
parser.add_argument('-l', '--log',     help='Path to Nagios log file',          default='/var/log/nagios/nagios.log')
parser.add_argument('-n', '--nip_log', help='Path to NIP log file',             default='/var/log/nip.log')
parser.add_argument('-t', '--token',   help='Access token',                     default=access_token)
parser.add_argument('-d', '--debug',   help='Print some debug data',            action='store_true')
parser.add_argument('-p', '--project', help='Project within TENIS',             default='main')
parser.add_argument('-s', '--server',  help='TENIS server url',                 required=True)
args = parser.parse_args()


def check_file_id(file):
    """
    Get file's st_ino by given path.

    :param file: File path(str)
    :return: file's st_ino
    """
    stats = os.stat(file)
    return stats.st_ino


def load_objects(objects):
    """
    Creates a dictionary with services and hosts info, needed to parse fix_instruction url.

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


def add_events(event, events, objects):
    """
    Append the list of alerts with new items.

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


def send_events(events, tenis):
    """
    Send alerts.json to TENIS server.

    :param events: Global List of alerts and resolves
    :param tenis: Persistent connection to Tenis server
    :return: nothing
    """
    for event_type in ['update', 'resolve']:
        if events[event_type]:
            alerts_dick = {event_type: events[event_type]}
            # alerts_json = json.dumps(alerts_dick)
            # res = tenis.post(args.server + '/in', json=alerts_json) # We should use json but dick is used O_o
            res = tenis.post(args.server + '/in', json=alerts_dick)
            if args.debug:
                # print(res.status_code, res.text, '\n', alerts_json)
                print(res.status_code, res.text, '\n', alerts_dick)


def main():
    """
    Main loop, open connection to TENIS server.
    Check and read files, collect events(alerts and resolves) and send them to Tenis server.
    If files were deleted/recreated function rereads them an continue.
    Start logging.

    :return: nothing
    """

    # Start logging
    logging.basicConfig(
        filemode="w",
        level=logging.INFO,
        filename=args.nip_log,
        format="%(asctime)s %(levelname)s %(message)s"
    )

    tenis = requests.Session()  # Open persistent connection to Tenis server
    try:
        if args.token:
            tenis.headers.update({'X-Tenis-Token': args.token})
        test = tenis.get(args.server + '/healz')
        if test.ok:
            logging.info(f"Connection to {args.server} established")
    except Exception as e:
        logging.critical(f"Error connection to TENIS server: {str(e)}")

    while 1:  # Main loop to reopen nagios.log and objects.cache files if they were recreated
        n = 0.001
        timer = 0
        objects = {}
        load_objects(objects)
        log_id = check_file_id(args.log)
        obj_id = check_file_id(args.obj)
        events = {'update': [], 'resolve': []}
        logging.info(f"Start reading file {args.log}")
        try:  # To log all possible errors
            with open(args.log) as f:
                f.seek(0, os.SEEK_END)  # Jump to the end of log file

                while 2:  # Continuously read log file
                    line = f.readline()
                    # Nagios' log data example, we need strings with '.*ALERT.*' pattern:
                    # N of index in lst:       0            1        2      3   4       5
                    # [1705421869] SERVICE ALERT: host;Alert name;CRITICAL;SOFT;1;Alert message

                    # N of index in lst:    0         1    2  3       4
                    # [1705421869] HOST ALERT: host;DOWN;SOFT;1;Alert message
                    # Note that Host alerts don't have name, therefore list indexes are differs a bit

                    if line != '':
                        event_type = ''
                        lst = line.split(';')
                        if re.match(r'.*ALERT:.*', lst[0]):
                            fired = re.sub(r'.*\[(.*)\].*', r'\1', lst[0])
                            host = lst[0].split(' ')[-1]
                            event_type = 'update'
                            if re.match(r'.*HOST.*', lst[0]):  # than it's Host alert
                                name = f"host_name\t{host}"
                                severity = lst[1]
                                message = ''
                                if lst[4]:
                                    message = lst[4]
                            else:                              # it's service alert
                                name = lst[1]
                                severity = lst[2]
                                message = ''
                                if lst[5]:
                                    message = lst[5]
                            if re.match(r'OK|UP', severity):   # I't a resolve
                                event_type = 'resolve'

                        if event_type:
                            event = {
                                'type': event_type,
                                'fired': int(fired),
                                'host': host.strip(),
                                'name': name.strip(),
                                'message': message.strip(),
                                'severity': severity.strip()
                            }
                            add_events(event, events[event_type], objects)
                    else:
                        if events['update'] or events['resolve']:
                            send_events(events, tenis)
                            events = {'update': [], 'resolve': []}

                    sleep(n)  # To keep low CPU load
                    timer += n
                    if timer >= check_timeout:
                        timer = 0
                        try:  # Check that log file is not deleted/recreated
                            if check_file_id(args.log) != log_id:
                                break
                        except FileNotFoundError:
                            while not os.path.exists(args.log):
                                logging.warning(f"Can't find {args.log}")
                                sleep(check_timeout)
                            break

                        try:  # Check that objects file is not deleted/recreated
                            if check_file_id(args.obj) != obj_id:
                                logging.info(f"Rereading {args.obj}")
                                obj_id = check_file_id(args.obj)
                                load_objects(objects)
                        except FileNotFoundError:
                            logging.info(f"Can't find {args.obj}")
                            pass  # Objects.cache is not the main file, just pass if it's not ready yet

        except Exception as e:  # Logg all errors
            logging.critical(f"Some error occurred: {str(e)}")
            sleep(check_timeout)


if __name__ == '__main__':
    main()
