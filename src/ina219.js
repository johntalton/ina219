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

/**
 *
 **/
class Sensor {
  constructor(bus) {
    this._bus = bus;
  }

  setConfig(reset, brng, pga, badc, sadc, mode) {
	let cfg = 0;
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

  getConfig() {
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
      //console.log(buffer);
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
      console.log(buffer);
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
