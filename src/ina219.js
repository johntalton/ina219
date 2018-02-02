const Units = require('./units.js');
const Chip = require('./chip.js');
const Calibration = require('./calibration.js');

// shorthand
const REGISTERS = Chip.REGISTERS;
const MASKS = Chip.MASKS;
const OFFSETS = Chip.OFFSETS;
const BRNG = Chip.BRNG;
const PG = Chip.PG;
const ADC = Chip.ADC;
const MODES = Chip.MODES;

/**
 *
 **/
class ina219 {
  static sensor(bus) {
    return Promise.resolve(new Sensor(bus, Chip.RSHUNT_OHMS));
  }
}

/**
 *
 **/
class Sensor {
  constructor(bus, rshunt_ohm) {
    // this._rshunt_ohm = rshunt_ohm;
    this._bus = bus;
  }

  reset() {
    const cfg = (1 << OFFSETS.RESET) & MASKS.CFG_RESET;
    return this._bus.write(REGISTERS.CONFIG, Sensor.split16(cfg));
  }

  setCalibrationConfig(calibration, brng, pg, sadc, badc, mode) {
    return this.setCalibration(calibration)
      .then(() => this.setConfig(brng, pg, sadc, badc, mode));
  }

  setConfig(brng, pg, sadc, badc, mode) {
    // todo validate params
    let cfg = 0;
    cfg |= (brng << OFFSETS.BRNG) & MASKS.CFG_BRNG;
    cfg |= (pg << OFFSETS.PG) & MASKS.CFG_PG;
    cfg |= (sadc << OFFSETS.SADC) & MASKS.CFG_SADC;
    cfg |= (badc << OFFSETS.BADC) & MASKS.CFG_BADC;
    cfg |= mode & MASKS.CFG_MODE;

    const cfgbuf = Sensor.split16(cfg);
    return this._bus.write(REGISTERS.CONFIG, cfgbuf);
  }

  // shorthand
  trigger(calibration, brng, pg, sadc, badc, shunt, bus) {
    const mode = Sensor.makeMode(true, shunt, bus);
    return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode);
  }

  // shorthand
  continuous(calibration, brng, pg, sadc, badc, shunt, bus) {
    const mode = Sensor.makeMode(false, shunt, bus);
    return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode);
  }

  // shorthand
  powerdown() {
    return this.setConfig(BRNG.BUS_32, PG.GAIN_8, ADC.ADC_1_SAMPLE, ADC.ADC_1_SAMPLE, MODES.POWERDOWN);
  }

  // shorthand
  disableADC() {
    return this.setConfig(BRNG.BUS_32, PG.GAIN_8, ADC.ADC_1_SAMPLE, ADC.ADC_1_SAMPLE, MODES.DISABLEDADC);
  }

  getConfig() {
    return this._bus.read(REGISTERS.CONFIG, 2).then(buffer => {
      const cfg = buffer.readUInt16BE();

      const brng = (cfg & MASKS.CFG_BRNG) >> OFFSETS.BRNG;
      const pg =   (cfg & MASKS.CFG_PG) >> OFFSETS.PG;
      const sadc = (cfg & MASKS.CFG_SADC) >> OFFSETS.SADC;
      const badc = (cfg & MASKS.CFG_BADC) >> OFFSETS.BADC;
      const mode = (cfg & MASKS.CFG_MODE);

      return {
        brng: brng,
        pg: pg,
        sadc: sadc,
        badc: badc,
        mode: mode
      };
    });
  }

  setCalibration(calibration) {
    if(calibration & 0b1 === 0b1) { throw Error('calibration LSB set (they say its not possible'); }
    const calbuf = Sensor.split16(calibration);
    return this._bus.write(REGISTERS.CALIBRATION, calbuf);
  }

  getCalibration() {
    return this._bus.read(REGISTERS.CALIBRATION, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      return {
        raw: raw
      };
    });
  }

  // shorthand
  getConfigCalibration() {
    return this.getConfig().then(cfg => {
      return this.getCalibration().then(cali => {
        return { config: cfg, calibration: cali };
      });
    });
  }

  getShuntVoltage() {
    return this._bus.read(REGISTERS.SHUNT, 2).then(buffer => {
      const raw = buffer.readInt16BE();
      const shuntLSB_uV = 10; // 10 uV
      return {
        raw: raw,
        uV: raw * shuntLSB_uV,
        mV: Units.uVtomV(raw * shuntLSB_uV)
      };
    });
  }

  getBusVoltage() {
    return this._bus.read(REGISTERS.BUS, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      const ovf = (raw & MASKS.BUS_OVF) === MASKS.BUS_OVF;
      const cnvr = (raw & MASKS.BUS_CNVR) === MASKS.BUS_CNVR;
      const value = (raw >> 3); // shift for status register
      const busLSB_mV = 4; // 4 mV
      return {
        ready: cnvr,
        overflow: ovf,
        raw: value,
        mV: value * busLSB_mV,
        V: Units.mVtoV(value * busLSB_mV)
      };
    });
  }

  // shorthand
  getLoadVoltage() {
    return this.getShuntVoltage().then(shunt => {
      return this.getBusVoltage().then(bus => {
        const loadV = bus.V + Units.mVtoV(shunt.mV);
        return {
          shunt: shunt,
          bus: bus,
          V: loadV
        };
      });
    });
  }

  getCurrent(currentLSB_A) {
    // todo assert calibration
    return this._bus.read(REGISTERS.CURRENT, 2).then(buffer => {
      const raw = buffer.readInt16BE();
      return {
        raw: raw,
        A: raw * currentLSB_A,
        mA: raw * Units.AtomA(currentLSB_A)
      };
    });
  }

  getPower(powerLSB_mW) {
    // todo assert calibration
    return this._bus.read(REGISTERS.POWER, 2).then(buffer => {
      const raw = buffer.readInt16BE();
      return {
        raw: raw,
        mW: raw * powerLSB_mW
      };
    });
  }

  // shorthand
  getAll(currentLSB_A) {
    const powerLSB_mW = Calibration.powerLSB_mW(currentLSB_A);

    return Promise.all([
      //this.getShuntVoltage(),
      //this.getBusVoltage(),
      this.getLoadVoltage(),
      this.getCurrent(currentLSB_A),
      this.getPower(powerLSB_mW)
    ]).then(([load, current, power]) => {
      return {
        shunt: load.shunt,
        bus: load.bus,
        load: load,
        current: current,
        power: power
      };
    });
  }


  // private
  static makeMode(triggered, shunt, bus) {
    if(shunt && bus) { return triggered ? MODES.TRIGGERED_SHUNT_BUS : MODES.CONTINUOUS_SHUNT_BUS; }
    if(shunt && !bus) { return triggered ? MODES.TRIGGERED_SHUNT : MODES.CONTINUOUS_SHUNT; }
    if(!shunt && bus) { return triggered ? MODES.TRIGGERED_BUS : MODES.CONTINUOUS_BUS; }

    if(!shunt && !bus) { throw Error('shunt, bus or both must be enab led for triggered mode'); }
  }

  // private
  static split16(value16bit) {
    return [(value16bit >> 8) & 0xFF, value16bit & 0xFF];
  }
}

module.exports = {
	DEFAULT_I2C_ADDRESS: Chip.DEFAULT_I2C_ADDRESS,
	DEFAULT_RSHUNT_OHMS: Chip.RSHUNT_OHMS,

	ina219: ina219,
	calibration: Calibration,
	units: Units,
	chip: Chip,

	brng: BRNG,
	pg: PG,
	adc: ADC,
	modes: MODES
};
