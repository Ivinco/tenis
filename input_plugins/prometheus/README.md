# TENIS PROMETHEUS INPUT PLUGIN

### General Description

This is the application written on Go to receive alerts from Prometheus, 
processes it and converts to Tenis format. 

### How to use it

This plugin gets options from config file in yaml format. Path to the config file 
should be provided either as command flag or as system environment variable. 
Command flag takes precedence over environment variable. Config file has the next blocks:

- **env**: defines working environment. Can be *local*, *dev* or *prod*.
- **plugin_id**: defines a unique id og current instance of the plugin 
- **server**: defines parameters for Tenis backend server
  - **address**: URL address of Tenis backend server
  - **token**: Token for authentication on Tenis backend server
- **httpServer**: defines settings for plugin as a server
  - **address**: listening address and port
  - **timeout**: request and response timeout
  - **idleTimeout**: idle timeout for session
  - **resendInterval**: interval to send alerts from temp file
  - **filePath**: the path to the temp file where plugin saves unsent resolved alerts
  - **user**: username of a client to be authenticated on plugin
  - **password**: password of a client to be authenticated on plugin
  - **project**: the project which is monitored

Here is a sample of config file:

```yaml
env: "local"
plugin_id: "tenis_pip"
server:
  address: "https://tenis-backend.local.com"
  token: "tenis.backend.token"
httpServer:
  address: "localhost:8080"
  timeout: 4s
  idleTimeout: 60s
  resendInterval: 1m
  filePath: "/tmp/alerts.tmp"
  user: "user"
  password: "password"
  project: "Tenis"
```
Keep in mind, that configs contain some sensitive data, like token to communicate with Tenis backend server and basic
auth credentials which prometheus should use to send alerts to plugin. In prod environment you would prefer to omit 
them in config file and set them by command flags or environment variables. Command flags take precedence over
environment variables.

#### Using with Prometheus

Tenis Prometheus Plugin is seen as Alert Manager by Prometheus. So, to make Prometheus send alerts to plugin you should
set it in **alertmanagers** section of prometheus.yaml file. Here is the example of prometheus config to use Tenis Prometheus Plugin:

```yaml
alerting:
  alertmanagers:
  - basic_auth:
      username: prometheus
      password: 123password
    static_configs:
    - targets:
      - tenis_pip_plugin_host:8080
```

For proper displaying of alerts in Tenis UI your alerts definitions in prometheus rules.yml file should contain severity
label and descriptions annotation. If you want to have the link to some fix instructions related to alert, you should 
also put it in alert labels. Here is the simple example of alert definition in prometheus rules.yml file:

```yaml
- alert: NodeDown
  expr: node_down == 0
  for: 5m
  labels:
    severity: CRITICAL
    instance: "{{.Labels.instance}}"
    fixInstructions: "https://wiki.project.local/how_to_fix"
  annotations:
    descriptions: "Metrics exporter on {{.Labels.instance}} is unavailable"
```

#### Using with VictoriaMetrics

Prometheus Input Plugin can be used with VictoriaMetrics infrastructure without Prometheus as well. No any changes are
needed on the plugin side. The things you need to do to use the plugin with VictoriaMetrics are to define it as `notifier`
in vmalert.

Here is the example of vmalert run command
```shell
/path/to/vmalert \
-rule=/etc/vmalert/config.yml \
-datasource.url=https://$VICTORIAMETRICS_SERVER:8428 \
-remoteWrite.url=https://$VICTORIAMETRICS_SERVER:8428
-notifier.url=http://$TENIS_INPUT_PLUGIN_URL:$TENIS_INPUT_PLUGIN_PORT \
-notifier.basicAuth.username=$TENIS_INPUT_PLUGIN_USER \
-notifier.basicAuth.password=$TENIS_INPUT_PLUGIN_PASSWORD
```


In case backend server is unavailable for some reason, Input Plugin will save resolved alerts to temp file,
and will try to send them again according to time interval which is set in `httpServer.resendInterval`. After 
alerts from `.tmp` file successfully sent, the file will be removed.

### How to run

To run this plugin you should build main.go file as binary accordingly to your OS and architecture:

```shell
GOARCH=amd64 GOOS=linux go build -o tenis-pip
```

Run this binary with the path to config file as argument and, if you need, with some other command line arguments:

```shell
./tenis-plugin --config=./tenis.yml
```
or
```shell
./tenis-plugin --config=./tenis.yml --token="my_secret_token" 
```

You may run it as a binary but more preferable way is to make a systemd service and use environment variables to
set sensitive parameters. Here is the example of `.service` file:

```shell
[Unit]
Description=Prometheus Input Plugin for TENIS
After=multi-user.target

[Service]
Type=simple
Restart=always
ExecStart=/usr/local/bin/tenis-pip --config /etc/tenis-pip.yaml
WantedBy=multi-user.target
```

Plugin write its logs to STDOUT, so you may find them in `messages` or in container logs.


