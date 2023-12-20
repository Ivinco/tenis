# Tenis Alert Generator

### General Description
This is a simple app written on Go to generate alert items for Tenis project.
The result of its work is a json object with the single class - alerts.
This class is an array of alert objects, made by sample.

### How it is done
This app consists of several packages.

##### alertcreator
The core package is alertcreator.
It defines the structures for alert object and for main object which contains
the array of alerts.

The main function of the package takes parameters from command line as configs
argument and made three loops. In the first loop it generates alerts with uniq
hostnames and alert names. The project and severity level are defined randomly
from the list. If you need another names here, please, set them manually. In
the second loop it generates the number of alert groups with the same hostname.
Number of groups and alerts in every group are taken from parameters. In the third
loop it generates the number of alert groups with the same alert name. Number of
groups and alerts in every group are taken from parameters as well.

If arguments have incorrect values, it will return the error.


##### configs
The configs package parses command line arguments and defines default values for them.

##### filewriter
Filewriter package creates the structure of file writer. It contains standard
os.file type and path to store the data. This package creates a constructor for
new instance of Filewriter and defines Write method, which serializes alerts to json
and write them to the file. Avery run of the app will rewrite the result file.

##### main
Main function runs `configs.GetRunParams()` to get command line parameters and
generates alerts according to them. If `-f` flag is defined it creates a file writer
and writes alerts to `.json` file. If the flag is omitted, if serializes alerts to json format
and print to stdout.

### How to use it
Before using the app you should build it within the environment where it will
be run.

```shell
$ GOARCH=amd64 GOOS=linux go build -o alert_generator
```

After the app is build you may inspect its usage methods

```shell
$ ./alert_generator -h
Usage of ./alert_generator:
-a int
Number of ungrouped alerts (default 10)
-ag int
Number of alert name groups
-f string
Path to file
-g int
number of alerts in group (default 4)
-hg int
Number of hostname groups
```

run you app with necessary options

```shell
$ ./alert_generator -a 45 -ag 4 -hg 12 -g 9 -f /tmp/tenis-alerts.json
Starting to generate 45 alerts, 12 hostname groups and 4 alert name groups
Successfully generated 189 alerts
Successfully saved alerts to /tmp/tenis-alerts.json
```

If you omit `-f` option, alerts will be printed in stdout

```shell
$ ./alert_generator -a 3
Starting to generate 3 alerts, 0 hostname groups and 0 alert name groups
Successfully generated 3 alerts
Generated alerts: 
{
        "alerts": [
                {
                        "project": "Ivinco",
                        "host": "Worker-1",
                        "fired": 1702413743,
                        "alertName": "Random alert-1 on Worker-1",
                        "severity": "WARNING",
                        "msg": "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
                        "responsibleUser": "",
                        "comment": "",
                        "isScheduled": false,
                        "customFields": {
                                "Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
                                "Grafana Link": "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1\u0026refresh=30s",
                                "Labels": "Label1, Label2, Label3"
                        }
                },
                {
                        "project": "Ivinco",
                        "host": "Worker-2",
                        "fired": 1702413743,
                        "alertName": "Random alert-2 on Worker-2",
                        "severity": "INFO",
                        "msg": "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
                        "responsibleUser": "",
                        "comment": "",
                        "isScheduled": false,
                        "customFields": {
                                "Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
                                "Grafana Link": "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1\u0026refresh=30s",
                                "Labels": "Label1, Label2, Label3"
                        }
                },
                {
                        "project": "Ivinco",
                        "host": "Worker-3",
                        "fired": 1702413743,
                        "alertName": "Random alert-3 on Worker-3",
                        "severity": "EMERGENCY",
                        "msg": "kubelet on crawl-farm-vm-worker02.sgdctroy.net(192.168.5.102) got more than 100 errors per 5min",
                        "responsibleUser": "",
                        "comment": "",
                        "isScheduled": false,
                        "customFields": {
                                "Fix Instructions": "https://wiki.ivinco.com/prj/intranet#mnu",
                                "Grafana Link": "https://grafana.sgdctroy.net/d/vYIh9K9Mzss/redis?orgId=1\u0026refresh=30s",
                                "Labels": "Label1, Label2, Label3"
                        }
                }
        ]
}
```


