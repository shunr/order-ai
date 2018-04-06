'use strict';

const sipster = require('sipster');
const fs = require('fs');
const uuid = require('uuid/v4');

const nlp = require('./nlp');
const setup = require('./setup');
const dfintent = require('./dfintent');
const sip = require('./sip');
const server = require('./server');

const timeout = ms => new Promise(res => setTimeout(res, ms));

let mod = module.exports = {};

mod.init = () => {
  setup.initEntities();
  sip.init(listen);
}

const prompts = {
  [dfintent.error.NO_INTENT]: 'I didn\'t get that.',
  [dfintent.error.API_ERR]: 'Sorry, there was an error, please repeat that.',
  [dfintent.error.UNKNOWN]: 'Sorry, could you repeat that order?',
  [dfintent.error.NO_ADDRESS]: 'Sorry I didn\'t get your address?.',
  [dfintent.error.NO_TYPE]: 'Pickup or delivery?'
};

function listen(info, call) {
  console.log('=== Incoming call from ' + info.remoteContact);
  console.log(info);
  let filename = '/tmp/' + uuid() + '.wav';
  let orderType, address = null;

  call.on('media', async (medias) => {
    const stream = medias[0];
    let items = {};

    await sendTTS('Welcome to Restaurant Name! Would you like to order for pickup or delivery?', stream);
    orderType = (await getResponse(dfintent.error.NO_TYPE, filename, stream, dfintent.intents.START))[1];
    console.log(orderType);
    if (orderType == 'delivery') {
      while (true) {
        await sendTTS('Can I get your address?', stream);
        address = (await getResponse(dfintent.error.NO_ADDRESS, filename, stream, dfintent.intents.ADDRESS))[1];
        await sendTTS('Your address is ' + address + ', is that correct?', stream);
        let confirm = (await getResponse(null, filename, stream, dfintent.intents.CONFIRM))[1];
        if (confirm) {
          break;
        }
      }
    }
    
    await sendTTS('What would you like to order?', stream);
    
    while (true) {
      let [intent, delta] = await getResponse(dfintent.error.UNKNOWN, filename, stream, dfintent.intents.NEW, dfintent.intents.REMOVE);
      if (intent == dfintent.intents.NEW) {
        await sendTTS('You want to add ' + nlp.orderToString(delta) + ', is that correct?', stream);
        let confirm = (await getResponse(null, filename, stream, dfintent.intents.CONFIRM))[1];
        if (!confirm) {
          await sendTTS('Okay! What would you like instead?', stream);
          continue;
        }
        for (let i = 0; i < delta.length; i++) {
          if (items[delta[i].name] != null) {
            items[delta[i].name] += delta[i].amount;
          } else {
            items[delta[i].name] = delta[i].amount;
          }
        }
      } else if (intent == dfintent.intents.REMOVE) {
        let found = {};
        let removed = [];
        for (let i = 0; i < delta.length; i++) {
          if (items[delta[i].name] != null) {
            items[delta[i].name] -= delta[i].amount;
            if (items[delta[i].name] <= 0) delete items[delta[i].name];
            removed.push(delta[i]);
          }
        }
        if (removed.length > 0) {
          await sendTTS('Removing ' + nlp.orderToString(removed), stream);
        } else {
          await sendTTS('Your order doesn\'t contain the items you wanted to remove.', stream);
        }
      }
      
      await sendTTS('Your order is now' + nlp.orderToString(formatItems(items)) + '. Is that all?', stream);
      let more = (await getResponse(null, filename, stream, dfintent.intents.CONFIRM))[1];
      if (more) {
        break;
      } else {
        await sendTTS('Sure! What else would you like?', stream);
      }
    }
    
    let order = {
      items: formatItems(items),
      contact: info.remoteContact,
      total: 0,
      type: orderType,
      address: address
    }
    
    console.log(order);
    server.broadcast(order);
    await sendTTS('Great! Order will be ready in 10 minutes. Goodbye!', stream);
    await timeout(1000);
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

function getResponse(prompt, callFile, stream, ...intents) {
  let p = new Promise(async (resolve) => {
    let response = null;
    let parameters, intent = null;
    while (response == null) {
      let recorder = sipster.createRecorder(callFile);
      let error = null;
      stream.startTransmitTo(recorder);
      try {
        [intent, parameters] = await nlp.analyzeSpeech(callFile);
        console.log(intent, intents);
        if (intents.includes(intent)) {
          [error, response] = dfintent.parsers[intent](parameters);
        } else {
          response = null;
          error = dfintent.error.UNKNOWN;
        }
      } catch (err) {
        console.error(err);
        error = err;
      }
      stream.stopTransmitTo(recorder);
      recorder.close();
      if (error != null) {
        console.log(error);
        response = null;
        if (!prompt) {
          await sendTTS(prompts[dfintent.error.NO_INTENT], stream);
        } else if (error != dfintent.error.SILENCE) {
          await sendTTS(prompts[prompt], stream);
        }
      }
    }
    resolve([intent, response]);
  });
  return p;
}

function sendTTS(text, stream) {
  let p = new Promise(async (resolve) => {
    let filename = await nlp.tts(text);
    if (filename) {
      sendAudio(filename, stream, resolve);
    }
  });
  return p;
}

function formatItems(items) {
  let output = [];
  for (let key in items) {
    output.push({
      name: key,
      amount: items[key]
    });
  }
  return output;
}

async function deleteFile(filename) {
  fs.unlinkSync(filename);
}

function sendAudio(filename, stream, callback) {
  if (filename == null) return;
  let player = sipster.createPlayer(filename, true);
  player.startTransmitTo(stream);
  player.on('eof', () => {
    callback();
    deleteFile(filename);
  });
}