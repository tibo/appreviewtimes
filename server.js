var app = require('express')();
var http = require('http').Server(app);
require('newrelic');

if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);

	redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
} 
redis.on("error", function (err) {
    console.log("Error " + err);
});

app.get('/', function(req, res){
	var request = require('request');
	request('http://appreviewtimes.com/', function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var cheerio = require('cheerio');
			var data = cheerio.load(body);

			var plateform = req.query['text'];

			if (!plateform)
			{
				plateform = 'ios';
			}

			redis.get(plateform, function (err, result) {
				var value;

				if (result) {
					value = result
				}
				else {

					console.log("nothing in cache");

					var tag = data('.cta > .' + plateform);

					if (!tag)
					{
						res.send("data not found");
						return;
					}

					var raw_data = tag.text();

					var regex = "[-?0-9]+";
					var results = raw_data.match(regex);

					if (!results || results.length < 1)
					{
						res.send("number not found");
						return;
					}

					value = results[0];

					redis.set(plateform, value, redis.print);
					redis.expire(plateform, 60*60*2);
				}

				res.send(plateform + " apps are currently reviewed in " + value + " days");

			});
		}
		else {
		  res.send("error");
		}
	});
	
});

http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});