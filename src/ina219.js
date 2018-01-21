

const RSHUNT_OHMS = 0.1; // default adafruit resister

/**
 *
 **/
class ina219 {
  static sensor(bus) {
    return Promise.resolve(new Sensor(bus, RSHUNT_OHMS));
  }
}

const registers = {
	CONFIG:      0x00,
	SHUNT:       0x01,
	BUS:         0x02,
	POWER:       0x03,
	CURRENT:     0x04,
	CALIBRATION: 0x05
};

const masks = {
	CFG_RESET: 0x8000,
	CFG_BRNG:  0x2000,
	CFG_PG:    0x1800,
	CFG_BADC:  0x0780, // only place its bus then shunt everwhere else is shunt then bus
	CFG_SADC:  0x0078,
	CFG_MODE:  0x0007,

	BUS_OVF:  0x0001,
	BUS_CNVR: 0x0002
};

const offsets = {
	RESET: 15,
	BRNG:  13,
	PG:    11,
	BADC:   7,
	SADC:   3,
	MODE:   0
};

const brng = {
	BUS_16: 0b0, // 16 V
	BUS_32: 0b1  // 32 V (default)
};

const pg = {
	GAIN_1: 0b00, // +/- 40 mV
	GAIN_2: 0b01, // +/- 80 mV
	GAIN_4: 0b10, // +/- 160 mV
	GAIN_8: 0b11  // +/- 320 mV (default)
};

const adc = {
	ADC_9_BIT:       0b0000, // 84 us
	ADC_10_BIT:      0b0001, // 148 us
	ADC_11_BIT:      0b0010, // 276 us
	ADC_12_BIT:      0b0011, // 532 us (default)
        ADC_1_SAMPLE:    0b1000, // 532 us (12bit, or 1 sample)
	ADC_2_SAMPLES:   0b1001, // 1.06 us
	ADC_4_SAMPLES:   0b1010, // 2.13 ms
	ADC_8_SAMPLES:   0b1011, // 4.26 ms
	ADC_16_SAMPLES:  0b1100, // 8.51 ms
	ADC_32_SAMPLES:  0b1101, // 17.02 ms
	ADC_64_SAMPLES:  0b1110, // 34.05 ms
	ADC_128_SAMPLES: 0b1111  // 68.10 ms
};

const modes = {
	POWERDOWN:            0b000,
	DISABLEDADC:          0b100,

	TRIGGERED_SHUNT:      0b001,
	TRIGGERED_BUS:        0b010,
	TRIGGERED_SHUNT_BUS:  0b011,

	CONTINUOUS_SHUNT:     0b101,
	CONTINUOUS_BUS:       0b110,
	CONTINUOUS_SHUNT_BUS: 0b111
};

function makeMode(triggered, shunt, bus) {
  if(shunt && bus) { return triggered ? modes.TRIGGERED_SHUNT_BUS : modes.CONTINUOUS_SHUNT_BUS; }
  if(shunt && !bus) { return triggered ? modes.TRIGGERED_SHUNT : modes.CONTINUOUS_SHUNT; }
  if(!shunt && bus) { return triggered ? modes.TRIGGERED_BUS : modes.CONTINUOUS_BUS; }

  if(!shunt && !bus) { throw Error('shunt, bus or both must be enab led for triggered mode'); }
}

function split16(value16bit) {
  return [(value16bit >> 8) & 0xFF, value16bit & 0xFF];
}

class Calibration {
  static fromCurrentLSB_A(currentLSB_A, rshunt_ohm) {
    return Math.truncate(0.04096 / (currentLSB_A * rshunt_ohm));
  }

  static fromMax_A(maxExpectedCurrent_A) {
    const lsb = maxExpectedCurrent_A / Math.pow(2, 15);
    return Calibration.fromCurrentLSB_A(lsb);
  }
}

/**
 *
 **/
class Sensor {
  constructor(bus, rshunt_ohm) {
    this._rshunt_ohm = rshunt_ohm;
    this._bus = bus;
  }

  reset() {
    const cfg = (1 << offsets.RESET) & masks.CFG_RESET;
    return this._bus.write(registers.CONFIG, split16(cfg));
  }

  setCalibrationConfig(calibration, brng, pg, sadc, badc, mode) {
    return this.setCalibration(calibration)
      .then(this.setConfig(brng, pg, sadc, badc, mode));
  }

  setConfig(brng, pg, sadc, badc, mode) {
        // todo validate params

	let cfg = 0;
	cfg |= (brng << offsets.BRNG) & masks.CFG_BRNG;
	cfg |= (pg << offsets.PG) & masks.CFG_PG;
	cfg |= (sadc << offsets.SADC) & masks.CFG_SADC;
	cfg |= (badc << offsets.BADC) & masks.CFG_BADC;
        cfg |= mode & masks.CFG_MODE;

        const cfgbuf = split16(cfg);
	return this._bus.write(registers.CONFIG, cfgbuf);
  }

  // shorthand
  trigger(calibration, brng, pg, sadc, badc, shunt, bus) {
    const mode = makeMode(true, shunt, bus);
    return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode);
  }

  // shorthand
  continuous(calibration, brng, pg, sadc, badc, shunt, bus) {
    const mode = makeMode(false, shunt, bus);
    return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode);
  }

  // shorthand
  powerdown() {
    return this.setConfig(brng.BUS_32, pg.GAIN_8, adc.ADC_1_SAMPLE, adc.ADC_1_SAMPLE, modes.POWERDOWN);
  }

  // shorthand
  disableADC() {
    return this.setConfig(brng.BUS_32, pg.GAIN_8, adc.ADC_1_SAMPLE, adc.ADC_1_SAMPLE, modes.DISABLEDADC);
  }

  getConfig() {
    return this._bus.read(registers.CONFIG, 2).then(buffer => {
      const cfg = buffer.readUInt16BE();

      const brng = (cfg & masks.CFG_BRNG) >> offsets.BRNG;
      const pg = (cfg & masks.CFG_PG) >> offsets.PG;
      const sadc = (cfg & masks.CFG_SADC) >> offsets.SADC;
      const badc = (cfg & masks.CFG_BADC) >> offsets.BADC;
      const mode = (cfg & masks.CFG_MODE);

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
    const calbuf = split16(cal);
    return this._bus.write(registers.CALIBRATION, calbuf);
  }

  getCalibration() {
    return this._bus.read(registers.CALIBRATION, 2).then(buffer => {
      const raw = buffer.readInt16BE();
      return {
        raw: raw
      };
    });
  }

  // shorthand
  getConfigCalibration() {
    return this.getConfig().then(cfg => { return { config: cfg, calibration: this.getCalibration() }; });
  }

  getShuntVoltage() {
    return this._bus.read(registers.SHUNT, 2).then(buffer => {
      const raw = buffer.readInt16BE();
      return {
        raw: raw,
        mV: raw * 0.01 // 10 uV scale
      };
    });
  }

  getBusVoltage() {
    return this._bus.read(registers.BUS, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      const ovf = (raw & masks.BUS_OVF) === masks.BUS_OVF;
      const cnvr = (raw & masks.BUS_CNVR) === masks.BUS_CNVR;
      const value = (raw >> 3); // shift for status register
      return {
        ready: cnvr,
        overflow: ovf,
        raw: value,
        mV: value * 4, // 4 mV scale
        V: value * 4 * 0.001
      };
    });
  }

  getCurrent(currentLSB_A) {
    // todo assert calibration
    return this._bus.read(registers.CURRENT, 2).then(buffer => {
      const raw = buffer.readUInt16BE();
      return {
        raw: raw,
        mA: raw * currentLSB_A
      };
    });
  }

  getPower(powerLSB_mW) {
    // todo assert calibration
    return this._bus.read(registers.POWER, 2).then(buffer => {
      //console.log('power', buffer);
      const raw = buffer.readInt16BE();
      return {
        raw: raw,
        mW: raw * powerLSB_mW
      };
    });
  }

  getAll() {
    return Promise.all([
      this.getShuntVoltage(),
      this.getBusVoltage(),
      this.getCurrent(),
      this.getPower()
    ]).then(([shunt, bus, current, power]) => {
      return {
        shunt: shunt,
        bus: bus,
        current: current,
        power: power
      };
    });
  }
}

module.exports = {
	ina219: ina219,
	calibration: Calibration,

	brng: brng,
	pg: pg,
	adc: adc,
	modes: modes
};
