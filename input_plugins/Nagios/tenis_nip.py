#!/usr/bin/env python3
# Nagios Input Plugin for TENIS

import os
import re
import json
import logging
import requests
from time import sleep
from argparse import ArgumentParser

check_timeout = 60  # Main files check timeout in sec, if files where deleted or recreated we have to reopen them
parser = ArgumentParser()
parser.add_argument('-o', '--obj',     help='Path to Nagios object.cache file', default='/var/log/nagios/objects.cache')
parser.add_argument('-l', '--log',     help='Path to Nagios log file',          default='/var/log/nagios/nagios.log')
parser.add_argument('-n', '--nip_log', help='Path to NIP log file',             default='/var/log/nip.log')
parser.add_argument('-d', '--debug',   help='Print some debug data',            action='store_true')
parser.add_argument('-p', '--project', help='Project within TENIS',             default='main')
parser.add_argument('-s', '--server',  help='TENIS server url',                 required=True)
parser.add_argument('-t', '--token',   help='Access token', )
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
            if re.match(r'.*}.*', line):
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


def add_alerts(alert, alerts, objects):
    """
    Append the list of alerts with new items.

    :param alert: Dictionary with Alert parameters
    :param alerts: Global List of alerts(dictionaries) to append new alert too
    :param objects: Dictionary with services info, needed to parse fix_instruction url
    :return: nothing
    """

    try:
        notes_url = objects[alert['name']]['notes_url']
    except KeyError:
        notes_url = ''

    alerts.append(
        {
            "project": args.project,
            "host": alert['host'],
            "fired": alert['fired'],
            "alertName": alert['name'],
            "severity": alert['severity'],
            "msg": alert['message'],
            "responsibleUser": "",
            "comment": "",
            "isScheduled": False,
            "customFields": {
                "fixInstructions": notes_url,
            }
        }
    )


def send_alerts(alerts, tenis):
    """
    Send alerts.json to TENIS server.

    :param alerts: Global List of alerts(dictionaries)
    :param tenis: Persistent connection to Tenis server
    :return: nothing
    """
    alerts_dick = {"alerts": alerts}
    alerts_json = json.dumps(alerts_dick)
    tenis.post(args.server, json=alerts_json)
    if args.debug:
        print(alerts_json)


def main():
    """
    Main loop, open connection to TENIS server.
    Check and read files, collect alerts and send them to Tenis server.
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

    try:  # Open persistent connection to Tenis server
        tenis = requests.Session()
        if args.token:
            tenis.headers.update({'X-Tenis-Token': args.token})
        test = tenis.get(args.server + '/healz')
        if not test.ok:
            raise Exception("Tenis server connnection failed")
    except Exception as e:
        tenis = ''
        logging.critical(f"Error connection to Tenis server: {str(e)}")

    while 1:  # Main loop to reopen nagios.log and objects.cache files if they were recreated
        n = 0.001
        timer = 0
        alerts = []
        objects = {}
        load_objects(objects)
        log_id = check_file_id(args.log)
        obj_id = check_file_id(args.obj)
        logging.info(f"Start reading file {args.log}")
        with open(args.log) as f:
            f.seek(0, os.SEEK_END)  # Jump to the end of log file

            while 2:  # Continuously read log file
                line = f.readline()
                # Log data example:
                # N of index in lst:       0            1        2      3   4       5
                # [1705421869] SERVICE ALERT: host;Alert name;CRITICAL;SOFT;1;Alert message
                # N of index in lst:       0                     1      2   3       4
                # [1705421869]    HOST ALERT: host;               DOWN;SOFT;1;Alert message
                # Note that Host alerts don't have name, therefore list indexes are differs a bit
                if line != '':
                    lst = line.split(';')
                    if re.match(r'.*SERVICE ALERT:.*', lst[0]) and lst[2] != 'OK':
                        fired = re.sub(r'.*\[(.*)\].*', r'\1', lst[0])
                        host = lst[0].split(' ')[-1]
                        severity = lst[2]
                        message = lst[5]
                        name = lst[1]
                    if re.match(r'.*HOST ALERT:.*', lst[0]) and lst[1] != 'UP':
                        fired = re.sub(r'.*\[(.*)\].*', r'\1', lst[0])
                        host = lst[0].split(' ')[-1]
                        severity = lst[1]
                        message = lst[4]
                        name = f"host_name\t{host}"
                    alert = {'fired': fired, 'host': host, 'name': name, 'severity': severity, 'message': message}
                    add_alerts(alert, alerts, objects)
                else:
                    if alerts:
                        send_alerts(alerts, tenis)
                        alerts = []

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


if __name__ == '__main__':
    main()
