
#Package import
from flask import Flask, render_template, send_file, make_response, url_for, Response, redirect, request 
 
#initialise app
app = Flask(__name__)

#decorator for homepage 
@app.route('/' )
def index():
    return render_template('index.html',
                           PageTitle = "Landing page")

 if __name__ == '__main__':
    app.run(debug = True)
