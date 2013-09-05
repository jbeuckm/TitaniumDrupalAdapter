/*var args = arguments[0] || {};

var drupal = args.drupal;
*/

var drupal;
exports.setDrupal = function(d) {
	drupal = d;
};


function setStatus(status) {
	switch (status) {

		case 'logged in':
			$.logoutButton.enabled = true;
			$.loginButton.enabled = false;
			$.email.enabled = false;
			$.registerButton.enabled = false;
			break;

		case 'logged out':
			$.logoutButton.enabled = false;
			$.loginButton.enabled = true;
			$.email.enabled = true;
			$.registerButton.enabled = true;
			break;
	}
	
	$.statusLabel.text = status;
}



function updateStatus() {
	drupal.systemConnect(
		function(sesssion){
			if (session.user.uid != 0) {
				setStatus('logged in');
			}
			else {
				setStatus('logged out');
			}
		},
		function(err) {
			setStatus('error');
		}
	);
}




function clickRegister() {
	
	if (!$.username.value || $.password.value || $.email.value) {
		alert("please provide a name, email and password");
		return;
	}
	
	var user = {
		name: $.username.value,
		pass: $.password.value,
		mail: $.email.value
	};
	
	createAccount(user,
		function(response) {
			alert(response);
		},
		function(error) {
			alert(error);
		}
	);
	
}

function clickLogin() {

	if (!$.username.value || $.password.value) {
		alert("please provide a username and password");
		return;
	}

	drupal.login($.username.value, $.password.value, 
		function(response) {
			setStatus('logged in');
			alert(response);
		},
		function(error) {
			alert(error);
		}
	);
}





function clickLogout() {
	
	drupal.logout(
		function(resp){
			setStatus('logged out');
			Ti.API.info(resp);
		},
		function(err){
			alert(err);
		}
	);	
}


function clickClose() {
	$.win.close();
}

