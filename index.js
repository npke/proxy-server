let http = require('http');
let request = require('request');
let url = require('url');
let path = require('path');
let fs = require('fs');
let argv = require('yargs')
	.default('host', '127.0.0.1:8000')
	.argv;
let exec = require('child_process').exec;

let port = argv.port || (argv.host === '127.0.0.1' ? 8000 : 80);

let destinationUrl = url.format({
	protocol: 'http',
	host: argv.host,
	port: port
});

let execCommand = `${argv.exec} ${argv._.join(' ')}`;

if (execCommand) {
	exec(execCommand, (err, stdout) => {
		if (err) {
			console.log ('Oops! Something went wrong!');
			return;
		}

		console.log(stdout);
	})

	return;
}

if (argv.url)
	destinationUrl = 'http://' + argv.url; 

let logPath = argv.log && path.join(__dirname, argv.log);
let logStream = logPath ? fs.createWriteStream(logPath) : process.stdout;

// Echo server
let echoServer = http.createServer((req, res) => {
	console.log('\n\n---Echo server---');
	process.stdout.write('\nRequest Header: \n' + JSON.stringify(req.headers));

	for (let header in req.headers) {
		res.setHeader(header, req.headers[header]);
	}

	req.pipe(res);
});

echoServer.listen(8000, () => {
	console.log('\n->Echo server running at http://localhost:8000 (http://127.0.0.1:8000)\n');
});

// Proxy server
let proxyServer = http.createServer((req, res) => {

	let url = destinationUrl;
	if (req.headers['x-destination-url']) {
		url = 'http://' + req.headers['x-destination-url'];
	}

	console.log('\n\n---Proxy Server---');
	console.log(`Proxying request to: ${url + req.url}`);

	let options = {
		headers: req.headers,
		url: `${url}${req.url}`	
	}

	options.method = req.method;

	let outboundResponse = request(options);
	req.pipe(outboundResponse);
	outboundResponse.pipe(res);
	
	logStream.write('\nRequest Header: \n' + JSON.stringify(req.headers));
	logStream.write(JSON.stringify(outboundResponse.headers));

	logStream.write('\n\nResponse: \n');
	outboundResponse.pipe(logStream, {end: false});
});

proxyServer.listen(8001, () => {
	console.log('->Proxy server running at http://localhost:8001 (http://127.0.0.1:8001)');
	console.log('-->Default destination: ' + destinationUrl);
	console.log('-->Default log stream: ' + (logPath ? logPath : 'stdout'));
});
