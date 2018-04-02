'use strict';

const dialogflow = require('dialogflow');
const common = require('@google-cloud/common');
const uuid = require('uuid/v4');
const fs = require('fs');
const exec = require('child-process-promise').exec;
const through2 = require('through2');
const ts = require('tail-stream');
const pump = require('pump');

const menu = require('./menu_parser');

const sessionClient = new dialogflow.SessionsClient();
const sessionPath = sessionClient.sessionPath('order-ai', uuid());

const audioConfig = {
  audioEncoding: 'AUDIO_ENCODING_MULAW',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  maxAlternatives: 1,
  phraseHints: menu.generateSpeechContext(),
};

const initialStreamRequest = {
  session: sessionPath,
  queryInput: {
    audioConfig: audioConfig
  },
  singleUtterance: true,
  interimResults: false
};

let mod = module.exports = {};

mod.error = {
  SILENCE: 'silence',
  NO_INTENT: 'no_intent',
  API_ERR: 'api_err'
};

mod.analyzeSpeech = (filename) => {
  let p = new Promise((resolve, reject) => {
    const detectStream = sessionClient.streamingDetectIntent();
    detectStream.on('error', (err) => {
      if (detectStream.writable) {
        detectStream.destroy();
        console.log(err);
        reject(mod.error.API_ERR);
      }
    });
    detectStream.on('data', (data) => {
      if (data.queryResult) {
        console.log(data.queryResult.queryText);
        console.log(data.queryResult.parameters);
        detectStream.destroy();
        if (data.queryResult.intent) {
          resolve([data.queryResult.intent.displayName, data.queryResult.parameters]);
        } else {
          let err;
          if (!data.queryResult.queryText) {
            err = mod.error.SILENCE;
          } else {
            err = mod.error.NO_INTENT;
          }
          reject(err);
        }
      }
    });
    let tstream = ts.createReadStream(filename, {
      beginAt: 0,
      detectTruncate: true,
      onTruncate: 'end',
      endOnError: true
    });
    detectStream.write(initialStreamRequest);
    pump(tstream,
      through2.obj((obj, _, next) => {
        next(null, {
          inputAudio: obj
        });
      }),
      detectStream);
  });
  return p;
}

mod.orderToString = (order) => {
  let sentence = '';
  for (let i = 0; i < order.length; i++) {
    let item = order[i];
    sentence += ' ' + item.amount + ' ' + item.name;
    if (order.length > 1 && i == order.length - 2) {
      sentence += ' and';
    }
  }
  return sentence;
};

mod.tts = (sentence) => {
  let filename = '/tmp/' + uuid() + '.wav';
  let p = new Promise((resolve) => {
    exec('./tts/mimic -t "' + sentence + '" -voice tts/ljm -o "' + filename + '"').then(() => {
      resolve(filename);
    }).catch((err) => {
      console.error(err);
      resolve(null);
    });
  });
  return p;
};