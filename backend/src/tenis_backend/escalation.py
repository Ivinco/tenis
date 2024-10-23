import json
import base64
import requests
from time import sleep
from .alert import lookup_alert_by_id, is_resolved
from werkzeug.exceptions import InternalServerError


def twilio_call(twilio_url, method, cmd='', opt=None):
    """
    Function to make Twilio call

    :param twilio_url: Twilio url with creds, type str
    :param method: Call method: post, get, type str
    :param cmd: URL command, type str [optional]
    :param opt: URL arguments, type dictionary [optional]
    :return: Json(dictionary) with Twilio answer
    """
    method = method.lower()
    twilio = requests.Session()
    if opt is None:
        opt = {}
    if method == 'get':
        method = twilio.get
    if method == 'post':
        method = twilio.post

    try:
        resp = method(twilio_url + cmd, params=opt)
    except Exception as e:
        raise InternalServerError("Failed to call Twilio: %s" % e)

    data = {}
    if resp.ok:
        data = resp.json()
    else:
        print(f'Failed to establish connection to TWILIO server: {resp.text}')
    return data


def start_twilio_carousel(twilio_url, test_phone=None, alerts=None, alert_id=None, wait_till_next_round=60):
    """
    Function to start calling admins via Twilio

    :param twilio_url: Twilio url with creds, type str
    :param test_phone: Test phone for debug calls [optional], call statuses will be printed if set
    :param alerts: Global list of alerts to check alert status
    :param alert_id: Emergency alert id
    :param wait_till_next_round: Time in seconds to wait after call till start another round of carousel
    :return: True if emergency alert acked, silenced or fixed or carousel did 3 rounds False if not
    """
    if alerts is None:
        alerts = []

    call_round = 1
    hero_number = 0

    while True:
        alert = lookup_alert_by_id(alerts, alert_id)
        # check alert status, stop carousel if alert acked, silenced or fixed or in case carousel did 3 rounds
        if not alert or alert['responsibleUser'] or alert['silenced'] or is_resolved(alert) or call_round > 3:
            return True

        if hero_number > 8:
            hero_number = 0
            call_round += 1

        admin_data = twilio_call(twilio_url, 'get', '/getresponsibleadmin', {'number': hero_number})
        # response example:
        # {
        #     "name": "ivan",
        #     "nagios_name": "ivan",
        #     "phone": "**********",
        #     "reason": "online"
        # }
        if test_phone:
            admin_data['phone'] = test_phone  # for debug purposes
            print(json.dumps(admin_data, indent=2))
        if 'phone' not in admin_data.keys():
            hero_number += 1
            sleep(5)
            continue

        admin_url_name = admin_data['name'].replace(" ", "+")
        xml_template = f'''<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="alice" language="en-US">
                    Hi, {admin_data['name']}. We've got an {alert['alertName']}!
                </Say>
                <Gather numDigits="1" timeout="2" action="{twilio_url}/twilio.php?type=digit&amp;emergencyId={alert_id}&amp;name={admin_url_name}">
                    <Say voice="alice" language="en-US">Press 3 to accept the responsibility. Drop the call if you are not ready.</Say>
                    <Play>{twilio_url}/blueoyster.mp3</Play>
                </Gather>
            </Response>
        '''

        xml_json = json.dumps(xml_template)
        xml_base = base64.b64encode(xml_json.encode('utf-8'))
        message = xml_base.decode('utf-8')
        if test_phone:
            print(message)

        call_opts = {"user": admin_data['name'], "phone": admin_data['phone'], "message": message}
        call_check = twilio_call(twilio_url, 'post', '/makealertcall', call_opts)
        # response example:
        # {
        #     "admin": "ivan",
        #     "status": "Ok",
        #     "url": "https://AC0f33bb6794...923d1044687d2700.json" <-- url to check call details
        # }

        if test_phone:
            print(json.dumps(call_check, indent=2))
        if 'status' not in call_check.keys() or call_check['status'].lower() != 'ok':
            hero_number += 1
            sleep(5)
            continue

        # check if call ended
        call_status = ''
        n = 0
        while call_status != 'completed':
            sleep(5)
            n += 1
            call_details = twilio_call(call_check['url'], 'get')
            # response example:
            # call duration ~ 15-20 sec
            # {
            #     "date_updated": "Tue, 08 Oct 2024 06:05:24 +0000",
            #     "price_unit": "USD",
            #     "parent_call_sid": null,
            #     "caller_name": "",
            #     "duration": "0",
            #     "from": "***********",
            #     "to": "***********",
            #     "annotation": null,
            #     "answered_by": null,
            #     "sid": "CA3...67dc",
            #     "queue_time": "0",
            #     "price": null,
            #     "api_version": "2010-04-01",
            #     "status": "ringing",             <-- Call status to check
            #     "direction": "outbound-api",
            #     "start_time": "Tue, 08 Oct 2024 06:05:21 +0000",
            #     "date_created": "Tue, 08 Oct 2024 06:05:21 +0000",
            #     "from_formatted": "***********",
            #     "group_sid": null,
            #     "trunk_sid": "",
            #     "forwarded_from": null,
            #     "uri": "/2010-04-01/Account...214b067dc.json",
            #     "account_sid": "AC0f3...1e97",
            #     "end_time": null,
            #     "to_formatted": "***********",
            #     "phone_number_sid": "PN8...4741",
            #     "subresource_uris": {
            #         "notifications": "/2010-04-01/Accounts/...67dc/Notifications.json",
            #         "user_defined_messages": "/2010-04-01/Accounts/...b067dc/UserDefinedMessages.json",
            #         "transcriptions": "/2010-04-01/Accounts/...067dc/Transcriptions.json",
            #         "recordings": "/2010-04-01/Accounts/...214b067dc/Recordings.json",
            #         "streams": "/2010-04-01/Accounts/...0214b067dc/Streams.json",
            #         "payments": "/2010-04-01/Accounts...0214b067dc/Payments.json",
            #         "user_defined_message_subscriptions": "/2010-04-01/Accounts/...dMessageSubscriptions.json",
            #         "siprec": "/2010-04-01/Accounts/...067dc/Siprec.json",
            #         "events": "/2010-04-01/Account/...67dc/Events.json"
            #     }
            # }
            call_status = str(call_details['status'])
            if test_phone:
                print(json.dumps(call_details, indent=2))

            fin_url = call_check['url'].replace('.json', '/Events.json')
            fin_check = twilio_call(fin_url, 'get')
            if test_phone:
                print(fin_check['end'])
            if fin_check['end'] == 3:
                ack_name = admin_data['name'].replace(' ', '_')
                alert['responsibleUser'] = f'{ack_name}_twilio'
                return True

            if n > 7:
                break

        # continue carousel
        hero_number += 1
        sleep(wait_till_next_round)
