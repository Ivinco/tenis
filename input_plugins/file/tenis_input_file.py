#!/usr/bin/env python3
import getopt, sys, json, jsonschema, requests
from time import sleep

# JSON schema to validate input file against
schema = {
    "definitions": {
        "custom_field_definition": {
            "type": "object",
            "additionalProperties": {
                "type": "string"
            },
        }
        "alert_definition": {
            "properties": {
                "project": { "type": "string", "maxLength": 255 },
                "host": { "type": "string", "maxLength": 255 },
                "fired": { "type": "integer" },
                "alertName": { "type": "string", "maxLength": 1024 },
                "severity": { "type": "string", "maxLength": 255 },
                "msg": { "type": "string", "maxLength": 65536 },
                "responsibleUser": { "type": "string", "maxLength": 1024 },
                "comment": { "type": "string" , "maxLength": 65536},
                "silenced": { "type": "boolean" },
                "customFields": { "type": "object", "$ref": "#/definitions/custom_field_definition" }
            },
            "anyOf": [
                {"required": [ "project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced" ]},
                {"required": [ "project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced", "customFields" ]}
            ],
            "additionalProperties": False
        }
    },

    "type": "object",
    "required": [ "alerts" ],
    "properties": {
        "alerts": {
            "type": "array",
            "maxItems": 10000,
            "items": { "$ref": "#/definitions/alert_definition" }
        }
    },
    "additionalProperties": False
}

def usage():
    print(f"""
{__file__}: Tenis file input plugin

This plugin just takes a list of alerts in a certain format and sends them to Tenis server.

If file is modified, the corresponding update is sent to the server.

Usage:

    {__file__} -s <Tenis server URL> -t <API token to use> <file>
    {__file__} --server=<Tenis server URL> --token=<API token to use> <file>

Tenis server URL should be a path to Tenis API, e.g. http://localhost:8080/ or https://tenis.compani.com/api
Token is Tenis API access token.

You may also pass `-S' or `--skip-ssl-validation' to disable SSL cert validity checking.

""")

def main():
    try:
        opts, args = getopt.getopt(sys.argv[1:], 'hs:p:t:S', ['help', 'server=', 'token=', 'skip-ssl-validation'])
    except getopt.GetoptError as e:
        print(e)
        print("See `{__file__} --help' for usage")
        sys.exit(2)

    server = None
    token = None
    ssl_validation = True

    for opt, arg in opts:
        if opt in('-s', '--server'):
            server = arg
        elif opt in('-t', '--token'):
            token = arg
        elif opt in('-S', '--skip-ssl-validation'):
            ssl_validation = False
        elif opt in ('-h', '--help'):
            usage()
            sys.exit()
        else:
            print(f"{opt}: unknown option")
            sys.exit()

    # Validate input: tenis server URL format, file existence etc
    if not args:
        print(f"No file given, see `{__file__} --help for usage")
        sys.exit(1)
    fname = args[0]
    
    if not server:
        print(f"No server given, see `{__file__} --help for usage")
        sys.exit(1)
    server = server.rstrip('/')
    url = server + '/in'

    if not token:
        print(f"No token given, see `{__file__} --help for usage")
        sys.exit(1)

    print(f"Using server {server}, filename {fname}")


    # Open persistent connection to Tenis server
    try:
        s = requests.Session()
        s.headers.update({'X-Tenis-Token': token})
        test = s.get(server + '/healz')
        if not test.ok:
            raise Exception("Tenis server connnection failed")
        print(f"Tenis server connection OK, now watching {fname}")

        # Start infinite loop to watch {fname} and send alerts to {server}
        new_alerts = []
        old_alerts = []
        while(1):
            try:
                with open(fname) as fp:
                    data  = json.load(fp)
                    jsonschema.validate(instance=data, schema=schema)
                    old_alerts = new_alerts
                    new_alerts = data['alerts']
   
                    new = [ a for a in new_alerts if a not in old_alerts ]
                    resolved = []
                    for a in old_alerts:
                        if a not in new_alerts:
                            resolved.append({"project": a["project"], "host": a["host"], "alertName": a["alertName"]})

                    if len(new) > 0:
                        data = { "update": new }
                        print("Got %d new alerts" % len(new))
                        res = s.post(url, json=data)
                        print("Sent the alerts to %s, got %d code, response: %s" % (url, res.status_code, res.text))
    
                    if len(resolved) > 0:
                        data = { "resolve": resolved }
                        print("Found %d resolved alerts" % len(resolved))
                        res = s.post(url, json=data)
                        print("Sent the resolved list to %s, got %d code, response: %s" % (url, res.status_code, res.text))

            except jsonschema.exceptions.ValidationError as e:
                print("JSON schema validation failed: %s" % (e.message))
            except Exception as e:
                print("Error reading %s: %s" % (fname, str(e)))
            sleep(1)
    except Exception as e:
        print("Error connection to Tenis server: %s" % (str(e)))

    return 0


if __name__ == '__main__':
    main()
