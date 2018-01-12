var https                   = require('https');
var url                     = require('url');
var slackHookRequestOptions = getSlackHookRequestOptions();
module.exports.sendToSlack  = sendToSlack;

function getSlackHookRequestOptions()
{
    var hookUri     =   url.parse(process.env.slackhookuri);
    return {
        host:       hookUri.hostname,
        port:       hookUri.port,
        path:       hookUri.path,
        method:     'POST',
        headers:    { 'Content-Type': 'application/json' }
    };
}

function sendToSlack(parsedRequest, callback)
{
        if (!parsedRequest || (parsedRequest.body||'').trim()=='') {
            callback(true);
            return;
        }

        var error           = false;
        parsedRequest.body  = trParseBody(parsedRequest.body);
        console.log(parsedRequest.body);
        var slackMessage    = convertToSlackMessage(parsedRequest.body, parsedRequest.channel);
        console.log(slackMessage);

        var req             = https.request(slackHookRequestOptions);

        req.on('error', function(e) {
            console.error(e);
            error = true;
        });

        req.on('close', function() { callback(error); } );

        req.write(JSON.stringify(slackMessage));
        req.end();
}

function convertToSlackMessage(parsedBody, channel)
{
    var success     = (parsedBody.status=='success' && parsedBody.complete);
    return {
        username:   getSlackUserName(parsedBody, success),
        icon_emoji: success ? ':sun_small_cloud:' : ':rain_cloud:',
        text:       getSlackText(parsedBody),
        channel:    channel || process.env.slackchannel
    };
}

function trParseBody(body)
{
    try
    {
        return JSON.parse(body) || {
            status: 'failed',
            complete: false
        };
    } catch(err) {
        console.error(err);
        return {
            status: err,
            complete: false
        };
    }
}

function getSlackUserName(parsedBody, success)
{
    return (
        (success ? 'Published:': 'Failed:') +
        ' ' +
        (parsedBody.siteName || 'unknown')
    );
}

function getSlackText(parsedBody)
{
    var hostName = parsedBody.hostName
    var id = parsedBody.id
    return (
        'Initiated by: ' +
        (parsedBody.author || 'unknown') +
        ' ' +
        (parsedBody.endTime || '') +
        '\r\n' +
        (hostName ? '<https://' + hostName + '|' + hostName + '> ' : '') +
        (id ? 'Id: ' + parsedBody.id + '\r\n' : '') +
        '```' +
        (parsedBody.message || 'null message') +
        '```'
    );
}