'use strict';

const sipster = require('sipster');
const fs = require('fs');
const uuid = require('uuid/v4');

const nlp = require('./nlp');
const setup = require('./setup');
const sip = require('./sip');
const server = require('./server');

const timeout = ms => new Promise(res => setTimeout(res, ms));

let mod = module.exports = {};

mod.init = () => {
  setup.initEntities();
  sip.init(listen);
  console.log('Listening, press Ctrl+C to stop.');
}

function listen(info, call) {
  console.log('=== Incoming call from ' + info.remoteContact);
  let filename = '/tmp/' + uuid() + '.wav';
  
  call.on('media', async (medias) => {
    const stream = medias[0];
    let items = [];
    sendTTS('May I take your order?', stream);
    while (true) {
      let add = await getResponse(parseOrder, filename, stream);
      sendTTS('You want' + nlp.orderToString(add) + ', is that correct?', stream);
      await timeout(3000);
      let confirm = await getResponse(parseConfirmation, filename, stream);
      if (!confirm) {
        sendTTS('Ok! What would you like instead?', stream);
        continue;
      }
      items.push(...add);
      sendTTS('Your order is now' + nlp.orderToString(items) + '. Anything else?', stream);
      await timeout(3000);
      let more = await getResponse(parseConfirmation, filename, stream);
      if (!more) {
        break;
      } else {
        sendTTS('Sure! What will it be?', stream);
      }
    }
    sendTTS('Great! Order will be ready in 10 minutes. Goodbye!', stream);
    let order = {
      items: items,
      contact: info.remoteContact
    }
    console.log(order);
    server.broadcast(order);
    await timeout(5000);
    call.hangup();
  });
  
  call.on('state', (state) => {
    if (state == 'disconnected') {
      console.log('Call finished');
      deleteFile(filename);
    }
  });
  call.answer();
}

function getResponse(parser, callFile, stream) {
  let p = new Promise(async (resolve) => {
    let response = null;
    while (response == null) {
      let recorder = sipster.createRecorder(callFile);
      stream.startTransmitTo(recorder);
      try {
        let parameters = await nlp.analyzeSpeech(callFile);
        response = parser(parameters);
      } catch (e) {
        console.error(e);
      }
      stream.stopTransmitTo(recorder);
      recorder.close();
      if (response == null) {
        sendTTS('I didn\'t get that', stream);
        await timeout(1000);
      }
    }
    resolve(response);
  });
  return p;
}

function parseOrder(parameters) {
  let order = [];
  try {
    let values = parameters.fields.orderItem.listValue.values;
    for (let i = 0; i < values.length; i++) {
      let fields = values[i].structValue.fields;
      let item = {
        name: fields.menu_item.stringValue,
        amount: (fields.amount != null) ? fields.amount.numberValue : 1
      };
      order.push(item);
    }
  } catch (error) {
    console.error('Could not parse order');
  }
  console.log(order);
  return (order.length > 0) ? order : null;
}

function parseConfirmation(parameters) {
  let confirmed = false;
  try {
    confirmed = parameters.fields.confirmation.stringValue == 'yes';
  } catch (error) {
    console.error('Could not parse confirmation');
  }
  return confirmed;
}

async function sendTTS(text, stream) {
  let filename = await nlp.tts(text);
  if (filename) {
    sendAudio(filename, stream);
    deleteFile(filename);
  }
}

async function deleteFile(filename) {
  await timeout(10000);
  fs.unlinkSync(filename);
}

function sendAudio(filename, stream) {
  if (filename == null) return;
  let player = sipster.createPlayer(filename, true);
  player.startTransmitTo(stream);
}