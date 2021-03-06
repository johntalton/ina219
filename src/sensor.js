/* eslint no-bitwise: warn */

const Units = require('./units.js');
const Chip = require('./chip.js');
const Calibration = require('./calibration.js');

// shorthand
const {
  REGISTERS,
  MASKS,
  OFFSETS,
  BRNG,
  PG,
  ADC,
  MODES
} = Chip;

/**
 *
 **/
class Sensor {
  constructor(bus) {
    this.bus = bus;
  }

  reset() {
    const cfg = (1 << OFFSETS.RESET) & MASKS.CFG_RESET;
    return this.bus.write(REGISTERS.CONFIG, Sensor.split16(cfg));
  }

  setCalibrationConfig(calibration, brng, pg, sadc, badc, mode) {
    return this.setCalibration(calibration)
      .then(() => this.setConfig(brng, pg, sadc, badc, mode));
  }

  setConfig(brng, pg, sadc, badc, mode) {
    // todo validate
    const cfg = 0
      | ((brng << OFFSETS.BRNG) & MASKS.CFG_BRNG)
      | ((pg << OFFSETS.PG) & MASKS.CFG_PG)
      | ((sadc << OFFSETS.SADC) & MASKS.CFG_SADC)
      | ((badc << OFFSETS.BADC) & MASKS.CFG_BADC)
      | (mode & MASKS.CFG_MODE);

    const cfgbuf = Sensor.split16(cfg);
    return this.bus.write(REGISTERS.CONFIG, cfgbuf);
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
    return this.bus.read(REGISTERS.CONFIG, 2).then(buffer => {
      const cfg = buffer.readUInt16BE();

      const brng = (cfg & MASKS.CFG_BRNG) >> OFFSETS.BRNG;
      const pg = (cfg & MASKS.CFG_PG) >> OFFSETS.PG;
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
    if((calibration & 0b1) === 0b1) { throw Error('calibration LSB set (they say its not possible'); }
    const calbuf = Sensor.split16(calibration);
    return this.bus.write(REGISTERS.CALIBRATION, calbuf);
  }

  getCalibration() {
    return this.bus.read(REGISTERS.CALIBRATION, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      return {
        raw: raw
      };
    });
  }

  // shorthand
  getConfigCalibration() {
    return Promise.all([
      this.getConfig(),
      this.getCalibration()
    ])
      .then(([cfg, cali]) => ({ config: cfg, calibration: cali }));
  }

  getShuntVoltage() {
    return this.bus.read(REGISTERS.SHUNT, 2).then(buffer => {
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
    return this.bus.read(REGISTERS.BUS, 2).then(buffer => {
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
    return Promise.all([
      this.getShuntVoltage(),
      this.getBusVoltage()
    ])
      .then(([shunt, bus]) => {
        const loadV = bus.V + Units.mVtoV(shunt.mV);
        return {
          shunt: shunt,
          bus: bus,
          V: loadV
        };
      });
  }

  getCurrent(currentLSB_A) {
    // todo assert calibration
    return this.bus.read(REGISTERS.CURRENT, 2).then(buffer => {
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
    return this.bus.read(REGISTERS.POWER, 2).then(buffer => {
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
      this.getLoadVoltage(),
      this.getCurrent(currentLSB_A),
      this.getPower(powerLSB_mW)
    ])
      .then(([load, current, power]) => ({
        shunt: load.shunt,
        bus: load.bus,
        load: load,
        current: current,
        power: power
      }));
  }

  // private
  static makeMode(triggered, shunt, bus) {
    if(shunt && bus) { return triggered ? MODES.TRIGGERED_SHUNT_BUS : MODES.CONTINUOUS_SHUNT_BUS; }
    if(shunt && !bus) { return triggered ? MODES.TRIGGERED_SHUNT : MODES.CONTINUOUS_SHUNT; }
    if(!shunt && bus) { return triggered ? MODES.TRIGGERED_BUS : MODES.CONTINUOUS_BUS; }

    // (!shunt && !bus)
    throw Error('shunt, bus or both must be enabled for triggered mode');
  }

  // private
  static split16(value16bit) {
    return [(value16bit >> 8) & 0xFF, value16bit & 0xFF];
  }
}

module.exports = { Sensor };
