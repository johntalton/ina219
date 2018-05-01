"use strict";

const rasbus = require('rasbus');

const ina219lib = require('../src/ina219');
const ina219 = ina219lib.ina219;
const Calibration = ina219lib.calibration;
const Chip = ina219lib.chip;

function configuration() {
  return Promise.resolve({
    name: 'battery monitor',
    bus: {
      type: 'i2cbus',
      params: [42, 0x40]
    },

    pollIntervalMS: 1000 * 1,
    nthPollCalibrationCheck: 24, // 12 @ 5 sec / 1 chec per min
    nthPollConfigCheck: 1,

    profile: {
      rshunt_ohms: Chip.RSHUNT_OHMS,
      brng: Chip.BRNG.BUS_32,
      pg: Chip.PG.GAIN_1,
      adc: Chip.ADC.ADC_1_SAMPLES, // todo split s/b adc

      max_A: 3
    }
  });
}

function loadConfigurationFile(config) {
  return config;
}

function loadBus(config) {
  return rasbus.byname(config.bus.type).init(...config.bus.params).then(bus => {
    config.bus._client = bus;
    return config;
  });
}

function loadSensor(config) {
  let options = {};
  return ina219.sensor(config.bus._client, options).then(sensor => {
    config.sensor = sensor;
    return config;
  });
}

function configureSensor(config) {
  config.currentLSB_A = Calibration.lsbMin_A(config.profile.max_A);
  config.calibration = Calibration.fromCurrentLSB_A(config.currentLSB_A, config.profile.rshunt_ohms);

  return config.sensor.continuous(
    config.calibration,
    config.profile.brng,
    config.profile.pg,
    config.profile.adc,
    config.profile.adc,
    true, true)
    .then(() => {
      return config.sensor.getConfigCalibration().then(storeConfig);
    })
    .then(() => {
      return config;
    });
}

function startPoll(config) {
  config.timer = setInterval(poll, config.pollIntervalMS, config);
  return config;
}

function poll(config) {
  if(config.nthPoll === undefined) { config.nthPoll = 0; }
  config.nthPoll += 1;

  Promise.all([
    validateCalibration(config),
    validateSensorConfig(config)
  ])
    .then(() => config.sensor.getAll(config.currentLSB_A))
    .then(results => storeResult(config, results))
    .catch(e => {
      console.log('poll error', e);
      teardown(config);
    })
    .catch(e => {
      console.log('poll error', e);
    });
}

function validateSensorConfig(config) {
  if(config.nthPollConfigCheck === undefined) { return; }
  if(config.nthPoll % config.nthPollConfigCheck !== 0) { return; }

  return config.sensor.getConfig().then(current => {
    //console.log(config.profile, current);

    if(config.profile.brng !== current.brng) { console.log(' *** bus range missmatch'); }
    if(config.profile.pg !== current.pg) { console.log(' *** gain missmatch'); }
    if(config.profile.adc !== current.badc) { console.log(' *** bus adc missmatch'); }
    if(config.profile.adc !== current.sadc) { console.log(' *** shunt adc missmatch'); }

    if(current.mode !== Chip.MODES.CONTINUOUS_SHUNT_BUS) { console.log(' *** not desired mode', current.mode); }

  });
}

function validateCalibration(config) {
  if(config.nthPollCalibrationCheck === undefined) { return; }
  if(config.nthPoll % config.nthPollCalibrationCheck !== 0) { return; }

  return config.sensor.getCalibration().then(calibration => {
    if(config.calibration !== calibration.raw) {
      console.log(' *** calibration missmatch');
      config.calibration = calibration.raw;
      config.currentLSB_A = Calibration.toCurrentLSB(config.calibration, config.profile.rshunt_ohms);
      console.log(config.calibration, config.currentLSB_A);
    }
  });
}

function addHandlers(config) {
  process.on('SIGINT', () => {
    console.log('Goodbye');
    teardown(config);
  });

  return config;
}

function teardown(config) {
  clearInterval(config.timer);
  config.bus._client.close().then(() => console.log('bus down'));
}


function storeConfig(config) {
  console.log(config);
}

function storeResult(config, result) {
  // console.log(result);
  console.log('load V', result.load.V, 'current mA', result.current.mA, 'power mW', result.power.mW);
  console.log();

  return config.writer.writeRecords([{
    name: config.name,
    timestamp: Date.now(),

    load: result.load.V,
    current: result.current.mA,
    power: result.power.mW
  }]);
}

function initCSV(config) {
  const createCsvWriter = require('csv-writer').createObjectCsvWriter;
  config.writer = createCsvWriter({
    path: 'output.csv',
    header: [
        {id: 'name', title: 'Name'},
        {id: 'timestamp', title: 'Date'},
        {id: 'load', title: 'Load (V)'},
        {id: 'current', title: 'Current (mA)'},
        {id: 'power', title: 'Power (mW)'},
    ]
  });

  return config;
}


configuration()
  .then(loadConfigurationFile)
  .then(addHandlers)
  .then(loadBus)
  .then(loadSensor)
  .then(configureSensor)
  .then(initCSV)
  .then(startPoll)
  .then(config => console.log('OK.'))
  .catch(e => {
    console.log('top-level error');
    console.log(e.name);
    console.log(e.message);
  });
