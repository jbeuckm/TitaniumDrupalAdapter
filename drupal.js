var REST_PATH;
function setRestPath(path) {
	REST_PATH = path;
}


function getCsrfToken(success, failure) {

	// use previously loaded token
	if (Ti.App.Properties.getString("X-CSRF-Token")) {
//		success(Ti.App.Properties.getString("X-CSRF-Token"));
	}

	var xhr = Ti.Network.createHTTPClient();
	var tokenPath = REST_PATH.replace('api/', 'services/session/token');
	
	xhr.onload = function(){
		Ti.App.Properties.setString("X-CSRF-Token", xhr.responseText);
		Ti.API.info('got CSRF token '+xhr.responseText);
		success(xhr.responseText);
	};
	xhr.onerror = failure;	
	
	xhr.open('GET', tokenPath);
	xhr.send();
}


function systemConnect() {

	var url = REST_PATH + 'system/connect.json';
	var xhr = Titanium.Network.createHTTPClient();
	xhr.open("POST", url);
	xhr.setRequestHeader('Content-Type','application/json; charset=utf-8');
	xhr.onload = function() {
		var statusCode = xhr.status;
		if(statusCode == 200) {
			var response = xhr.responseText;
			var data = JSON.parse(response);
			Ti.API.info(JSON.stringify(data));
		}
	};
	xhr.onerror = function(e) {
	  alert("There was an error: " + e.error);
	  
	  Ti.API.info(JSON.stringify(this));
	};
	xhr.send();
}




function createAccount(user, success, failure) {

	getCsrfToken(
		function(token) {
			
			var xhr = Ti.Network.createHTTPClient();
			xhr.open("POST", REST_PATH + "user/register");
			
			xhr.setRequestHeader('Content-Type','application/json');
			xhr.setRequestHeader("X-CSRF-Token", token);
		
			xhr.onload = function() {
				var statusCode = xhr.status;
				Ti.API.debug('REGISTER ONLOAD');
				if(statusCode == 200) {
					var response = xhr.responseText;
					var data = JSON.parse(response);
					Ti.API.trace('create account returned 200');
					Ti.API.trace(data);
		
					Ti.App.Properties.setInt("userUid", data.uid);
		
					success(data);
				}
				else {
					Ti.API.error('create account returned status '+xhr.statusCode);
					failure(xhr.statusCode)
				}
			};
			xhr.onerror = function(e) {
				Ti.API.error("There was an error: " + e.error);
			  
				if (failure) {
					failure(e);
				}
			};
		
			xhr.send(JSON.stringify(user));
		},
		function(e) {
			failure(e);
		}
	);
}


function login(username, password, success, failure) {
	
	var user = { username: username, password: password };
	var url = REST_PATH + 'user/login';
	var xhr = Ti.Network.createHTTPClient();
	xhr.open("POST", url);

	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');	
	xhr.setRequestHeader("Accepts", "application/json");
//	xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));

	xhr.onload = function() {

		var statusCode = xhr.status;
		if(statusCode == 200) {
			
			Ti.API.info('login status 200');
			
			var response = xhr.responseText;
			var data = JSON.parse(response);

			Ti.App.Properties.setString("userUid", data.user.uid);
			Ti.App.Properties.setString("userSessionId", data.sessid);
			Ti.App.Properties.setString("userSessionName", data.session_name);

			saveCredentials(username, password);

			getCsrfToken(
				// success - now login with token
				function(token){
					success(data.user);
				},
				function(e){
					failure(e);
				}
			);
		}
		else {
			Ti.API.error('login status = ' + statusCode);

			failure(xhr);
		}
	}
	xhr.onerror = function(e) {
		
		Ti.API.error('login http error '+JSON.stringify(e));

		failure(e);
	}
	xhr.send(JSON.stringify(user));

};


function logout(success, failure) {

	makeAuthenticatedRequest({
		httpCommand: 'POST',
		servicePath: 'user/logout'
	}, function(){
			Ti.App.Properties.removeProperty("userUid");
			Ti.App.Properties.removeProperty("userSessionId");
			Ti.App.Properties.removeProperty("userSessionName");
			Ti.App.Properties.removeProperty("userName");
			Ti.App.Properties.removeProperty("X-CSRF-Token")
			success();
		},
		failure
	);
	return;
	
}




function getSessionUser() {
	if (Ti.App.Properties.getInt("userUid")) {

		Ti.API.info('found user '+JSON.stringify(user));

		return {
			uid: Ti.App.Properties.getInt("userUid"),
			sessid: Ti.App.Properties.getString("userSessionId"),
			session_name: Ti.App.Properties.getString("userSessionName"),
			name: Ti.App.Properties.getString("userName"),
		}
	}
	else {
		return null;
	}
}


function loginFromSavedCredentials(success, failure) {
	login(Ti.App.Properties.getString('username'), Ti.App.Properties.getString('password'), success, failure);
}

function makeAuthenticatedRequest(config, success, failure) {

	var xhr = Titanium.Network.createHTTPClient();
	
	var url = REST_PATH + config.servicePath;
	xhr.open(config.httpCommand, url);

    xhr.onerror = function(e) {
      Ti.API.error(JSON.stringify(this));
      
	  	failure(this);
    };

	xhr.onload = function() {
		if (xhr.status == 200) {
			success(JSON.parse(xhr.responseText));
		}
		else {
			failure(JSON.parse(xhr.responseText));
		}
	};
	
	var authString = Ti.App.Properties.getString("userSessionName")+'='+Ti.App.Properties.getString("userSessionId");

	xhr.setRequestHeader("Cookie", authString);
	xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));
	
	xhr.setRequestHeader("Accepts","application/json");
	
	if (config.contentType) {
		xhr.setRequestHeader("Content-Type", config.contentType);
	}

	xhr.send(config.params);
}



function getView(viewName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath: "views/"+viewName+".json?"+encodeUrlString(args),
		httpCommand: 'GET',
	    contentType: "application/json",
	}, success, failure);
}


function getResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath: resourceName+".json?"+encodeUrlString(args),
		httpCommand: 'GET',
	    contentType: "application/json",
	}, success, failure);
}


function postResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath: resourceName,
		httpCommand: 'POST',
	    contentType: "application/json",
		params: args
	}, success, failure);
}


function createNode(node, success, failure) {

	makeAuthenticatedRequest({
		servicePath: "node",
		httpCommand: "POST",

	    contentType: "application/json",
		params: JSON.stringify({node:node})
	}, 
		function(response){
			Ti.API.trace(JSON.stringify(response));
			success(response);
		},
		function(response){
			failure(response);
		}
	);
}



function uploadFile(base64data, filename, filesize, success, failure) {

	var fileDescription = { 
		file: base64data,
		filename: filename,
		filesize: ""+filesize,
	};

	makeAuthenticatedRequest({
		servicePath: "file.json",
		httpCommand: "POST",
		contentType: "application/x-www-form-urlencoded; charset=utf-8",
		params: fileDescription
	}, success, failure);
}



exports = {
	setRestPath: setRestPath,
	createAccount: createAccount,
	login: login,
	getSessionUser: getSessionUser,
	getResource: getResource,
	makeAuthenticatedRequest: makeAuthenticatedRequest,
	getView: getView,
	logout: logout
};



function encodeUrlString(args) {
	var parts = [];
	for (var i in args) {
		var arg = args[i];
		parts.push(i+'='+encodeURIComponent(arg));
	}
	var url = parts.join('&');
	return url;
}

/*
 * Create the basic field structure for uploading a node field
 */
function basicField(obj) {
	return {
		und: [
			obj
		]
	};
}

function saveCredentials(username, password) {
	Ti.App.Properties.setString('username', username);
	Ti.App.Properties.setString('password', password);
}


