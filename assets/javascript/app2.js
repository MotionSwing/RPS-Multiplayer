

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
		con.onDisconnect().remove();
	}
});

// Change in the number of connections +/-
connectionsRef.on('value', function(snap) {
	$(".visitors").text(snap.numChildren() + " visitors");
});

// ============================
// ===== Global Variables =====
// ============================

var playerOneExists = false;
var playerTwoExists = false;

// ============================
// ======= Player Chat ========
// ============================
$("#chatSendBtn").on('click', function(event) {
	event.preventDefault();

	// Get comment and push to the database
	// Only if the comment is from a recognized player
	if (game.player.num > 0) {
		const chatComment = $("#chatInput").val().trim();
		if(chatComment.length > 0){
			$("#chatInput").val('');
			database.ref("chat").push({
				playerNum: game.player.num,
				playerName: game.player.name,
				comment: chatComment,
				commentTime: firebase.database.ServerValue.TIMESTAMP
			});
		}		
	}
});

database.ref("chat").orderByChild("commentDate").limitToLast(10).on('child_added', function(childSnapshot) {
	const comment = $("<div class='comment player-"+ childSnapshot.val().playerNum +"'>");
	const commentText = $("<p class='commentText'>")
		.html("<span class='playerName'>"+childSnapshot.val().playerName + ":</span> " + childSnapshot.val().comment);

	const commentTime = $("<div class='commentTime'>")
		.text(moment(childSnapshot.val().commentTime).format("h:mm a"));

	comment.append(commentText,commentTime);

	$("#chatHistory").append(comment);

	// Play sound
	if(game.hasStarted && childSnapshot.val().playerNum === 1){
		game.p1_comment_sound.play();
	}else if(game.hasStarted && childSnapshot.val().playerNum === 2){
		game.p2_comment_sound.play();
	}

	const chat = $("#chatHistory");
	// chat.scrollTop(chat.prop("scrollHeight"));
	chat.animate({ scrollTop: chat.prop("scrollHeight")}, 1000);

	// Remove the top most comment;
	if($("#chatHistory div").children().length > 10){
		$("#chatHistory div").eq(0).remove();
	}
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
			game.player.name = username;

			if(!playerOneExists){
				game.player.num = 1;
				database.ref("players/1").set({
					losses: 0,
					name: username,
					wins: 0
				});
				// hide form and display other things
				$("#joinForm").css('display', 'none');
				$("#playerInfo").text("Hi " + username + "! You are Player " + game.player.num);
				game.hasStarted = true;

				// game.updateNameTags(); --Remove
			}else if(playerOneExists && !playerTwoExists){
				game.player.num = 2;
				database.ref("players/2").set({
					losses: 0,
					name: username,
					wins: 0
				});

				$("#joinForm").css('display', 'none');
				$("#playerInfo").text("Hi " + username + "! You are Player " + game.player.num);
				game.hasStarted = true;
				// game.updateNameTags();  --Remove
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
				// Display Turn Info
				if(game.player.num === game.turn) {
					$("#turnInfo").text("It's Your Turn!");
				}else{
					$("#turnInfo").text("Waiting for " + snapshot.child("players/1").val().name + " to choose.");
				}
			}else if(!snapshot.child("players/1").exists() || !snapshot.child("players/2").exists()){
				// If a player doesn't exist, reset the turn to 0
				game.turn = 0;
				database.ref().update({
					turn: game.turn
				});
				$("#turnInfo").text('');
				$("#p1-info").addClass('hide');
				$("#p2-info").addClass('hide');	
			}

			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn === 1){
				// reveal Player 1's options only on player 1's screen -- Hide all others
				if(game.player.num === game.turn){
					$("#turnInfo").text("It's Your Turn!");
					$("#player-1 .btn").show();
					$("#p1-info").removeClass('hide');
					$("#p2-info").addClass('hide');	
				}else {
					$("#turnInfo").text("Waiting for " + snapshot.child("players/1").val().name + " to choose.");
					$("#p1-info").addClass('hide');
					$("#p2-info").addClass('hide');	
				}
			}

			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn === 2){
				if(game.player.num === game.turn) {
					$("#turnInfo").text("It's Your Turn!");
					$("#player-2 .btn").show();
					$("#p1-info").addClass('hide');
					$("#p2-info").removeClass('hide');	
				}else {
					$("#turnInfo").text("Waiting for " + snapshot.child("players/2").val().name + " to choose.");
					$("#p1-info").removeClass('hide');

					var choice = $("#player-1 .btn.active").attr('data-value');
					$("#player-1 .btn:not(."+ choice +")").hide();
					$("#p2-info").addClass('hide');
				}
			}

			if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.roundFinished){
				$("#p1-info").removeClass('hide');
				$("#p2-info").removeClass('hide');	

				var choice = $("#player-2 .btn.active").attr('data-value');
				$("#player-2 .btn:not(."+ choice +")").hide();
			}



			// // Check if both player 1 & player 2 exist
			// if(snapshot.child("players/1").exists() && snapshot.child("players/2").exists() && game.turn < 3){
			// 	game.readyPlayer(snapshot);
			// }else {
			// 	game.highlightPlayer(0);
			// }

			// Check to see who won the game
			if(snapshot.child("turn").val() === 3 && game.roundFinished === false && 
				snapshot.child("players/1/choice").exists() && 
				snapshot.child("players/2/choice").exists()){

				game.roundFinished = true;

				console.log("Check Winner: obtain player choices");
				var p1_choice = snapshot.child("players/1/choice").val();
				var p2_choice = snapshot.child("players/2/choice").val();
				var winner = 0;
				var loser = 0;

				console.log("Check Winner: compare choices and determine winner");
				console.log("P1 Choice: " + p1_choice + ", P2 Choice: " + p2_choice);
				if (p1_choice === "rock" && p2_choice === "scissors"){
					winner = 1;
					loser = 2;
				}else if (p1_choice === "rock" && p2_choice === "paper") {
					winner = 2;
					loser = 1;
				}else if (p1_choice === "rock" && p2_choice === "rock") {
					winner = 0;
					loser = 0;
				}else if (p1_choice === "paper" && p2_choice === "rock"){
					winner = 1;
					loser = 2;
				}else if (p1_choice === "paper" && p2_choice === "scissors"){
					winner = 2;
					loser = 1;
				}else if (p1_choice === "paper" && p2_choice === "paper"){
					winner = 0;
					loser = 0;
				}else if (p1_choice === "scissors" && p2_choice === "paper") {
					winner = 1;
					loser = 2;
				}else if (p1_choice === "scissors" && p2_choice === "rock") {
					winner = 2;
					loser = 1;
				}else if (p1_choice === "scissors" && p2_choice === "scissors") {
					winner = 0;
					loser = 0;
				}
				game.displayWinner(snapshot,winner,loser);

				console.log("Check Winner: reset after timeout");
				setTimeout(function(){
					game.resetGame(snapshot);
				}, game.roundReset);
			}

			// Ensure client-side turn property is in sync with DB
			if(snapshot.child("turn").exists()){
				database.ref("turn").on('value', function(snapshot) {
					game.turn = snapshot.val();
				});
			}

			// Ensure client-side Player 1 name is in sync with DB
			if(snapshot.child("players/1/name").exists()){
				database.ref("turn").on('value', function(snapshot) {
					var username = snapshot.val();
					game.player.name = username;
				});
			}

			// Ensure client-side Player 2 name is in sync with DB
			if(snapshot.child("players/2/name").exists()){
				database.ref("turn").on('value', function(snapshot) {
					var username = snapshot.val();
					game.player.name = username;
				});
			}
		
		});	
		// End database.ref().on('value')
		
		database.ref().on('child_removed', function(snapshot) {
			// console.log('a child has been removed');
			// game.displayJoinForm("show");
			// game.displayPlayerTurn("hide");
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
// Game Object
// ------------
var game = {
    turn: 0,
    hasStarted: false,
    hasSelectedChoice: false,
    roundFinished: false,
    roundReset: 5000,
    p1_comment_sound: new Audio('assets/audio/button-09.mp3'),
    p2_comment_sound: new Audio('assets/audio/button-11.mp3'),
    player: {
    	num: 0,
    	name: "",
    	choice: ""
    },

    // Hide the name input form & display the player's name and assigned number
    updateNameTags: function(){
    	const username = $("#inputName").val().trim();
		// game.displayJoinForm("hide");
		// game.displayPlayerTurn("show", game.player.num, username);
    	game.hasStarted = true;
    },

    // Hide/Show name input form
    displayJoinForm: function(display){
	    if(display === "show"){
			$("#joinForm").css('display', 'flex');
		}else if(display === "hide"){
			$("#joinForm").css('display', 'none');
		}	
    },

    // Display the player's name and player number
    displayPlayerTurn: function(display, playerNum, playerName){
    	if(display === "show"){
			// $("#playerTurn").css('display', 'block');
			$("#playerInfo").text("Hi " + playerName + "! You are Player " + playerNum);
		}else if(display === "hide"){
			// $("#playerTurn").css('display', 'none');
		}
    },

	// * update the 'status' to notify the user if it is their turn or 
	//   if they are waiting for the other player to move
    updateTurnInfo: function(display, playerNum, activePlayerNum, activePlayerName) {
    	if(display === "show"){
			// $("#turnInfo").css('display', 'block');

			if(playerNum === activePlayerNum) {
				$("#turnInfo").text("It's Your Turn!");
				// game.displayOptions("show", playerNum);
			}else{
				$("#turnInfo").text("Waiting for " + activePlayerName + " to choose.");
				// $("#p"+ activePlayerNum +"-info").addClass('hide');
				// game.displayOptions("hide", playerNum);
			}

		}else if (display === "hide"){
			// $("#turnInfo").css('display', 'none');
		}
    },

    // Displays all Options for the
    displayOptions: function(display, playerNum){
    	if(display === "show"){
			// $("#p"+ playerNum +"-info").removeClass('hide');
			// $("#p"+ (playerNum === 1) ? 2 : 1 +"-info").addClass('hide'); //TODO: this may be hiding the buttons unexpectently 
			// $(".rock, .paper, .scissors").show();
		}else {
			// $("#p"+ playerNum +"-info").addClass('hide'); //TODO: remove??
			// $("#p"+ (playerNum === 1) ? 2 : 1 +"-info").removeClass('hide');
			// $(".rock, .paper, .scissors").hide();
		}
    },

    // Reveals the chosen responses to both players (after a winner has been chosen)
    reveal: function(display){
    	if(display === "show"){
			// $("#p1-info, #p2-info").removeClass('hide');
		}else {
			// $("#p1-info, #p2-info").addClass('hide');
		}
    },

    // Highlight the selected player
    highlightPlayer: function(playerNum){
    	$(".player").removeClass('bg-warning')
		$("#player-" + playerNum).addClass('bg-warning');
    },

	// Update database to reflect player's choice for this round
    updatePlayerChoice: function(selectedOption){
    	(game.turn === 1) ? game.turn = 2 : game.turn = 3;

		game.hasSelectedChoice = true;

		game.player.choice = selectedOption;

		database.ref().update({
			turn: game.turn
		});
		database.ref("players/" + game.player.num).update({
			choice: selectedOption
		});
    },

    // Increment wins/losses and update the DOM with the winner
    displayWinner: function(snap, winner,loser){
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
		// game.reveal("show");
    },

    // Resets the game
    resetGame: function(snap){
    	game.hasSelectedChoice = false;
		$("#results").text('');
		game.roundFinished = false;
		database.ref().update({
			turn: 1
		});
		$("#player-1 .btn").removeClass('active');
		$("#player-2 .btn").removeClass('active');
  //   	game.displayPlayerTurn("hide");
		// game.updateTurnInfo("hide","","","");
		// game.readyPlayer(snap);
		// game.displayOptions("show", game.player.num);
		// $("#p2-info").addClass('hide');
		console.log('game has been reset');
    },

    readyPlayer: function(snap){
  //   	game.updateTurnInfo("show",game.player.num,game.turn,snap.child("players/" + game.turn).val().name);
		// game.highlightPlayer(game.turn);
    }
}

// game.displayPlayerTurn("hide");
// game.updateTurnInfo("hide","","","");

// ===========================
// ===== Event Handlers ======
// ===========================

$(".player .btn").on('click', function(event) {
	event.preventDefault();
	if(!game.hasSelectedChoice){
		var choice = $(this).attr('data-value');
		$(".player .btn").removeClass('active');
		$(this).addClass('active');
		game.updatePlayerChoice(choice);
		// $("#player-"+ game.player.num +" .btn:not(."+ choice +")").hide();
	}
});

$(".reset").on('click', function(event) {
	event.preventDefault();
	database.ref().remove();
	$("#chatHistory").empty();
	// game.displayJoinForm("show");
	// game.displayPlayerTurn("hide");
});