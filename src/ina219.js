/**
 *
 **/
class ina219 {
  static sensor(bus) {
    return Promise.resolve(new Sensor(bus));
  }
}

const registers = {
  CONFIG: 0x00,
  SHUNT: 0x01,
  BUS: 0x02,
  POWER: 0x03,
  CURRENT: 0x04,
  CALIBRATION: 0x05
};

const modes = {
  POWERDOWN: 0b000,
  DISABLEDADC: 0b100,

  TRIGGERED_SHUNT: 0b001,
  TRIGGERED_BUS:   0b010,
  TRIGGERED_BUS_SHUNT: 0b011,

  CONTINUOUS_SHUNT: 0b101,
  CONTINUOUS_BUS: 0b110,
  CONTINUOUS_BUS_SHUNT: 0b111
};

const valid_brng = [16, 32];
const vlaid_pg = [1, 2, 4, 8];

const masks = {
	CFG_RESET: 0x8000,
	CFG_BRNG:  0x2000,
	CFG_PGA:   0x1800,
	CFG_BADC:  0x0780,
	CFG_SADC:  0x0078,
	CFG_MODE:  0x0007,
};

const pg  = { // post-shifted pg values
	GAIN_1: 0x0000,
	GAIN_2: 0x0800,
	GAIN_4: 0x1000,
	GAIN_8: 0x1800
}

/**
 *
 **/
class Sensor {
  constructor(bus) {
    this._bus = bus;
  }

  setConfig(reset, brng, pga, badc, sadc, mode) {

	if(!valid_brng.includes(brng)) { throw Error('invalid brng value'); }
	if(!valid_pg.includes(pga)) { throw Error('invalid pga value'); }
	if(mode > masks.CFG_MODE || mode < 0){ throw Error('invalid mode'); }

	let cfg = 0;
	if(reset) { cfg |= masks.CFG_RESET; }
	if(brng === 32) { cfg |= masks.CFG_BRNG; }
	cfg |= pga;

	return this._bus.write(registers.CONFIG, cfg);
  }

  setCalibration() {
    let cal = 10240;
    return this._bus.write(registers.CALIBRATION, cal);
  }

  // shorthand
  reset() {
    return this.getConfig().then(cfg => {
	return this.setConfig(true, cfg.brng, cfg.pga, cfg.badc, cfg.sadc, mode);
    });
  }

  // shorthand
  powerdown() {
    return this.getConfig().then(cfg => {
	return this.setConfig(false, cfg.brng, cfg.pga, cfg.badc, cfg.sadc, modes.OOWERDOWN);
    });
  }

  // shorthand
  disabledADC() {
    return this.getConfig().then(cfg => {
	return this.setConfig(false, cfg.brng, cfg.pga, cfg.badc, cfg.sadc, modes.DISABLEDADC);
    });
  }

  getConfig_raw() {
    return this._bus.read(registers.CONFIG, 2).then(buffer => {
      // console.log('config read', buffer);

      const cfg = buffer.readUInt16BE();

      const brng = (cfg & 0x2000) >> 13;
      const pg = (cfg & 0x1800) >> 11;
      const badc = cfg;
      const sadc = cfg;
      const mode = cfg & 0x0007;

      return {
        brng: brng,
        pg: pg,
        badc: badc,
        sadc: sadc,
        mode: mode
      };
    });
  }

  getConfig() {
    return this.getConfig_raw().then(config => {
      return {
        brng: config.brng === 1 ? 32 : 16,
;
    });
  }

  getCalibration() {
    return this._bus.read(registers.CALIBRATION, 2).then(buffer => {
      return buffer.readInt16BE();
    });
  }

  getBusVoltage_raw() {
    return this._bus.read(registers.BUS, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      const ovf = (raw & 0x0001) === 0x0001;
      const cnvr = (raw & 0x0002) === 0x0002;

      //console.log('ovf', ovf, 'cnvr', cnvr);
      if(!cnvr) {
         console.log('bus voltage convertion not ready');
         return undefined;
      }
      if(ovf) {
        console.log('bus voltage math overflow');
        return undefined;
      }

      const rawvalue = (raw >> 3) * 4;

      //console.log('bus', buffer, 'raw', raw, 'shift',  raw >> 3);

      return rawvalue;
    });
  }

  getBusVoltage_V() {
    return this.getBusVoltage_raw().then(raw => {
      return raw * 0.001;
    });
  }

  getShuntVoltage_raw() {
    //console.log('shunt voltage raw');
    return this._bus.read(registers.SHUNT, 2).then(buffer => {
      //console.log('buffer', buffer);
      return buffer.readInt16BE();
      //return 42;
    });
  }

  getShuntVoltage_mV() {
    return this.getShuntVoltage_raw().then(raw => {
      return raw * 0.01;
    });
  }

  getPower_raw() {
    return this._bus.read(registers.POWER, 2).then(buffer => {
      console.log('power', buffer);
      return buffer.readInt16BE();
    });
  }

  getPower_mW() {
    return this.getPower_raw().then(raw => {
      return raw * 2;
    });
  }

  getCurrent_raw() {
    return this._bus.read(registers.CURRENT, 2).then(buffer => {
      //console.log('current', buffer);
      return buffer.readUInt16BE();
    });
  }

  getCurrent_mA() {
    return this.getCurrent_raw().then(raw => {
      return raw / 25.0;
    });
  }

}

module.exports = ina219;
