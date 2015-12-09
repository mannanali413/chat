var express = require("express");
var app = express();
var port = 3700;

// app.set('views', __dirname+'/tpl');
// app.set('view engine', "jade");
// app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));

app.get("/", function(req, res){
	res.render("index.html");
})

var io = require('socket.io').listen(app.listen(port))
var clients = {}

io.sockets.on('connection', function(socket){
	socket.on('new user', function(data, callback){
		if(Object.keys(clients).indexOf(data) == -1)
		{
			socket.clientName = data
			clients[data] = socket
			callback(true)
			updateClientNames()
		}
		else{
			callback(false)
		}
	})
	socket.emit('message', {client: 'server', message: 'welcome to the chat'});

	socket.on('send', function(data){
		console.log(data.message, data.from, data.to)
		var toUserSocket = clients[data.to]
		var fromUserSocket = clients[data.from]
		var message = data.message
		io.to(toUserSocket.id).emit('message_for_remote', {message: message, from: data.from})
		io.to(fromUserSocket.id).emit('message_for_self',{message: message, to: data.to})
		// io.sockets.emit('message', {message: data.message, client: socket.clientName});
	});

	function updateClientNames(){
		io.sockets.emit('username', Object.keys(clients))
	}
	
	socket.on('typing', function(data){
		if(data.from && data.to){
			var toUserSocket = clients[data.to]
			if(toUserSocket){
				io.to(toUserSocket.id).emit('update_on_typing',{from: data.from})	
			}
		}
	})

	socket.on('hide_typing', function(data){
		if(data.from && data.to){
			var toUserSocket = clients[data.to]
			if(toUserSocket){
				io.to(toUserSocket.id).emit('update_hide_typing', {from: data.from})
			}
		}
	})

	socket.on('disconnect', function(){
		if(!socket.clientName) return;
		// clients.splice(clients.indexOf(socket.clientName),1)
		delete clients[socket.clientName]
		updateClientNames()
	})
})

console.log("Listening on port")