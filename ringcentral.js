var querystring = require('querystring')
var https = require('https')
var fs = require('fs')
require('dotenv').load()

if (process.env.ENVIRONMENT == "sandbox") {
  require('dotenv').config({path: "./environment/.env-sandbox"});
  var tokens_file = "tokens_sb.txt"
} else {
  require('dotenv').config({path: "./environment/.env-production"});
  var tokens_file = "tokens_pd.txt"
}

function RingCentral() {}
exports.RingCentral = RingCentral

RingCentral.prototype = {
    authenticate: function(callback) {
        var endpoint = '/restapi/oauth/token'
        var url = process.env.RC_SERVER_URL
        var basic = process.env.RC_CLIENT_ID + ":" + process.env.RC_CLIENT_SECRET;
        var headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(basic).toString('base64')
            };
        var body = querystring.stringify({
              'grant_type' : 'password',
              'username' : encodeURIComponent(process.env.RC_USERNAME),
              'password' : process.env.RC_PASSWORD
            });
        var options = {host: url, path: endpoint, method: 'POST', headers: headers};

        if (fs.existsSync(tokens_file)) {
          var saved_tokens = fs.readFileSync(tokens_file, 'utf8');
          var tokensObj = JSON.parse(saved_tokens)
          var date = new Date()
          var expire_time = (date.getTime() / 1000) - tokensObj.timestamp
          if (expire_time < tokensObj.tokens.expires_in){
            console.log("access token is still valid")
            return (callback == null) ? tokensObj.tokens.access_token : callback(null, tokensObj.tokens.access_token)
          }else{
            if (expire_time < tokensObj.tokens.refresh_token_expires_in){
              console.log("refresh_token not expired")
              body = querystring.stringify({
                  'grant_type' : 'refresh_token',
                  'refresh_token' : tokensObj.tokens.refresh_token
              });
            }
          }
        }

        var post_req = https.request(options, function(res) {
            var response = ""
            res.on('data', function (chunk) {
                response += chunk
            }).on("end", function(){
                if (res.statusCode == 200){
                    var jsonObj = JSON.parse(response)
                    var timestamp = new Date().getTime()
                    var tokensObj = {
                      'tokens' : jsonObj,
                      'timestamp' : timestamp / 1000
                    }
                    fs.writeFile(tokens_file, JSON.stringify(tokensObj), function(err) {
                      if(err)
                          console.log(err);
                    })
                    return (callback == null) ? jsonObj.access_token : callback(null, jsonObj.access_token)
                }else{
                    return (callback == null) ? response : callback(response, null)
                }
            });
        }).on('error', function (e) {
            return (callback == null) ? e : callback(e, null)
        });
        post_req.write(body);
        post_req.end();
    },
    get: function(endpoint, params=null, callback=null) {
        this.authenticate(function(err, access_token){
            if (!err) {
              var url = process.env.RC_SERVER_URL

              if (params != null)
                  endpoint += "?" + querystring.stringify(params)

              var headers = {
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ' + access_token
                  }

              var options = {host: url, path: endpoint, method: 'GET', headers: headers};

              var get_req = https.get(options, function(res) {
                    var response = ""
                    res.on('data', function (chunk) {
                        response += chunk
                    }).on("end", function(){
                        if (res.statusCode == 200)
                            return (callback == null) ? response : callback(null, response)
                        else
                            return (callback == null) ? response : callback(response, null)
                    });
                }).on('error', function(e) {
                    return (callback == null) ? e : callback(e, null)
                });
            }else
                return (callback == null) ? err : callback(err, null)
        })
    },
    post: function(endpoint, params=null, callback=null) {
        this.authenticate(function(err, access_token){
            if (!err) {
                var url = process.env.RC_SERVER_URL

                var body = ""
                if (params != null){
                    body = JSON.stringify(params)
                }

                var headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + access_token
                    }

                var options = {host: url, path: endpoint, method: 'POST', headers: headers};

                var post_req = https.request(options, function(res) {
                    var response = ""
                    res.on('data', function (chunk) {
                          response += chunk
                    }).on("end", function(){
                        if (res.statusCode == 200)
                            return (callback == null) ? response : callback(null, response)
                        else
                            return (callback == null) ? response : callback(response, null)
                    });
                  }).on('error', function (e) {
                      return (callback == null) ? e : callback(e, null)
                  })
                  if (body != "")
                      post_req.write(body);
                  post_req.end();
            }else
                return (callback == null) ? err : callback(err, null)
        })
    }
}
