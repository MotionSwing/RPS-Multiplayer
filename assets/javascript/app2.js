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
var connectionsRef = database.ref("/connections");
var connectedRef = database.ref(".info/connected");

connectedRef.on('value', function(snap) {
	if(snap.val()){
		var con = connectionsRef.push("connected");
		con.onDisconnect().remove(function(){
			// database.ref("players/" + player.num).set(null);
		});
	}
});

// Change in the number of connections +/-
connectionsRef.on('value', function(snap) {
	console.log(snap.numChildren() + " participant(s)");
});
// ============================
// ===== Global Variables =====
// ============================
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
	const chatComment = $("#chatInput").val().trim();
	if(chatComment.length > 0){
		$("#chatInput").val('');
		database.ref("chat").push({
			playerNum: player.num,
			playerName: player.name,  //TODO: make sure we're still using player.name
			comment: chatComment,
			commentTime: firebase.database.ServerValue.TIMESTAMP
		});
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
});

// =============================
// ===== Firebase Control ======
// =============================
firebase.auth().signInAnonymously();

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		// User is signed in.
		var isAnonymous = user.isAnonymous;
		var uid = user.uid;

		// TODO: store database update functions here
		// What data do we need to send to the DB?
		// * players
		// ** choice
		// ** losses
		// ** wins - determine winner/loser
		// ** name
		// *turns
		// *chat
	
		// ------------
		// Event Handlers
		// ------------
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
		});

		database.ref().on('value', function(snapshot) {
			const username = $("#inputName").val().trim();

			// Check if player 1 exists
			if(snapshot.child("players/1").exists()){
				playerOneExists = true;
				$("#player-1 .player-name").text(snapshot.child("players/1").val().name);
			}else {
				playerOneExists = false;
				$("#player-1 .player-name").text("Waiting for Player 1");
			}

			// Check if player 2 exists
			if(snapshot.child("players/2").exists()){
				playerTwoExists = true;
				$("#player-2 .player-name").text(snapshot.child("players/2").val().name);
			}else {
				playerTwoExists = false;
				$("#player-2 .player-name").text("Waiting for Player 2");
			}

			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn === 0){
				game.turn++;
				database.ref("players").update({
					turn: game.turn
				});
			}
			// Check if both player 1 & player 2 exist
			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists()){
				updateTurnStatus("show",player.num, game.turn,
					snapshot.child("players/" + game.turn).val().name);
				readyPlayer(game.turn);
			}else {
				readyPlayer(0);
			}

			// Ensure client-side turn property is in sync with DB
			if(snapshot.child("players/turn").exists()){
				database.ref("players/turn").on('value', function(snapshot) {
					game.turn = snapshot.val();
				});
			}


			if(snapshot.child("players/1/choice").exists() && snapshot.child("players/2/choice").exists() && 
				game.checkWinner){
				game.checkWinner = false;
	
				console.log("performing check");
				const p1_choice = snapshot.child("players/1").val().choice;
				let p1_wins = snapshot.child("players/1").val().wins;
				let p1_losses = snapshot.child("players/1").val().losses;

				const p2_choice = snapshot.child("players/2").val().choice;
				let p2_wins = snapshot.child("players/2").val().wins;
				let p2_losses = snapshot.child("players/2").val().losses;

				// // Reset the turn back to 1
				// database.ref("players").update({
				// 	turn: 1
				// });

				if (p1_choice === "Rock" && p2_choice === "Scissors"){
					displayWinner(1,2);
				}else if (p1_choice === "Paper" && p2_choice === "Rock"){
					displayWinner(1,2);
				}else if (p1_choice === "Scissors" && p2_choice === "Paper") {
					displayWinner(1,2);
				}else if (p2_choice === "Rock" && p1_choice === "Scissors") {
					displayWinner(2,1);
				}else if (p2_choice === "Paper" && p1_choice === "Rock") {
					displayWinner(2,1);
				}else if (p2_choice === "Scissors" && p1_choice === "Paper"){
					displayWinner(2,1);
				}else {
					// if a tie
					console.log('Tie Game');
				}

				// database.ref("players/1/choice").remove();
				// database.ref("players/2/choice").remove();

				// After timeout, display options
				setTimeout(function(){
					$(".rock, .paper, .scissors").show();
					$("#winner").text('');
				},2000);
			}

			function displayWinner(winner,loser){
				var winner_wins = snapshot.child("players/" + winner).val().wins;
				var loser_losses = snapshot.child("players/" + loser).val().losses;
				winner_wins++;
				loser_losses++;
				database.ref("players/" + winner).update({
					wins: winner_wins
				});
				database.ref("players/" + loser).update({
					losses: loser_losses
				});

				$("#results").text(snapshot.child("players/" + winner).val().name + " Wins!!");
			};
		});	
		// End database.ref().on()
		
		database.ref("players/1/wins").on('value', function(snapshot) {
			$("#player-1 .wins").text(snapshot.val());
		});
		database.ref("players/1/losses").on('value', function(snapshot) {
			$("#player-1 .losses").text(snapshot.val());
		});

		database.ref("players/2/wins").on('value', function(snapshot) {
			$("#player-2 .wins").text(snapshot.val());
		});

		database.ref("players/2/losses").on('value', function(snapshot) {
			$("#player-2 .losses").text(snapshot.val());
		});
		
	}
});

// Hide the name input form & display the player's name and assigned number
function updateNameTags() {
	const username = $("#inputName").val().trim();
	displayJoinForm("hide");
	displayPlayerTurn("show", player.num, username);
};

// Highlight the selected player
// Display r-p-s options for the selected player
function readyPlayer(playerNum){
	$(".player").removeClass('border border-warning')
	$("#player-" + playerNum).addClass('border border-warning');
	$("#player-" + playerNum +" .rock, .paper, .scissors").show();
	displayChoices("show",playerNum);
};

// Prevent players from seeing each other's choices
function displayChoices(display, playerNum){
	if(display === "show" && playerNum === player.num){
		$("#p"+ playerNum +"-info").removeClass('hide');
	}else {
		$("#p"+ playerNum +"-info").addClass('hide');
	}
};

// Update database to reflect player's choice for this round
function updatePlayerChoice(selectedOption){
	if (game.turn === 1){
		game.turn = 2;
		game.checkWinner = false;
	}else {
		game.checkWinner = true;
		game.turn = 1;
	}

	database.ref("players").update({
		turn: game.turn
	});
	database.ref("players/" + player.num).update({
		choice: selectedOption
	});
};	

function resetGame() {

};

// ============================
// ======= DOM Control ========
// ============================

// ------------
// Event Handlers
// ------------
$(".card-body").on('click', ".rock", function(event) {
	event.preventDefault();
	updatePlayerChoice("Rock");
	$(".paper, .scissors").hide();
}).on('click', '.paper', function(event) {
	event.preventDefault();
	updatePlayerChoice("Paper");
	$(".rock, .scissors").hide();
}).on('click', '.scissors', function(event) {
	event.preventDefault();
	updatePlayerChoice("Scissors");
	$(".rock, .paper").hide();
});

// ------------
// Functions
// ------------

// Functions needed:
// * update the 'status' to hide the name input (display: none)
// * update the 'status' to show the name input (display: block)
function displayJoinForm(display){
	if(display === "show"){
		$("#joinForm").css('display', 'block');
	}else if(display === "hide"){
		$("#joinForm").css('display', 'none');
	}
};
// * update the 'status' to show player name and player # & turn status
// * update the 'status' to hide player name and player # & turn status
function displayPlayerTurn(display, playerNum, playerName){
	if(display === "show"){
		$("#playerTurn").css('display', 'block');
		$("#playerInfo p").text("Hi " + playerName + "! You are Player " + playerNum);
	}else if(display === "hide"){
		$("#playerTurn").css('display', 'none');
	}
};

// * update the 'status' to notify the user which player they are (1 or 2)
// function updatePlayerNameAndNum(playerNum, playerName){
// 	$("#playerInfo p").text("Hi " + playerName + "! You are Player " + playerNum);
// };
// * update the 'status' to notify the user if it is their turn or 
//   if they are waiting for the other player to move
function updateTurnStatus(display, playerNum, activePlayerNum, activePlayerName){
	if(display === "show"){
		$("#turnStatus").css('display', 'block');
		if(playerNum === activePlayerNum){
			$("#turnStatus p").text("It's Your Turn!");
		}else if(playerNum != activePlayerNum){
			$("#turnStatus p").text("Waiting for " + activePlayerName + " to choose.");
		}	
	}else if (display === "hide"){
		$("#turnStatus").css('display', 'none');
	}
};
// * highlight the card associated with the player whose turn it is to move
// * Display a list of options once the round starts (Rock, Paper, Scissors)
// * Hide options once choice has been made & display chosen option / change state to prevent clicking
// * update the 'results' with the winner
// * clear 'results' at the start of each round
// * update each player's wins/losses totals
// * setTimeout to reset round after 3-5 seconds 


// Global Variables needed:
var game = {
    playerCount: 0,
    whoHasNextMove: 1,
    turn: 0, 
    roundReset: 3000,
    checkWinner: false
}


