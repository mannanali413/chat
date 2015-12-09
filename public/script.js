window.onload = function(){
	var messages = {};
	var socket = io.connect('http://localhost:3700');
	var content = document.getElementById("chat-content");
	var sendInput = document.getElementById("chat-input");

	var chatExpanded = document.getElementById('chat-expanded')

	var nickError = document.getElementById('nick-error')// If multiple nickNames occur
	var users = document.getElementById('users-inner-id')// Ul for list of all users
	
	// Using session storage for storing the users name
	document.getElementById('name-submit').onclick = function(event){
		event.preventDefault();
		event.stopPropagation();
		var nickName = document.getElementById('nick-fname')
		socket.emit('new user', nickName.value, function(data){
			if(data){
				document.getElementById('login-form').style.display = 'none'
				window.sessionStorage.userName = nickName.value
				nickName.value = ''
			}else{
				nickError.innerHTML = 'Nick Name already in use'
			}
		})
	}

	var chatWindow = '<div class="top-header"><span class="username-left"></span><span class="min-button" onclick="minButtonCollapse()">-<span></div><div class="chat-content" id="chat-content"></div><input autofocus="true" type="text" class="chat-input"/>'

	function hideTyping(options){
		socket.emit('hide_typing', options)
	} 

	var newHideTyping = debounce(hideTyping, 500)

	sendInputKeyUp = function(options, event){
		if(event.keyCode == 13){
			sendMessage(event)
		}
		else{
			if(options.from && options.to){
				newHideTyping(options)			
			}
		}
	}

	function debounce(func, wait, immediate) {
    	var timeout;           
    	return function() {
        var context = this, 
            args = arguments;
        var callNow = immediate && !timeout;

        clearTimeout(timeout);   
        timeout = setTimeout(function() {
             timeout = null;
             if (!immediate) {
               func.apply(context, args);
             }
        }, wait);

        if (callNow) func.apply(context, args);  
    }; };

	function minButtonCollapse(event){
		event.stopPropagation();
		event.preventDefault();
		chatExpanded.style.display = 'none';
		chatCollapseElement.style.display = 'inline-block';
	}

	socket.on('username', function(data){
		var html = ''
		for(var i=0; i< data.length; i++){
			if(data[i] !== window.sessionStorage.userName)
				html += '<li class="user-entry" data-remote-user='+data[i]+'>'+data[i]+'</li><br/>'
		}
		users.innerHTML = html
	})

	function appendMessage(chatDiv, data, idString){
		var chatContent = chatDiv.getElementsByClassName("chat-content")[0]
		if(messages[idString]){
			messages[idString].push(data.message)
		}else{
			messages[idString] = [data.message]
		}
		var html = '';
		// for(var i=0; i< messages[idString].length; i++){
		// 	html += messages[idString][i] + '<br/>'
		// }
		if(data.from){
			var newContent = document.createElement('div')
			newContent.classList.add("chat-bubble")
			newContent.classList.add("you")
			newContent.textContent = data.message
			chatContent.appendChild(newContent)
			chatContent.scrollTop = chatContent.scrollHeight
		}
		else if(data.to){
			var newContent = document.createElement('div')
			newContent.classList.add("chat-bubble")
			newContent.classList.add("me")
			newContent.textContent = data.message
			chatContent.appendChild(newContent)
			chatContent.scrollTop = chatContent.scrollHeight
		}
	}

	function informUserTyping(options, event){
		socket.emit('typing', options)
	}

	socket.on('message_for_self', function(data){
		if(data.message && data.to){
			var idString = "self:"+window.sessionStorage.userName+"remote:"+data.to
			var chatDiv = document.getElementById(idString)
			if(chatDiv){
				appendMessage(chatDiv, data, idString)
			}
			else{
				makeChatWindow(data.to)
				chatDiv = document.getElementById(idString)
				appendMessage(chatDiv, data, idString)
			}
		}
	})

	socket.on('message_for_remote', function(data){
		if(data.message && data.from){
			var idString = "self:"+window.sessionStorage.userName+"remote:"+data.from
			var chatDiv = document.getElementById(idString)
			if(chatDiv){
				var typingInfo = chatDiv.querySelectorAll('[data-typing]')
				if(typingInfo.length){
					typingInfo[0].classList.remove('display')
					typingInfo[0].classList.add('hidden')
				}
				appendMessage(chatDiv, data, idString)

			}
			else{
				makeChatWindow(data.from)
				chatDiv = document.getElementById(idString)
				appendMessage(chatDiv, data, idString)
			}
		}
	})

	socket.on('update_on_typing', function(data){
		if(data.from){
			var idString = "self:"+window.sessionStorage.userName+"remote:"+data.from
			var chatDiv = document.getElementById(idString)
			if(chatDiv){
				var typingInfo = chatDiv.querySelectorAll('[data-typing]')
				if(typingInfo.length){
					typingInfo[0].classList.remove('hidden')
					typingInfo[0].classList.add('display')
				}
				else{
					typingInfo = document.createElement('div')
					typingInfo.setAttribute("data-typing","true")
					typingInfo.classList.add("display")
					typingInfo.classList.add("bubble")
					typingInfo.classList.add("you")
					typingInfo.textContent = "Typing..."
					chatDiv.appendChild(typingInfo)
					chatDiv.scrollTop = chatDiv.scrollHeight
				}
			}
		}
	})

	socket.on('update_hide_typing',function(data){
		if(data.from){
			var idString = "self:"+window.sessionStorage.userName+"remote:"+data.from
			var chatDiv = document.getElementById(idString)
			if(chatDiv){
				var typingInfo = chatDiv.querySelectorAll('[data-typing]')
				if(typingInfo.length){
					typingInfo[0].classList.remove('display')
					typingInfo[0].classList.add('hidden')
				}
			}
		}
	})

	users.onclick = function(e){
		if(e.target && e.target.nodeName == "LI"){
			var toUser = e.target.getAttributeNode("data-remote-user").value
			// create a div to hold the chat
			makeChatWindow(toUser)
		}
	}

	function makeChatWindow(remoteUser){
		var div = document.createElement('div');
		var idString = "self:"+window.sessionStorage.userName+"remote:"+remoteUser
		div.setAttribute("id", idString)
		div.setAttribute("data-remote-user", remoteUser)
		div.setAttribute("data-current-user", window.sessionStorage.userName)
		div.classList.add("chat-expanded")
		div.innerHTML = chatWindow
		div.getElementsByClassName("username-left")[0].textContent = remoteUser
		div.getElementsByClassName("chat-input")[0].onkeyup = sendInputKeyUp.bind(null, {from: window.sessionStorage.userName, to: remoteUser})
		div.getElementsByClassName("chat-input")[0].onkeydown = informUserTyping.bind(null, {from: window.sessionStorage.userName, to: remoteUser})
		document.body.appendChild(div)
	}

	socket.on('message', function(data){
		if(data.message){
			console.log("Message from server", "Successful connection");
			return;
		}
	});

	sendMessage = function(event){
		var text = event.target.value;
		var fromUser = event.target.parentElement.getAttributeNode("data-current-user").value
		var toUser = event.target.parentElement.getAttributeNode("data-remote-user").value
		socket.emit('send', {message: text, from: fromUser, to: toUser});
		event.target.value = "";
	}
}