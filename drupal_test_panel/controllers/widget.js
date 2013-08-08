/*
var args = arguments[0] || {};

var drupal = args.drupal;
*/

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
	
}

function clickLogin() {
	
}





function clickLogout() {
	
	drupal.logout(
		function(resp){
			Ti.API.info(resp);
//			setStatus('logged out');
		},
		function(err){
			alert(err);
		}
	);	
}


function clickClose() {
	$.win.close();
}

