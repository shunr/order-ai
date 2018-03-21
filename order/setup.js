'use strict';

const request = require('request');
const menu = require('./menu_parser');
const credentials = require('../credentials/credentials.json');

const APIAI_ENDPOINT = 'https://api.api.ai/v1';

let mod = module.exports = {};

const auth = {
    authorization: 'Bearer' + credentials.apiaiDeveloperToken,
    'Content-Type': 'application/json'
};

mod.initEntities = (message) => {
    request.put({
        url: APIAI_ENDPOINT + '/entities',
        json: menu.generateEntities(),
        headers: auth
    }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            console.log("Initialized entities!");
        } else {
            console.log(body);
        }
    });
}