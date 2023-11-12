# Tenis backend server
T.E.N.I.S. stands for Team Event Notificaton and Interoperability System.

Prerequisites:
- Tenis backend needs Python 3.6+ to run
- Tenis backend needs Mongo to run, and uses PyMongo for auth
- Tenis backend uses PyJWT for auth, **make sure you don't have jwt module without "Py" prefix installed - this will break everything**

How to work with the code:
- `$ sh build.sh` to build Python package with tenis_backend module
- `$ sh install.sh` to install locally built package on the current machine (requires sudo)

Once the package is built and installed:
- make sure MongoDB is up and running. By default, backend expects mongod to listen on `localhost` (default Mongo port `27017`), uses database `tenis` without authorization (this can be configured via `MONGO_HOST` and `MONGO_DBNAME` environment variables)
- you will have to perform basic Mongo initialization: create database called `tenis` and create `Admin` user with password hash that matches `123qwe`:
```
use tenis
db.createCollection("users", { capped: true, size: 5242880, max: 5000 })
db.users.insertOne({
  name: 'Admin',
  email: 'sys@ivinco.com',
  password: 'pbkdf2:sha256:260000$IRLzDvGK1yPx6f1R$f9caf10a1c5d0931c3962fc19316c68f37377804a24b70d6b7a857303394d5d7',
  active: true
})
```
- finally, [re]start backend service:
```
$ sudo systemctl restart tenis-backend.service
```

Tenis backend listens on port `8000` (can be overridden by `LISTEN_PORT` environment variable).
Once everything is configured, you should be able to perform basic health check:
```
$ curl http://localhost:8000/healz
tenis is big as ever
```

You can also get auth token:
```
$ curl -X POST -d '{"email":"sys@ivinco.com", "password":"123qwe"}' http://localhost:8000/auth
{"data":{"_id":"654e2a42c5cb8d6d223560d0","active":true,"email":"sys@ivinco.com","name":"Admin","token":"eyJ0eXAiO-rVit4ygaEA8rg8FyOGc"},"message":"Successfully fetched auth token"}
```

And finally, access endpoint that requires authorization:
```
$ curl -H 'Authorization: Bearer eyJ0eXAiO-rVit4ygaEA8rg8FyOGc' http://localhost:8000/whoami
You are authorized as sys@ivinco.com
```
Currently it's the only backend functionality available. More to come soon.
