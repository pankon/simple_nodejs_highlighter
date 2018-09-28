const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const url = require('url');
const fs = require('fs');
const {HtmlStream} = require("./htmlstream");

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    const server = http.createServer();

    server.on('request', function(req, res) {
        const q = url.parse(req.url, true);
        const filename = "./" + q.pathname;
        const htmlstream_handle = new HtmlStream();
        
        htmlstream_handle.add_sep_char(".");
        htmlstream_handle.add_sep_char("(");
        htmlstream_handle.add_sep_char(")");
        htmlstream_handle.add_sep_char(",");
        htmlstream_handle.add_sep_char("=");
        htmlstream_handle.add_sep_char(";");
        htmlstream_handle.add_sep_char("\"");
        htmlstream_handle.add_sep_char("\'");
        htmlstream_handle.add_sep_char("{");
        htmlstream_handle.add_sep_char("}");

        const blue_items = ["const", "for", "while", "let", "var", "else", "if", "in"];

        for (let i = 0; i < blue_items.length; ++i)
        {
            htmlstream_handle.add_highlight(blue_items[i], "color: blue");
        }

        htmlstream_handle.add_highlight("require", "color: green");
        htmlstream_handle.add_rule(".", "(", "color:green");
        htmlstream_handle.add_rule(".", "/", "");
        htmlstream_handle.add_general_rule(".", "color:red");
        console.log(filename);

        res.writeHead(200, {"Content-Type" : "text/html"});
        const file = fs.createReadStream(filename, 'utf8');

        file.on('error', function(error){
            res.writeHead(404, {"Content-Type" : "text/html"});
            return res.end("404 not found");
        });

        file.pipe(htmlstream_handle).pipe(res);
    });

    server.listen(8000);
    
    console.log(`Worker ${process.pid} started`);
}