describe("Drupal Tests", function() {

	var drupal = require('/drupal/drupal');

	describe("can create account & login", function() {
		
		var user = {
			name: 'drupalspec'+createRandomString(8),
			pass: 'drupalspec'+createRandomString(8),
			mail: 'drupalspec'+createRandomString(8)+'@drupalspec'+createRandomString(4)+'.com'
		};
			

		beforeEach(function() {
//			Ti.App.Properties.removeProperty("X-CSRF-Token")
		});

		it("registers an account", function() {

			var done = false;
			var error = '';
			var response = '';
						
			runs(function(){
				
				drupal.createAccount(user, 
					//success
					function(res) {
						response = res;
						done = true;
					},
					//failure
					function(e) {
						error = e;
						done = true;
					}
				);
			});
			
			waitsFor(function(){ return done; }, 'problem creating account', 2500);
			
			runs(function(){
				expect(error).toEqual('');
			});

		});


		
		it("can log in and out", function() {
			
			var loggedin = true;
			
			// ensure logged out before attempt login
			runs(function() {
				drupal.logout(
					function() {
						loggedin = false;
					},
					function() {
						loggedin = false;
					}
				);
			});
			waitsFor(function(){
				return !loggedin;
			}, 'logged out before running the login test', 2500);
			
			// login as the previously created test user
			runs(function() {
				drupal.login(user.name, user.pass,
					function() {
						loggedin = true;
					},
					function() {
						loggedin = false;
					}
				);
			});

			waitsFor(function(){ return loggedin; }, 'logged in', 2500);
			
			runs(function() {
				drupal.logout(
					function() {
						loggedin = false;
					},
					function() {
						loggedin = true;
					}
				);
			});

			waitsFor(function(){ return !loggedin; }, 'logged out', 2500);
		});

	});
	
}); 

function createRandomString(max) {

    if (max == null) max = 20;
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < max; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}