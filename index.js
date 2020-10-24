const Twit = require('twit');
const QRCode = require('qrcode');

require('dotenv').config();


console.log("QRCode Generator Bot is running!");

//Configure a Twit instace
const Bot = new Twit({
  consumer_key:         process.env.APIKEY,
  consumer_secret:      process.env.API_SECRET_KEY,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,
})


// Inicialize a Stream and define a 'track'
const track = ''; // String to 'match' with public tweets
const stream = Bot.stream('statuses/filter', { track });


// Where the event 'tweet' happens call 'tweetEvent' 
stream.on('tweet', tweetEvent);

function tweetEvent(tweet) {

	// Get the requisition data
	const id = tweet.id_str;
	const imageTweetId = tweet.in_reply_to_status_id_str;
	const username = tweet.user.screen_name;

	// Get the tweet above and calls the function 'getImage'
	Bot.get('statuses/show', { id: imageTweetId }, getImage);

	function getImage(err, data, response) {
		if(err !== undefined) {
			return handleError(err);
		}

		// Vefiry if have or not media data in tweet
		try {
			const entities = data.entities;
			const { media } = entities;
			if(media === undefined) {
				const reply = '@' + username + ' I need an image/video to work';
				Bot.post('statuses/update', {
					status: reply,
					in_reply_to_status_id: id,
				}, tweeted);
			}else if(media.length > 0){
				const mediaUrl = media[0].media_url
				generateQRcode(mediaUrl);
			}
		} catch(err) {
			return handleError(err);
		}
		
	}

	function generateQRcode(url) {

		const opts = {
 			width: 400,
		};

		QRCode.toDataURL(url, opts)
		  	.then(url => {
		  		b64 = url.split(',')[1];
				processing(b64);	  
		  	})
		  	.catch(err => handleError(err));
	}

	// Upload image to twitter
	function processing(b64) {
		Bot.post('media/upload', {
			media_data: b64
		}, uploaded);

		// Post QRCode reply
		function uploaded(err, data, response) {
			const mediaId = data.media_id_string;
			const params = {
				status: "----- @" + username + " Successfully generated QRCode! -----",
				in_reply_to_status_id: id,
				media_ids: [mediaId]
			}

			Bot.post('statuses/update', params, tweeted);
		}
	}
}

function tweeted(err, success) {
	if(err !== undefined) {
		handleError(err);
	}else {
		console.log('Tweeted ' + success.text);
	}
};


function handleError(err) {
	console.log("Something wrong happened: " + err);
};