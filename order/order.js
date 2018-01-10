'use strict';

const speech = require('@google-cloud/speech');
const record = require('node-record-lpcm16');

const nlp = require('./nlp');
const setup = require('./setup');
const menu = require('./menu_parser');
const sip = require('./sip');

const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
    maxAlternatives: 1,
    speechContexts: [menu.generateSpeechContext()],
  },
  interimResults: false
};

const recordConfig = {
  sampleRateHertz: 16000,
  threshold: 0.2,
  // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
  verbose: false,
  recordProgram: 'rec',
  silence: '5.0'
};

let mod = module.exports = {};

let recordingTimeout;

mod.createSpeechStream = () => {
  let stream = speech.streamingRecognize(request)
    .on('error', console.error)
    .on('finish', function () {
      console.log("Finish speech stream");
    })
    .on('data', function (data) {
      if (data.results[0] && data.results[0].alternatives[0]) {
        console.log(data.results[0].alternatives[0].transcript);
        nlp.processText(data.results[0].alternatives[0].transcript);
      } else {
        record.stop();
      }
    });
  return stream;
}

mod.init = () => {
  //setup.initEntities();
  //recordSegment();
  //sip.init();
  console.log('Listening, press Ctrl+C to stop.');
}

function recordSegment() {
  record.start(recordConfig)
    .on('error', console.error)
    .on('finish', function () {
      console.log('Done recording');
      clearTimeout(recordingTimeout);
    }).pipe(createSpeechStream());
  clearTimeout(recordingTimeout);
  recordingTimeout = setTimeout(function () {
    record.stop();
  }, 60 * 1000);
}