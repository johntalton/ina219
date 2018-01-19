const rasbus = require('rasbus');
const ina219 = require('./src/ina219');

function init() {
  // console.log('foo', ina219);

  rasbus.i2c.init(1, 0x40).then(bus => {
    return ina219.sensor(bus).then(sensor => {
      //console.log(sensor);

      return Promise.all([
        sensor.getConfig(),
        sensor.getCalibration(),

        sensor.getShuntVoltage_mV(),
        sensor.getBusVoltage_V(),
        sensor.getPower_mW(),
        sensor.getCurrent_mA()
      ]).then(results => {
        return {
          config: results[0],
          calibration: results[1],
          shunt: results[2],
          bus: results[3],
          power: results[4],
          current: results[5]
        }
      }).then(console.log);
    });
  });
}


init();
