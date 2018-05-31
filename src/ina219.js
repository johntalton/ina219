const Units = require('./units.js');
const Chip = require('./chip.js');
const Calibration = require('./calibration.js');
const { Sensor } = require('./sensor.js');

/**
 *
 **/
class ina219 {
  static sensor(bus) {
    return Promise.resolve(new Sensor(bus));
  }
}

module.exports = {
  DEFAULT_I2C_ADDRESS: Chip.DEFAULT_I2C_ADDRESS,
  DEFAULT_RSHUNT_OHMS: Chip.RSHUNT_OHMS,

  ina219: ina219,
  calibration: Calibration,
  units: Units,
  chip: Chip,

  brng: Chip.BRNG,
  pg: Chip.PG,
  adc: Chip.ADC,
  modes: Chip.MODES
};
