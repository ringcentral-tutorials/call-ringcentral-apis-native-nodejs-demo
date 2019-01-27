const ringcentral = require('./ringcentral')

var rc = new ringcentral.RingCentral()

function get_account_extension(){
    var endpoint = "/restapi/v1.0/account/~/extension";
    params = {'status':'Enabled'}
    rc.get(endpoint, params, function(err, response){
        if (err)
            console.log(err)
        else {
            var jsonObj = JSON.parse(response)
            console.log(jsonObj)
        }
    })
}

function send_sms(recipientNumber, message){
    var endpoint = "/restapi/v1.0/account/~/extension/~/sms";
    var params = {
          'from': { 'phoneNumber' : process.env.RC_USERNAME },
          'to' :[{ 'phoneNumber': recipientNumber }],
          'text': message
          }

    rc.post(endpoint, params, function(err, response){
        if (err){
            console.log(err)
        }else {
            var jsonObj = JSON.parse(response)
            console.log(jsonObj)
        }
    })
}

get_account_extension()
send_sms('recipientNumber', "Hello World!")
