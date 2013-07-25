var REST_PATH;
function setRestPath(path) {
	REST_PATH = path;
}

function getCsrfToken(success, failure) {

	// use previously loaded token
	if (Ti.App.Properties.getString("X-CSRF-Token")) {
		success(Ti.App.Properties.getString("X-CSRF-Token"));
	}

	var xhr = Ti.Network.createHTTPClient();
	var tokenPath = REST_PATH.replace('api/', 'services/session/token');

	xhr.onload = function() {
		Ti.App.Properties.setString("X-CSRF-Token", xhr.responseText);
		Ti.API.info('got CSRF token ' + xhr.responseText);
		success(xhr.responseText);
	};
	xhr.onerror = failure;

	xhr.open('GET', tokenPath);
	xhr.send();
}


function systemConnect(success, failure) {

	var url = REST_PATH + 'system/connect.json';
	var xhr = Titanium.Network.createHTTPClient();
	xhr.open("POST", url);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));
	xhr.onload = function() {
		var statusCode = xhr.status;
		if (statusCode == 200) {
			var response = xhr.responseText;
			var data = JSON.parse(response);
			success(data);
		}
	};
	xhr.onerror = function(e) {
		alert("There was an error: " + e.error);

		failure(e);
	};
	xhr.send();
}

function createAccount(user, success, failure) {

	getCsrfToken(function(token) {

		systemConnect(
			function(responseData){
	
				Ti.App.Properties.setString("userUid", responseData.user.uid);
				Ti.App.Properties.setString("userSessionId", responseData.sessid);
				Ti.App.Properties.setString("userSessionName", responseData.session_name);

				registerNewUser(user, success, failure);
			},
			function(e){
				Ti.API.error(e);
				failure(e);
			}
		);

	},
	function(err){
		failure(err);
	});
}

function registerNewUser(user, success, failure) {
//Ti.API.info('will now register user '+JSON.stringify(user));	
	makeAuthenticatedRequest({
			httpCommand : 'POST',
			servicePath : 'user/register.json',
			params: JSON.stringify(user)
		}, 
		//success
		function(responseData){
			Ti.API.info('registerNewUser SUCCESS');
			success(responseData);
		},
		//fail
		function(err){
			Ti.API.error('registerNewUser FAIL');
			failure(err);
		}
	);

}


function login(username, password, success, failure) {

	var user = {
		username : username,
		password : password
	};
/*
	makeAuthenticatedRequest({
			httpCommand : 'POST',
			servicePath : 'user/login',
			params: JSON.stringify(user)
		},
		success,
		failure
	);
*/

	var url = REST_PATH + 'user/login';
	var xhr = Ti.Network.createHTTPClient();
	xhr.open("POST", url);

	xhr.setRequestHeader('Content-Type', 'application/json');

	var authString = Ti.App.Properties.getString("userSessionName") + '=' + Ti.App.Properties.getString("userSessionId");
	xhr.setRequestHeader("Cookie", authString);

	xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));

//	xhr.setRequestHeader("Accepts", "application/json");

	xhr.onload = function() {

		var statusCode = xhr.status;
		if (statusCode == 200) {

			Ti.API.info('login status 200');

			var response = xhr.responseText;
			var data = JSON.parse(response);

			Ti.App.Properties.setString("userUid", data.user.uid);
			Ti.App.Properties.setString("userSessionId", data.sessid);
			Ti.App.Properties.setString("userSessionName", data.session_name);

			saveCredentials(username, password);

			getCsrfToken(
			// success - now login with token
			function(token) {
				success(data.user);
			}, function(e) {
				failure(e);
			});
		} else {
			Ti.API.error('login status = ' + statusCode);

			failure(xhr);
		}
	}
	xhr.onerror = function(e) {

		Ti.API.error('login http error ' + JSON.stringify(e));

		failure(e);
	}
	xhr.send(JSON.stringify(user));

};

function logout(success, failure) {

	makeAuthenticatedRequest({
		httpCommand : 'POST',
		servicePath : 'user/logout'
	}, function() {
		Ti.App.Properties.removeProperty("userUid");
		Ti.App.Properties.removeProperty("userName");
		Ti.App.Properties.removeProperty("userSessionId");
		Ti.App.Properties.removeProperty("userSessionName");
//		Ti.App.Properties.removeProperty("X-CSRF-Token");
		success();
	}, failure);

}

function getSessionUser() {
	if (Ti.App.Properties.getInt("userUid")) {

		Ti.API.info('found user ' + JSON.stringify(user));

		return {
			uid : Ti.App.Properties.getInt("userUid"),
			sessid : Ti.App.Properties.getString("userSessionId"),
			session_name : Ti.App.Properties.getString("userSessionName"),
			name : Ti.App.Properties.getString("userName"),
		}
	} else {
		return null;
	}
}

function loginFromSavedCredentials(success, failure) {
	login(Ti.App.Properties.getString('username'), Ti.App.Properties.getString('password'), success, failure);
}

function makeAuthenticatedRequest(config, success, failure) {

	var url = REST_PATH + config.servicePath;

	var xhr = Titanium.Network.createHTTPClient();
	xhr.open(config.httpCommand, url);

	xhr.onerror = function(e) {
		Ti.API.error(JSON.stringify(e));

		failure(e);
	};

	xhr.onload = function() {
		Ti.API.trace('makeAuthReq returned with status '+xhr.status);
		if (xhr.status == 200) {
			success(xhr.responseData);
		}
		else {
			failure(xhr.responseData);
		}
	};

	var authString = Ti.App.Properties.getString("userSessionName") + '=' + Ti.App.Properties.getString("userSessionId");
	xhr.setRequestHeader("Cookie", authString);

	if (!config.skipCsrfToken) {
		xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));
	}
	
//	xhr.setRequestHeader("Accepts", "application/json");

	if (config.contentType) {
		xhr.setRequestHeader("Content-Type", config.contentType);
	}
	else {
		xhr.setRequestHeader("Content-Type", "application/json");
	}

	xhr.send(config.params);
}

function getView(viewName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : "views/" + viewName + ".json?" + encodeUrlString(args),
		httpCommand : 'GET',
		contentType : "application/json",
	}, success, failure);
}

function getResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : resourceName + ".json?" + encodeUrlString(args),
		httpCommand : 'GET'
	}, success, failure);
}

function postResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : resourceName,
		httpCommand : 'POST',
		params : args
	}, success, failure);
}

function createNode(node, success, failure) {

	makeAuthenticatedRequest({
		servicePath : "node",
		httpCommand : "POST",

		params : JSON.stringify({
			node : node
		})
	}, function(response) {
		Ti.API.trace(JSON.stringify(response));
		success(response);
	}, function(response) {
		failure(response);
	});
}

function uploadFile(base64data, filename, filesize, success, failure) {

	var fileDescription = {
		file : base64data,
		filename : filename,
		filesize : "" + filesize,
	};

	makeAuthenticatedRequest({
		servicePath : "file.json",
		httpCommand : "POST",
		contentType : "application/x-www-form-urlencoded; charset=utf-8",
		params : fileDescription
	}, success, failure);
}



/**
 * Do the custom serialization for sending drupal views contextual filter settings
 * 
 * @param {Object} obj
 */
function serializeDrupalViewsFilter(obj) {
	var str = [];
	for(var p in obj) {
  		if (obj[p]  instanceof Array) {
  			
  			for (var i=0, l=obj[p].length; i<l; i++) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p][i]));
			}
  		}
  		else {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
	}
	return str.join("&");
}


function encodeUrlString(args) {
	var parts = [];
	for (var i in args) {
		var arg = args[i];
		parts.push(i + '=' + encodeURIComponent(arg));
	}
	var url = parts.join('&');
	return url;
}

/*
 * Create the basic field structure for uploading a node field
 */
function basicField(obj) {
	return {
		und : [obj]
	};
}

function saveCredentials(username, password) {
	Ti.App.Properties.setString('username', username);
	Ti.App.Properties.setString('password', password);
}



exports = {
	systemConnect: systemConnect,
	setRestPath : setRestPath,
	createAccount : createAccount,
	login : login,
	getSessionUser : getSessionUser,
	getResource : getResource,
	serializeDrupalViewsFilter: serializeDrupalViewsFilter,
	makeAuthenticatedRequest : makeAuthenticatedRequest,
	getView : getView,
	logout : logout
};
