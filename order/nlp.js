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
  //encoding: 'MULAW',
  sampleRateHertz: 16000,
  languageCode: 'en-US',
  maxAlternatives: 1,
  speechContexts: [menu.generateSpeechContext()],
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
      .on('error', reject)
      .on('data', data => {
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
    pump(ts.createReadStream(filename),
      through2.obj((obj, _, next) => {
        next(null, {
          inputAudio: obj
        });
      }),
      detectStream);
  });
  return p;
}

function tts(order) {
  let filename = '/tmp/test.wav';
  let sentence = 'You ordered';
  for (let i = 0; i < order.order_item.length; i++) {
    let item = order.order_item[i];
    if ('amount' in item) {
      sentence += ' ' + item.amount + ' ' + item.menu_item;
    } else {
      sentence += ' 1 ' + item.menu_item;
    }
  }
  let p = new Promise((resolve, reject) => {
    exec('espeak -w ' + filename + ' "' + sentence + '"').then(() => {
      console.log(filename);
      resolve(filename);
    }).catch((err) => {
      console.log(err);
    });
  });
  return p;
}