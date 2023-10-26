# Penis backend server
P.E.N.I.S. stands for Pluggable Event Notificaton and Interoperability System.
This package is the back-end part of the PENIS.


How to work with the code:
- sh build.sh to build Python package with penis_backend module
- sh install.sh to install locally built package on the current machine (requires sudo)

Once the package is built and installed:
- sudo systemctl [re]start penis-backend.service to start the backend
- sudo systemctl stop penis-backend.service to stop the backend
