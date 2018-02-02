
const rasbus = require('rasbus');
const ina219lib = require('../src/ina219');
const ina219 = ina219lib.ina219;
const Calibration = ina219lib.calibration;
const Chip = ina219lib.chip;

function configuration() {
  return Promise.resolve({
    bus: 1,
    address: 0x40,

    pollIntervalMS: 1000 * 5,
    nthPollCalibrationCheck: 12, // 12 @ 5 sec / 1 chec per min

    rshunt_ohms: Chip.RSHUNT_OHMS,
    brng: Chip.BRNG.BUS_16,
    pg: Chip.PG.GAIN_1,
    adc: Chip.ADC.ADC_128_SAMPLES,

    max_A: 0.4
  });
}

function loadConfigurationFile(config) {
  return config;
}

function loadBus(config) {
  return rasbus.i2c.init(config.bus, config.address).then(bus => {
    config.bus = bus;
    return config;
  });
}

function loadSensor(config) {
  let options = {};
  return ina219.sensor(config.bus, options).then(sensor => {
    config.sensor = sensor;
    return config;
  });
}

function calcCalibration(config) {
  config.currentLSB_A = Calibration.lsbMin_A(config.max_A);
  config.calibration = Calibration.fromCurrentLSB_A(config.currentLSB_A, config.rshunt_ohms);
  return config;
}

function configureSensor(config) {
  return config.sensor.continuous(
    config.calibration,
    config.brng,
    config.pg,
    config.adc,
    config.adc,
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
  validateCalibration(config);

  config.sensor.getAll(config.currentLSB_A)
    .then(storeResult)
    .catch(e => {
      console.log('poll error', e);
      teardown(config);
    });
}

function validateCalibration(config) {
  if(config.nthPoll === undefined) { config.nthPoll = 0; }
  config.nthPoll += 1;
  if(config.nthPollCalibrationCheck !== undefined) {
    if(config.nthPollCalibrationCheck <= config.nthPoll) {
      config.nthPoll = 0;

      config.sensor.getCalibration().then(calibration => {
        if(config.calibration !== calibration.raw) {
          console.log(' *** calibration missmatch');
          config.calibration = calibration.raw;
          config.currentLSB_A = Calibration.toCurrentLSB(config.calibration, config.rshunt_ohms);
          console.log(config.calibration, config.currentLSB_A);
        }
      })
      .catch(e => {
        console.log('calibration check error', e);
      });
    }
  }
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
  config.bus.close().then(() => console.log('bus down'));
}


function storeConfig(config) {
  console.log(config);
}

function storeResult(result) {
  console.log(result.load.V, result.current.mA, result.power.mW);
}



configuration()
  .then(loadConfigurationFile)
  .then(addHandlers)
  .then(loadBus)
  .then(loadSensor)
  .then(calcCalibration)
  .then(configureSensor)
  .then(startPoll)
  .then(config => console.log('OK.'))
  .catch(e => {
    console.log('top-level error');
    console.log(e.name);
    console.log(e.message);
  });
