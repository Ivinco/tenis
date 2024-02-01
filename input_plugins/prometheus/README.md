# TENIS PROMETHEUS INPUT FILE

### General Description

This is the application written on Go to receive alerts from Prometheus, 
processes it and converts to Tenis format. 

### How to use it

This plugin gets options from config file in yaml format. Path to the config file 
should be provided either as command flag or as system environment variable. 
Command flag takes precedence over environment variable. Config file has the next blocks:

- **env**: defines working environment. Can be *local*, *dev* or *prod*.
- **server**: defines parameters for Tenis backend server
  - **address**: URL address of Tenis backend server
  - **token**: Token for authentication on Tenis backend server
- **httpServer**: defines settings for plugin as a server
  - **address**: listening address and port
  - **timeout**: request and response timeout
  - **idleTimeout**: idle timeout for session
  - **filePath**: the path where plugin saves input alerts
  - **user**: username of a client to be authenticated on plugin
  - **password**: password of a client to be authenticated on plugin

Here is a sample of config file:

```yaml
env: "local"
server:
  address: "https://tenis-backend.local.com"
  token: "tenis.backend.token"
httpServer:
  address: "localhost:8080"
  timeout: 4s
  idleTimeout: 60s
  filePath: "/tmp/alerts.txt"
  user: "user"
  password: "password"
```
Keep in mind, that configs contain some sensitive data, like token to communicate with Tenis backend server and basic
auth credentials which prometheus should use to send alerts to plugin. In prod environment you would prefer to omit 
them in config file and set them by command flags or environment variables. Command flags take precedence over
environment variables.

