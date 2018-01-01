'use strict';

const apiai = require('apiai')('a6264810a4e44159ad5c15f92f5fd22e');
const uuid = require('uuid/v4');

let mod = module.exports = {};

mod.processText = (message) => {
    let sessionId = uuid();
    let request = apiai.textRequest(message, {
        sessionId: sessionId
    });
    request.on('response', function(response) {
        if (response.result) {
            console.log(response.result);
        }
    });
    request.on('error', function(error) {
        console.log(error);
    });
    request.end();
}

