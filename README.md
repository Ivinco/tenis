# TENIS

T.E.N.I.S. stands for Team Event Notificaton and Interoperability System!

## Deploy
### How images are built
We use [werf](werf.io) to build, publish, and deploy everything to k8s.

werf cheatsheet

```
To build images manualy:
$ werf build --repo registry.example.ru/tenis
```
```
To render a chart:
$ werf render --repo registry.example.ru/tenis
```
Note, render won't work without repo address since it's calculating resulting image name based on files in git

```
To lint a chart:
$ werf helm lint .helm
```

```
To deploy:
$ werf converge --repo registry.example.ru/tenis
```

### How it's deployed
We use Github Actions as a CI/CD tool.
Deploy happening automatically on PR to master creation and on every push.
Besides, deploy can be also triggered manually in "Actions" tab.
