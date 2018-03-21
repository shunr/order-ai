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

mod.analyzeSpeech = (filename) => {
  let p = new Promise((resolve, reject) => {
    const detectStream = sessionClient
      .streamingDetectIntent()
      .on('error', (err) => {
        detectStream.destroy();
        reject(err);
      })
      .on('data', (data) => {
        if (data.queryResult) {
          console.log(data.queryResult.queryText);
          console.log(data.queryResult.parameters);
          detectStream.destroy();
          if (data.queryResult.intent) {
            resolve(data.queryResult.parameters);
          } else {
            reject();
          }
        }
      });
    detectStream.write(initialStreamRequest);
    pump(ts.createReadStream(filename, {
        beginAt: 0,
        detectTruncate: true,
        onTruncate: 'end',
        endOnError: true
      }),
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
    exec('espeak "' + sentence + '" -w ' + filename).then(() => {
      resolve(filename);
    }).catch((err) => {
      console.error(err);
      resolve(null);
    });
  });
  return p;
};