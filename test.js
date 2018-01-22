const rasbus = require('rasbus');
const ina219lib = require('./src/ina219');
const ina219 = ina219lib.ina219;
const Calibration = ina219lib.calibration;

const brng = ina219lib.brng;
const pg = ina219lib.pg;
const adc = ina219lib.adc;
const mode = ina219lib.mode;

const currentLSB_A = Calibration.lsbFromMax_A(3.2);
const calibration = Calibration.fromCurrentLSB_A(currentLSB_A);

rasbus.i2c.init(1, 0x40).then(bus => {
  return ina219.sensor(bus).then(sensor => {
    return Promise.all([
      sensor.reset(),
      sensor.trigger(calibration, brng.BUS_32, pg.GAIN_8, adc.ADC_12_BIT, adc.ADC_12_BIT, true, true),
      sensor.getConfigCalibration(),
      sensor.getAll(currentLSB_A)
    ]).then(results => results.splice(2)) // drop results from reset/trigger
      .then(console.log);
  });
}).catch(e => {
  console.log('caughterror', e);
});


