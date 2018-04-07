const rasbus = require('rasbus');
const ina219lib = require('../src/ina219');
const ina219 = ina219lib.ina219;
const Calibration = ina219lib.calibration;

const brng = ina219lib.brng;
const pg = ina219lib.pg;
const adc = ina219lib.adc;
const mode = ina219lib.mode;

function delay(ms, proxy) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(proxy), ms);
  });
}

const currentLSB_A = Calibration.lsbMin_A(.5); // select smallest / higst resolution step size
const calibration = Calibration.fromCurrentLSB_A(currentLSB_A, ina219lib.DEFAULT_RSHUNT_OHMS);

rasbus.byname('i2c').init(1, 0x40).then(bus => {
  return ina219.sensor(bus).then(sensor => {
    return sensor.trigger(calibration, brng.BUS_16, pg.GAIN_2, adc.ADC_128_SAMPLES, adc.ADC_128_SAMPLES, true, true)
      .then(() => sensor.getConfigCalibration().then(console.log))
      .then(() => delay(50)) // ajust to trigger config
      .then(() => sensor.getAll(currentLSB_A).then(console.log));
  })
  .then(() => { bus.close(); });
}).catch(e => {
  console.log('caughterror', e);
});


