"use strict";
const readline = require('readline');



let promptCallback = undefined;
let state = { defaultValid: false };
let commands = [
  { name: 'exit', valid: () => true, callback: function(state){ rl.close(); return Promise.resolve(-1); } },
  // { name: 'clear', valid: () => true, callback: function(state) { return Promise.resolve(rl.); } }
  { name: 'clear', valid: () => true, callback: function(state) { console.log('\u001B[2J\u001B[0;0f'); return Promise.
resolve();  } }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer
});




class Repler {
  static addCommand(cmd) { commands.push(cmd); }
  static go(initstate){
    //state = { ...state, ...initstate };
    state = Object.assign(state, initstate);
    prompt();
  }

  static addPrompt(pmt) { promptCallback = pmt; }
}

module.exports = Repler;



function prompt() {
  const close = '> ';
  let prompt = close;

  if(promptCallback !== undefined) {
    prompt = promptCallback(state);
  }

  rl.question(prompt, commandHandler);
}

function finderFull(cmd, state) {
  return function(item) {
    if(item.name.toLowerCase() === cmd.toLowerCase()) {
      if(item.valid === undefined){ return state.defaultValid; } // default is enabled
      return item.valid(state);
    }
    return false;
  };
}

function finderPartial(partialCmd, state) {
  return function(item) {
    return item.name.toLowerCase().startsWith(partialCmd) &&
      ((item.valid === undefined) ? state.defaultValid : item.valid(state));
  };
}


 function completer(line) {
  const partialCmd = line.split(' ')[0];
  const partials = commands.filter(finderPartial(partialCmd, state));

  let suggestions = partials.map(item => item.name);

  const exacts = partials.filter(finderFull(partialCmd, state));
  if(exacts.length > 1){ throw new Error(partialCmd); }
  if(exacts[0]) {
    if(exacts[0].completer) {
      //suggestions.push(...exacts[0].completer(line));
      return [exacts[0].completer(line), line];
    }
  }

  return [suggestions, line];
}

function commandHandler(line) {
  const cmd = line.split(' ')[0];
  let item = commands.find(finderFull(cmd, state)); // todo change to filter and handle multi
  if(item === undefined) {
    const partials = commands.filter(finderPartial(cmd, state));
    if(partials.length === 1) {
      item = partials[0];
    } else {
      item = { callback: (state) => Promise.resolve(state) };
    }
  }

  state.line = line;
  Promise.resolve(state).then(item.callback).then(exitcode => {
    if(exitcode === -1){ console.log('end of line.'); return; }
    prompt();
  }).catch(e => {
    console.log('error', e);
    prompt();
  });
}


