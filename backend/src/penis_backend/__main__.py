from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello, world!\n", 200

@app.route("/healz")
def healz():
    return "penis backend is ok\n", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
