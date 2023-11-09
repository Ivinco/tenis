# Tenis backend server
P.E.N.I.S. stands for Pluggable Event Notificaton and Interoperability System.
This package is the back-end part of the TENIS.

Prerequisites:
- tenis backend needs mongo to run. Currently it tries to connect to MongbDB server running on localhost
with the default port (27017). Auth is not supported ATM.

How to work with the code:
- sh build.sh to build Python package with tenis_backend module
- sh install.sh to install locally built package on the current machine (requires sudo)

Once the package is built and installed:
- make sure Mongo is up and running
- sudo systemctl [re]start tenis-backend.service to start the backend
- sudo systemctl stop tenis-backend.service to stop the backend
