# TENIS

T.E.N.I.S. stands for Team Event Notificaton and Interoperability System!

# Installation
## Easy way (werf)
### Prerequisites
- [werf](werf.io)
- Ready to use k8s cluster with configured kubeconfig
- Registry (for manual deployment you should be logged in if your registry is protected with auth)
- Registry secret (in this app it's called registry-secret, but you can alter it as you wish)
### Procedure
- Prepare the environment
  - Add werf secret key (In repo root)
  ```
  $ werf helm secret generate-secret-key > .werf_secret_key
  ```
  - Add INIT_PASSWORD
  ```
  $ werf helm secret values edit .helm/secret-values.yaml
  ```
- Build and push images
  ```
  $ werf build --repo <registry>/<project>
  ```
- Converge
  ```
  $ werf converge --namespace <your-namespace> --repo <registry>/<project>
  ```
### Notes
For CI/CD purposes, WERF_SECRET_KEY variable should be added to the project variables and made available for use.


## Complicated way (helm)
### Prerequisites
- helm
- Ready to use k8s cluster with configured kubeconfig
- Registry (for manual deployment you should be logged in if your registry is protected with auth)
- Registry secret (in this app it's called registry-secret, but you can alter it as you wish)
### Procedure
- Create Dockerfiles or build Frontend and Backend images in any convinient way
  - You can take `werf.yaml` as a reference, it shows every step of build process
  - Build your images, tag them appropriately and push to your registry
  - Substitute `{{ .Values.werf.images.(frontend|backend) }}` in frontend and backend deployments with your created images
- Add `mongodb.env.INIT_PASSWORD` in `values.yaml`. It should be added like that
```
mongodb:
  env:
    INIT_PASSWORD:
      _default: <your default password here>
      dev: <example of your password for werf.env=dev>
```
To understand more about what kind of password should be used, look [here](#how-to-generate-new-password-for-mongodb-init-user)
- Add `env_url`. You can add it in `values.yaml` or directly with helm install command
- Install chart (example)
```
$ helm -n <k8s-namespace> install <release-name> .helm --set werf.env=dev --set env_url="test.example.com"
```

# Deep dive
## How images are built
We use [werf](werf.io) to build, publish, and deploy everything to k8s.
Images building procedure is defined in `werf.yaml` file.
For example, backend is built like that:
```
configVersion: 1              <======= The only version supported currently
project: tenis                <======= project name, will be used by werf to get {{ .Chart.Name }}
---
image: backend                <======= name of the image. Can be fetched with {{ .Values.werf.images.backend }} in the templates
from: python:alpine3.17
docker:
  CMD: [ "/usr/local/bin/python3", "-m", "tenis_backend" ]
git:
- add: /backend
  to: /app
  excludePaths:
  - LICENSE
  - "**.sh"
  stageDependencies:          <====== Defining rules of when image should be rebuilt. In this case - changes in pyproject.toml and also in any file at all
    install:
    - "**/*"
    - "pyproject.toml"
shell:
  install:
  - cd /app
  - pip install .

```
> Werf can also utilize ready Dockerfiles, but this way gives us more flexibility in the building process.

Once definition is ready, images are build with `werf build`, see `ci-dev.yml`.
## How it's deployed
We use Github Actions as a CI/CD tool.
- Deploy to `dev` is happening on once PR to 'dev' branch is closed or manualy.
    - `ci-dev.yml` workflow is responsible for Automatically depploying any changes to `tenis-dev` namespace.

- Deploy to `dev-2` is happening manualy.
    - `ci-dev-2.yml` workflow is responsible for Automatically depploying any changes to `tenis-dev-2` namespace.

- Deploy to `prod` is happening on merge to master or manually,
    - `ci-prod.yml` workflow deploys the code to ns `tenis-prod`, available on url `tenis.k8s-test.ivinco.com`

Deploy job looks simillar in both cases:
```
  converge:
    needs: render-and-lint
    runs-on: self-hosted
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.ivinco.com
          username: ${{ secrets.REGISTRY_SECRET_USER }}
          password: ${{ secrets.REGISTRY_SECRET_PASSWORD }}

      - name: Install werf
        uses: werf/actions/install@v1.2

      - name: Converge
        uses: werf/actions/converge@v1.2
        with:
          kube-config-base64-data: ${{ secrets.KUBE_CONFIG_BASE64_DATA }}
          env: dev
        env:
          WERF_SET_ENV_URL: "env_url=tenis-dev.k8s-test.ivinco.com"
          WERF_NAMESPACE: tenis-dev
          WERF_RELEASE: tenis-dev

```
> All the secrets like KUBE_CONFIG_BASE64_DATA,REGISTRY_SECRET_USER, REGISTRY_SECRET_PASSWORD are defined in the repo's secrets. You can find them in repo's settings'
## FAQ
### How to create new environment for personal testing
Creating of a new environment is extremely easy. You need to define new job in `ci-dev.yml` (or you can make a copy of `.github/workflows/ci-dev.yml` file and define your own workflow with minor changes).
For most of the cases it will be enough to change several variables in the converge.
Here's the variables list:
```
WERF_SET_ENV_URL: "env_url=tenis-dev.k8s-test.ivinco.com" <===== URL on which your app will be available
WERF_NAMESPACE: tenis-dev                                 <===== k8s namespace
WERF_RELEASE: tenis-dev                                   <===== helm release
steps.converge.with.env: dev                              <===== environment id
```

Once the deploy is complete, you can access your environment by the URL set in `WERF_SET_ENV_URL: "env_url=example.com"`

#### Example of CI changes:
```
  converge-updated:
    needs: render-and-lint
    runs-on: self-hosted
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.ivinco.com
          username: ${{ secrets.REGISTRY_SECRET_USER }}
          password: ${{ secrets.REGISTRY_SECRET_PASSWORD }}

      - name: Install werf
        uses: werf/actions/install@v1.2

      - name: Converge
        uses: werf/actions/converge@v1.2
        with:
          kube-config-base64-data: ${{ secrets.KUBE_CONFIG_BASE64_DATA }}
          env: dev_andrew
        env:
          WERF_SET_ENV_URL: "env_url=tenis-andrew.k8s-test.ivinco.com"
          WERF_NAMESPACE: tenis-andrew
          WERF_RELEASE: tenis-andrew
```
#### Example of how you can use env name to pass custom values to variables
```
values.yaml
mongodb:
  env:
    INIT_DB:
      _default: "tenis"                         <==== If `steps.converge.with.env` has no custom value configured, _default is used
      dev_andrew: "tenis-andrew-or-whatever"    <==== if `steps.converge.with.env` == dev_andrew, this value is used
```
This behaviour is achieved by the following constriction inside the template files:
```
containers:
- name: {{ .Chart.Name }}-backend
  image: {{ $.Values.werf.image.backend }}
  imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
  ports:
    - name: http
      containerPort: 8000
      protocol: TCP
  env:
  - name: MONGO_HOST
    value: {{ .Chart.Name }}-mongodb
  - name: MONGO_DATABASE            <=========== Here
    value: {{ pluck .Values.werf.env .Values.mongodb.env.INIT_DB | first | default .Values.mongodb.env.INIT_DB._default }}
```
Basically, we look for `{{ .Values.werf.env }}` in `{{ .Values.mongodb.env.INIT_DB }}`. Once we find it - we take it's value. If nothing is found, we default to `{{ .Values.mongodb.env.INIT_DB._default }}`


### How to understand what exactly is getting to the cluster
On step `render-and-lint` there's a step called `Render chart`, which contains all all the rendered resources with all the values substituted, except for secret values like passwords.

### How to generate new password for mongodb init user
Password should be hashed with werkzeug.security:
```
$ python
>>> from werkzeug.security import generate_password_hash
>>> print(generate_password_hash("example-password"), "\n")
scrypt:32768:8:1$wlKfg9o3d9jtl0AU$0aebc1e1d841a46b049a53052ac9c53ccd998975ce84b0dd98089029f072b360316a9c0283e0ef26aa313835b29bf5ad4e8c1674737953ffcc0c2647fe912d64

Here's the hasing alghorithm (scrypt:32768:8:1), salt (wlKfg9o3d9jtl0AU) and hashed password are divided by '$', but you need the whole string:
"scrypt:32768:8:1$wlKfg9o3d9jtl0AU$0aebc1e1d841a46b049a53052ac9c53ccd998975ce84b0dd98089029f072b360316a9c0283e0ef26aa313835b29bf5ad4e8c1674737953ffcc0c2647fe912d64"

```
Passwords are stored encrypted in `.helm/secret-values.yaml`. You need to acquire WERF_SECRET_KEY and add it to `.werf_secret_key` file in the root of the repo (it's in .gitignore, so it's safe) or export to variable WERF_SECRET_KEY locally.
```
export WERF_SECRET_KEY=example-string-qwerty
```
To add an additional value or variable:
```
werf helm secret values edit .helm/secret-values.yaml
mongodb:
  env:
    INIT_PASSWORD:
      _default: "scrypt-password-generated-with-werkzeug.security"
      dev_andrew: "scrypt:32768:8:1$wlKfg9o3d9jtl0AU$0aebc1e1d841a46b049a53052ac9c53ccd998975ce84b0dd98089029f072b360316a9c0283e0ef26aa313835b29bf5ad4e8c1674737953ffcc0c2647fe912d64" (env should be the same as `steps.converge.with.env` in CI)
```


### Werf cheatsheet

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

## Misc
- Registry cleanup is defined in `.github/workflows/cleanup.yml`
- CodeQL checks are defined in `.github/workflows/codeql.yml`
