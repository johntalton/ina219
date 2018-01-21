const rasbus = require('rasbus');
const ina219lib = require('./src/ina219');
const ina219 = ina219lib.ina219;

function init() {
  // console.log('foo', ina219);

  rasbus.i2c.init(1, 0x40).then(bus => {
    return ina219.sensor(bus).then(sensor => {
      //console.log(sensor);

      return Promise.all([
        sensor.getConfigCalibration(),
        sensor.getAll()
      ]).then(results => {
        return results;
      }).then(console.log);
    });
  });
}


init();
