
var firebaseConfig = {
    apiKey: "AIzaSyAWRsV7Fj_2_wfQE5oXpO85NS7AMkOAIZ0",
    authDomain: "vitera-2ebc4.firebaseapp.com",
    databaseURL: "https://vitera-2ebc4.firebaseio.com",
    projectId: "vitera-2ebc4",
    storageBucket: "vitera-2ebc4.appspot.com",
    messagingSenderId: "455631403334",
    appId: "1:455631403334:web:a91afcb25d1035f699cd47"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();


function signUp(){

  var email = document.getElementById("email");
  var password = document.getElementById("password");
  
  const promise = auth.createUserWithEmailAndPassword(email.value, password.value);
  promise.catch(e => alert(e.message));
  
  alert("Signed Up");
 }
	 

	 // $("#not-logged").show();
			// $("#logged").hide();
			// $("#mynav").hide();
			// $("#myfoot").hide();
			// $("#home").hide();
			// $("#video1").hide();
			// $("#reg").hide();

	 function signIn(){
	  
	  var email = document.getElementById("email");
	  var password = document.getElementById("password");
	  
	  const promise = auth.signInWithEmailAndPassword(email.value, password.value);
	  promise.catch(e => alert(e.message));
					// login
					
	 }
	 
	 
	 function signOut(){
	  
	  auth.signOut();
	  alert("Signed Out");
	  
	 }
	 
	 
	 
	 auth.onAuthStateChanged(function(user){
	  
	  if(user){
	   
	   var email = user.email;
	//    alert("Active User " + email);
	   				$("#name-user").text(user);
					$("#mynav").show();
					$("#home").show();
					$("#myfoot").hide();
					$("#not-logged").hide();
					$("#video1").hide();
					$("#logged").hide();
					$("#reg").hide();
	   
	   //Take user to a different or home page
	
	   //is signed in
	   
	  }else{
	   
	//    alert("No Active User");
	   //no user is signed in
	   		$("#not-logged").show();
			$("#logged").hide();
			$("#mynav").hide();
			$("#myfoot").hide();
			$("#home").hide();
			$("#video1").hide();
			$("#reg").hide();
	  }
	  
	  
	  
	 });
	 function home(){
		$("#mynav").show();
		$("#home").show();
		$("#myfoot").hide();
		$("#not-logged").hide();
		$("#video1").hide();
		$("#logged").hide();
		$("#reg").hide();
		$("#myabout").hide();
	 }

function nolog(){
			$("#not-logged").show();
			$("#logged").hide();
			$("#mynav").hide();
			$("#myfoot").hide();
			$("#home").hide();
			$("#video1").hide();
			$("#reg").hide();
}


function joinHome(){
			$("#not-logged").hide();
			$("#mynav").show();
			$("#myfoot").hide();
			$("#video1").hide();
			$("#home").hide();
			$("#logged").show();
			$("#reg").hide();
			// Random nickName and session
			$("#sessionName").val("Session " + Math.floor(Math.random() * 10));
			$("#nickName").val("Participant " + Math.floor(Math.random() * 100));
}

// join video
function joinVideo(){
	$("#not-logged").hide();
	$("#mynav").show();
	$("#myfoot").hide();
	$("#video1").show();
	$("#vid").show();
	$("#home").hide();
	$("#logged").hide();
	$("#reg").hide();
}

// about
function about(){
	$("#not-logged").hide();
	$("#mynav").show();
	$("#myfoot").show();
	$("#video1").hide();
	$("#vid").hide();
	$("#home").hide();
	$("#logged").hide();
	$("#myabout").show();
	$("#reg").hide();
}


function httpPostRequest(url, body, errorMsg, callback) {
	var http = new XMLHttpRequest();
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.addEventListener('readystatechange', processRequest, false);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback();
				}
			} else {
				console.warn(errorMsg);
				console.warn(http.responseText);
			}
		}
	}
}

