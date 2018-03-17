displayPlayerTurn("hide");
updateTurnStatus("hide","","","");

// ==============================
// ======= Initialize App =======
// ==============================
var config = {
	apiKey: "AIzaSyDJF2XlesilxEfKHgF_1I3CL7MZbcaAjYo",
	authDomain: "rps-game-6259d.firebaseapp.com",
	databaseURL: "https://rps-game-6259d.firebaseio.com",
	projectId: "rps-game-6259d",
	storageBucket: "",
	messagingSenderId: "621914515101"
};
firebase.initializeApp(config);

var database = firebase.database();


// ==============================
// ===== Detect Connections =====
// ==============================
// var connectionsRef = database.ref("/connections");
// var connectedRef = database.ref(".info/connected");

// connectedRef.on('value', function(snap) {
// 	if(snap.val()){
// 		var con = connectionsRef.push("connected");
// 		con.onDisconnect().remove();
// 	}
// });

// Change in the number of connections +/-
// connectionsRef.on('value', function(snap) {
// 	console.log(snap.numChildren() + " participant(s)");
// });

// setTimeout(function(){
// 	database.ref("players/1").remove();
// }, 10000);
// ============================
// ===== Global Variables =====
// ============================

// TODO: Add game object here; insert player object inside game object
// 		 add all functions (not touching DB) within the game object
var player = {
	num: 0,
	name: ""
}

var playerOneExists = false;
var playerTwoExists = false;

// ============================
// ======= Player Chat ========
// ============================
$("#chatSendBtn").on('click', function(event) {
	event.preventDefault();

	// Get comment and push to the database
	// Only if the comment is from a recognized player
	if (player.num > 0) {
		const chatComment = $("#chatInput").val().trim();
		if(chatComment.length > 0){
			$("#chatInput").val('');
			database.ref("chat").push({
				playerNum: player.num,
				playerName: player.name,  //TODO: make sure we're still using player.name
				comment: chatComment,
				commentTime: firebase.database.ServerValue.TIMESTAMP
			});

			// const chat = $("#chatHistory");
			// chat.scrollTop(chat.prop("scrollHeight"));
		}		
	}
});

database.ref("chat").orderByChild("commentDate").limitToLast(10).on('child_added', function(childSnapshot) {
	console.log('chat add comment');
	const comment = $("<div class='comment player-"+ childSnapshot.val().playerNum +"'>");
	const commentText = $("<p class='commentText'>")
		.html("<span class='playerName'>"+childSnapshot.val().playerName + ":</span> " + childSnapshot.val().comment);

	const commentTime = $("<div class='commentTime'>")
		.text(moment(childSnapshot.val().commentTime).format("h:mm a"));

	comment.append(commentText,commentTime);

	$("#chatHistory").append(comment);
	const chat = $("#chatHistory");
	chat.scrollTop(chat.prop("scrollHeight"));

	// Remove the top most comment;
	if($("#chatHistory div").children().length > 10){
		$("#chatHistory div").eq(0).remove();
	}
});

database.ref("chat").on('child_removed', function(event) {
	$("#chatHistory").empty();
	console.log("this event is firing this many times");
});


// =============================
// ===== Firebase Control ======
// =============================
		
// Log the user in anonymously
firebase.auth().signInAnonymously();

// Only update the database if the user is logged in
firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		// User is signed in.
		var isAnonymous = user.isAnonymous;
		var uid = user.uid;

		// --------------------
		// Update Player's Name
		// --------------------
		$("#submitName").on('click', function(event) {
			event.preventDefault();
			// Send name to DB
			const username = $("#inputName").val().trim();
			player.name = username;

			if(!playerOneExists){
				player.num = 1;
				database.ref("players/1").set({
					losses: 0,
					name: username,
					wins: 0
				});
				updateNameTags();
			}else if(playerOneExists && !playerTwoExists){
				player.num = 2;
				database.ref("players/2").set({
					losses: 0,
					name: username,
					wins: 0
				});
				updateNameTags();
			}
			$("#inputName").val('');
		});

		// --------------------
		// Listen for All Database Updates
		// --------------------
		database.ref().on('value', function(snapshot) {
			const username = $("#inputName").val().trim();

			// Update DOM if player 1 exists
			if(snapshot.child("players/1").exists()){
				playerOneExists = true;
				$("#player-1 .player-name").text(snapshot.child("players/1").val().name);
			}else {
				playerOneExists = false;
				$("#player-1 .player-name").text("Waiting for Player 1");
			}

			// Update DOM if player 2 exists
			if(snapshot.child("players/2").exists()){
				playerTwoExists = true;
				$("#player-2 .player-name").text(snapshot.child("players/2").val().name);
			}else {
				playerTwoExists = false;
				$("#player-2 .player-name").text("Waiting for Player 2");
			}

			// Start the game when both players exist
			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn === 0){
				game.turn++;
				database.ref().update({
					turn: game.turn
				});
			}else if(!snapshot.child("players/1").exists() || !snapshot.child("players/2").exists()){
				// If a player doesn't exist, reset the turn to 0
				game.turn = 0;
				database.ref().update({
					turn: game.turn
				});
			}

			// Check if both player 1 & player 2 exist
			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn < 3){
				readyPlayer(snapshot);
			}else {
				highlightPlayer(0);
			}

			// Check who won the game
			if(snapshot.child("turn").val() === 3 && 
				snapshot.child("players/1/choice").exists() && 
				snapshot.child("players/2/choice").exists()){

				console.log("Check Winner: reset turn back to 1");
				database.ref().update({
					turn: 1
				});

				console.log("Check Winner: obtain player choices");
				var p1_choice = snapshot.child("players/1/choice").val();
				var p2_choice = snapshot.child("players/2/choice").val();
				var winner = 0;
				var loser = 0;

				console.log("Check Winner: compare choices and determine winner");
				console.log("P1 Choice: " + p1_choice + ", P2 Choice: " + p2_choice);
				if (p1_choice === "Rock" && p2_choice === "Scissors"){
					winner = 1;
					loser = 2;
				}else if (p1_choice === "Rock" && p2_choice === "Paper") {
					winner = 2;
					loser = 1;
				}else if (p1_choice === "Rock" && p2_choice === "Rock") {
					winner = 0;
					loser = 0;
				}else if (p1_choice === "Paper" && p2_choice === "Rock"){
					winner = 1;
					loser = 2;
				}else if (p1_choice === "Paper" && p2_choice === "Scissors"){
					winner = 2;
					loser = 1;
				}else if (p1_choice === "Paper" && p2_choice === "Paper"){
					winner = 0;
					loser = 0;
				}else if (p1_choice === "Scissors" && p2_choice === "Paper") {
					winner = 1;
					loser = 2;
				}else if (p1_choice === "Scissors" && p2_choice === "Rock") {
					winner = 2;
					loser = 1;
				}else if (p1_choice === "Scissors" && p2_choice === "Scissors") {
					winner = 0;
					loser = 0;
				}
				displayWinner(snapshot,winner,loser);


				console.log("Check Winner: reset after timeout");
				setTimeout(function(){
					resetGame(snapshot);
				}, game.roundReset);
			}

			// Ensure client-side turn property is in sync with DB
			if(snapshot.child("turn").exists()){
				database.ref("turn").on('value', function(snapshot) {
					game.turn = snapshot.val();
				});
			}
		
		});	
		// End database.ref().on('value')
		
		database.ref().on('child_removed', function(snapshot) {
			console.log('a child has been removed');
			displayJoinForm("show");
			displayPlayerTurn("hide");
		});

		// -------------------------------
		// Console each player's choice
		// -------------------------------
		database.ref("players/1/choice").on('value', function(snap) {
			if(snap.exists()){
				console.log('P1 Choice: ' + snap.val());
			}
		});

		database.ref("players/2/choice").on('value', function(snap) {
			if(snap.exists()){
				console.log('P2 Choice: ' + snap.val());
			}
		});

		// -------------------------------
		// Update Wins / Losses in the DOM
		// -------------------------------
		database.ref("players/1/wins").on('value', function(snapshot) {
			$("#player-1 .wins").text(snapshot.val() || 0);
		});

		database.ref("players/1/losses").on('value', function(snapshot) {
			$("#player-1 .losses").text(snapshot.val() || 0);
		});

		database.ref("players/2/wins").on('value', function(snapshot) {
			$("#player-2 .wins").text(snapshot.val() || 0);
		});

		database.ref("players/2/losses").on('value', function(snapshot) {
			$("#player-2 .losses").text(snapshot.val() || 0);
		});
		
	}
});

// ------------
// Functions
// ------------

// Hide the name input form & display the player's name and assigned number
function updateNameTags() {
	const username = $("#inputName").val().trim();
	displayJoinForm("hide");
	displayPlayerTurn("show", player.num, username);
};

// Hide/Show name input form
function displayJoinForm(display){
	if(display === "show"){
		$("#joinForm").css('display', 'flex');
	}else if(display === "hide"){
		$("#joinForm").css('display', 'none');
	}
};

// Display the player's name and player number
function displayPlayerTurn(display, playerNum, playerName){
	if(display === "show"){
		$("#playerTurn").css('display', 'block');
		$("#playerInfo p").text("Hi " + playerName + "! You are Player " + playerNum);
	}else if(display === "hide"){
		$("#playerTurn").css('display', 'none');
	}
};

// function displayOptions(display, playerNum){
// 	if(display === "show"){
// 		$("#p"+ playerNum +"-info").removeClass('hide');
// 		$(".rock, .paper, .scissors").removeClass('hide');
// 	}else {
// 		$("#p"+ activePlayerNum +"-info").addClass('hide');
// 		$(".rock, .paper, .scissors").addClass('hide');
// 	}
// }

// * update the 'status' to notify the user if it is their turn or 
//   if they are waiting for the other player to move
function updateTurnStatus(display, playerNum, activePlayerNum, activePlayerName){
	if(display === "show"){
		$("#turnStatus").css('display', 'block');

		if(playerNum === activePlayerNum) {
			$("#turnStatus p").text("It's Your Turn!");
			$("#p"+ playerNum +"-info").removeClass('hide');
			$(".rock, .paper, .scissors").show();
		}else{
			$("#turnStatus p").text("Waiting for " + activePlayerName + " to choose.");
			$("#p"+ playerNum +"-info").addClass('hide');
			$("#p"+ activePlayerNum +"-info").addClass('hide');
			$(".rock, .paper, .scissors").hide();
		}

	}else if (display === "hide"){
		$("#turnStatus").css('display', 'none');
	}
};

// Highlight the selected player
function highlightPlayer(playerNum){
	$(".player").removeClass('bg-warning')
	$("#player-" + playerNum).addClass('bg-warning');
};

// Update database to reflect player's choice for this round
function updatePlayerChoice(selectedOption){
	(game.turn === 1) ? game.turn = 2 : game.turn = 3;

	game.hasSelectedChoice = true;

	database.ref().update({
		turn: game.turn
	});
	database.ref("players/" + player.num).update({
		choice: selectedOption
	});
};	

// Increment wins/losses and update the DOM with the winner
function displayWinner(snap, winner,loser){
	if(!(winner === 0) && !(loser === 0)){
		console.log('Check Winner: Player '+ winner +' wins!');
		let winner_wins = snap.child("players/" + winner).val().wins;
		let loser_losses = snap.child("players/" + loser).val().losses;
		winner_wins++;
		loser_losses++;
		database.ref("players/" + winner).update({
			wins: winner_wins
		});
		database.ref("players/" + loser).update({
			losses: loser_losses
		});

		$("#results").text(snap.child("players/" + winner).val().name + " Wins!!");		
	}else{
		console.log('Check Winner: Tie Game');
		$("#results").text("Tie Game!");	
	}
};

function resetGame(snap){
	game.hasSelectedChoice = false;
	$("#results").text('');
	// $(".rock, .paper, .scissors").show();
	readyPlayer(snap);

	console.log('game has been reset');
}

function readyPlayer(snap){
	updateTurnStatus("show",player.num,game.turn,snap.child("players/" + game.turn).val().name);
	highlightPlayer(game.turn);
}

// ============================
// ======= DOM Control ========
// ============================

// ------------
// Event Handlers
// ------------
$(".card-body").on('click', ".rock", function(event) {
	event.preventDefault();
	if(!game.hasSelectedChoice){
		updatePlayerChoice("Rock");
		$(".paper, .scissors").hide();
	}
}).on('click', '.paper', function(event) {
	event.preventDefault();
	if(!game.hasSelectedChoice){
		updatePlayerChoice("Paper");
		$(".rock, .scissors").hide();	
	}
}).on('click', '.scissors', function(event) {
	event.preventDefault();
	if(!game.hasSelectedChoice){
		updatePlayerChoice("Scissors");
		$(".rock, .paper").hide();	
	}
});

$(".reset").on('click', function(event) {
	event.preventDefault();
	database.ref().remove();
	displayJoinForm("show");
	displayPlayerTurn("hide");
});

// ------------
// TODO
// -----------

// * Hide options once choice has been made & display chosen option / change state to prevent further clicking

// Global Variables needed:
var game = {
    turn: 0,
    hasSelectedChoice: false,
    roundReset: 5000
}


