#!/usr/bin/env python3
import getopt, sys

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

    if not args:
        print("No file given, see `{__file__} --help for usage")
        sys.exit()
    fname = args[0]

    # Here we should validate input: tenis server URL format, file existence etc
    # Then we should open persistent connection to {server}

    print(f"Using server {server}, filename {fname}")

    # This is the place to start infinite loop to watch {fname} and send alerts to {server}
    return 0


if __name__ == '__main__':
    main()
