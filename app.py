import flask

app = flask.Flask(__name__)

@app.route('/') 
def index():
    return 'Hello, World!'

@app.route('/map')
def map_page():
    return 'This is the map page.'

if __name__ == '__main__':
    app.run(debug=True)
    