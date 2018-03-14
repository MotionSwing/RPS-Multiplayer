// Initialize Firebase
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

firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  // ...
});

var player = {
	num: 0,
	name: null,
	wins: 0,
	losses: 0,
	choice: null
};

var playerOneIsChosen = false;
var playerTwoIsChosen = false;
var playerOne;
var playerTwo;
var currentTurn = 0;

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    // User is signed in.
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;

	// initial load and subsequent value changes
	database.ref().on('value', function(snapshot) {

		// Display Player 1 name if the player has been chosen
		if(snapshot.child("players/1").exists()){
			playerOneIsChosen = true;
			playerOne = snapshot.child("players/1").val().name;
			const name = snapshot.child("players/1").val().name;
			const losses = snapshot.child("players/1").val().losses;
			const wins = snapshot.child("players/1").val().wins;
			$(".player-1 .player-name").text(name);
			$(".player-1 .wins-losses").text("Wins " + wins + " Losses " + losses);

			database.ref("players/" + player.num).onDisconnect().remove(function(){
				console.log('Player ' + player.num + " logged off");
				database.ref("players/turn").remove();
				showNameInput();
			});
		}else {
			$(".player-1 .player-name").text("Waiting for Player 1");
			playerOneIsChosen = false;
		}

		// Display Player 2 name if the player has been chosen
		if(snapshot.child("players/2").exists()){
			playerTwoIsChosen = true;
			playerTwo = snapshot.child("players/2").val().name;
			const name = snapshot.child("players/2").val().name;
			const losses = snapshot.child("players/2").val().losses;
			const wins = snapshot.child("players/2").val().wins;
			$(".player-2 .player-name").text(name);
			$(".player-2 .wins-losses").text("Wins " + wins + " Losses " + losses);
			$("#p"+ player.num +"-info").removeClass('hide');

			database.ref("players/" + player.num).onDisconnect().remove(function(){
				console.log('Player ' + player.num + " logged off");
				database.ref("players/turn").remove();
				showNameInput();
			});

		}else {
			$(".player-2 .player-name").text("Waiting for Player 2");
			playerTwoIsChosen = false;
		}

		// get the current turn
		if(snapshot.child("players/turn").exists()){
			currentTurn = snapshot.child("players").val().turn;

			if(currentTurn > 0){
				$("#playerAndStatusInfo").empty();
				displayWhosTurn(currentTurn);
			}
		}

		// Check for the winner
		if(snapshot.child("players/1/choice").exists() 
			&& snapshot.child("players/2/choice").exists() && currentTurn === 3){
			// Get Player 1 info
			console.log("performing check");
			const p1_choice = snapshot.child("players/1").val().choice;
			let p1_wins = snapshot.child("players/1").val().wins;
			let p1_losses = snapshot.child("players/1").val().losses;
			// Get Player 2 info
			const p2_choice = snapshot.child("players/2").val().choice;
			let p2_wins = snapshot.child("players/2").val().wins;
			let p2_losses = snapshot.child("players/2").val().losses;

			// Reset the turn back to 1
			database.ref("players").update({
				turn: 1
			});

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

			$("#winner").text(snapshot.child("players/" + winner).val().name + " Wins!!");
		};
	});

	// ==============================
	// ======= CHAT =================
	// ==============================
	database.ref("chat").on('child_added', function(snapshot) {
		var comment = $("<div class='comment'>");
		var commentText = $("<p class='commentText'>").text(snapshot.val().player + ": " + snapshot.val().comment);
		var commentDateTime = $("<div class='commentDateTime'>");
		var commentDate = $("<div class='commentDate'>").text(moment(snapshot.val().commentDate).format("MMM DD YYYY"));
		var commentTime = $("<div class='commentTime'>").text(moment(snapshot.val().commentDate).format("HH:mm:ss"));
		commentDateTime.append(commentDate, commentTime);
		comment.append(commentText,commentDateTime);

		$("#chatHistory").append(comment);
	});


	// Set the name(s) of the players
	$("#submitName").on('click', function(event) {
		event.preventDefault();
		if(!playerOneIsChosen){
			player.name = $("#inputName").val().trim();
			player.num = 1;
			database.ref("players/1").set({
				losses: 0,
				name: player.name,
				wins: 0
			});
			showStatusInfo(1);
		}else if (!playerTwoIsChosen){
			player.name = $("#inputName").val().trim();
			player.num = 2;
			database.ref("players/2").set({
				losses: 0,
				name: player.name,
				wins: 0
			});
			database.ref("players").update({
				turn: 1
			});
			showStatusInfo(2);
		}
	});

	// Update the player's choice in the DB
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

	$("#chatSendBtn").on('click', function(event) {
		event.preventDefault();

		// Get comment and push to the database
		var chatComment = $("#chatInput").val().trim();
		if(chatComment.length > 0){
			$("#chatInput").val('');
			database.ref("chat").push({
				player: player.name,
				comment: chatComment,
				commentDate: firebase.database.ServerValue.TIMESTAMP
			});
		}
	});

	function updatePlayerChoice(selectedOption){
		currentTurn++;
		database.ref("players").update({
			turn: currentTurn
		});
		database.ref("players/" + player.num).update({
			choice: selectedOption
		});
	}

  } else {
    // User is signed out.
    // ...
  }
});

function showNameInput(){
	var name_form = $("<form class='form-inline'>")
	var name_textbox = $("<input>");
	name_textbox.attr({
		type: "text",
		class: "form-control",
		id: "inputName",
		placeholder: "Name"
	});
	var name_wrapper = $("<div class='form-group mx-sm-3 mb-2'>");
	name_wrapper.append(name_textbox);
	var name_btn = $("<button>").text("Start");
		name_btn.attr({
			id: "submitName",
			type: "submit",
			class: "btn btn-primary mb-2"
		});
	name_form.append(name_wrapper, name_btn);
	$("#playerAndStatusInfo").empty().append(name_form);
	$("#playerAndStatusInfo").removeClass().addClass('row justify-content-md-center');
};

function showStatusInfo(playerNum){
	$("#playerAndStatusInfo").removeClass().addClass('d-flex flex-column');
	if(playerNum === 1){
		var playerInfo = $("<p class='mx-auto'>").text("Hi " + player.name + "! You are Player 1");
		$("#playerAndStatusInfo").empty().append(playerInfo);
	}else if(playerNum === 2){
		var playerInfo = $("<p class='mx-auto'>").text("Hi " + player.name + "! You are Player 2");
		$("#playerAndStatusInfo").empty().append(playerInfo);
	}
};

function displayWhosTurn(turnNum) {
	var turnStatus = $("<p class='mx-auto'>");
	$("#playerAndStatusInfo p:gt(0)").remove();
	if(turnNum === 1){
		if(player.num === 1){
			turnStatus.text("It's Your Turn!");
		}else {
			turnStatus.text("Waiting on " + playerOne + " to choose");
		}
		$("#playerAndStatusInfo").append(turnStatus);
	}else if(turnNum === 2){
		if(player.num === 1){
			turnStatus.text("Waiting on " + playerTwo + " to choose");
		}else {
			turnStatus.text("It's Your Turn!");
		}
		$("#playerAndStatusInfo").append(turnStatus);
	}
};