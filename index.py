import tornado.web
import tornado.ioloop

class uploadHandler(tornado.web.RequestHandler):
    def post(self):
        files = self.request.files["fileImage"]
        for f in files:
            fh = open(f"upload/{f.filename}", "wb")
            fh.write(f.body)
            fh.close()
        self.write(f"http://localhost:8888/img/{f.filename}")
    def get(self):
        self.render("index.html")

if (__name__ == "__main__"):
    app = tornado.web.Application([
        ("/", uploadHandler),
        ("/img/(.*)", tornado.web.StaticFileHandler, {'path': 'upload'})
    ])

    app.listen(8888)
    print("Listening on port 8080")
    tornado.ioloop.IOLoop.instance().start()
