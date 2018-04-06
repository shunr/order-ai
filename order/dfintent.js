'use strict';

const sipster = require('sipster');
const fs = require('fs');

let mod = module.exports = {};

const intents = {
  NEW: 'order.new',
  REMOVE: 'order.remove',
  CONFIRM: 'order.confirm',
  START: 'order.start',
  ADDRESS: 'order.address'
};

const errors = {
  SILENCE: 'silence',
  NO_INTENT: 'no_intent',
  API_ERR: 'api_err',
  UNKNOWN: 'unknown',
  NO_ADDRESS: 'no_address',
  NO_TYPE: 'no_type'
};

let parsers = {
  [intents.NEW]: parseOrder,
  [intents.REMOVE]: parseOrder,
  [intents.CONFIRM]: parseConfirmation,
  [intents.START]: parseStart,
  [intents.ADDRESS]: parseAddress
};

function parseOrder(parameters) {
  let order = [];
  let error = null;
  try {
    let values = parameters.fields.orderItem.listValue.values;
    for (let i = 0; i < values.length; i++) {
      let fields = values[i].structValue.fields;
      if (!fields.menu_item) continue;
      let item = {
        name: fields.menu_item.stringValue,
        amount: (fields.amount != null) ? fields.amount.numberValue : 1
      };
      order.push(item);
    }
  } catch (err) {
    error = errors.UNKNOWN;
    console.log(err)
    console.error('Could not parse order');
  }
  console.log(order);
  return [error, order];
}

function parseConfirmation(parameters) {
  let confirmed = false;
  let error = null;
  try {
    confirmed = (parameters.fields.confirmation.stringValue == 'yes');
  } catch (err) {
    console.error('Could not parse confirmation');
    confirmed = null;
    error = errors.UNKNOWN;
  }
  return [error, confirmed];
}

function parseStart(parameters) {
  let type, error = null;
  try {
    type = parameters.fields.orderType.stringValue;
  } catch (err) {
    type = null;
    error = errors.NO_TYPE;
  }
  return [error, type];
}

function parseAddress(parameters) {
  let address, error = null;
  try {
    address = parameters.fields.address.stringValue;
  } catch (err) {
    address = null;
    error = errors.NO_ADDRESS;
  }
  return [error, address];
}

mod.intents = intents;
mod.error = errors;
mod.parsers = parsers;