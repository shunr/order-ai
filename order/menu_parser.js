'use strict';

const menu = require('../menu.json');

let mod = module.exports = {};

mod.generateEntities = () => {
    let entities = [];
    let parent = {
        name: 'menu_item',
        entries: []
    }
    for (let category in menu) {
        parent.entries.push(newEntry('@' + category, false));
        let entries = [];
        for (let i = 0; i < menu[category].length; i++) {
            let item = menu[category][i];
            entries.push(newEntry(item, true));
        }
        entities.push({
            name: category,
            entries: entries
        });
    }
    entities.push(parent);
    return entities;
}

mod.generateSpeechContext = () => {
    let context = {
        phrases: []
    };
    for (let category in menu) {
        for (let i = 0; i < menu[category].length; i++) {
            let item = menu[category][i];
            context.phrases.push(item);
        }
    }
    return context;
}

function newEntry(value, useSynonyms) {
    return {
        value: value,
        synonyms: (useSynonyms) ? getSynonyms(value) : [value]
    }
}

function getSynonyms(name) {
    let synonyms = [name];
    if (name.charAt(name.length - 1) != 's') {
        synonyms.push(name + 's');
    }
    return synonyms;
}