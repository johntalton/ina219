

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
	CFG_PGA:   0x1800,
	CFG_BADC:  0x0780,
	CFG_SADC:  0x0078,
	CFG_MODE:  0x0007,
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
	BUS_16: 0b0,
	BUS_32: 0b1
};

const pg = { // pre-shifted pg values
	GAIN_1_40:  0b00,
	GAIN_2_80:  0b01,
	GAIN_4_160: 0b10,
	GAIN_8_320: 0b11 // default
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
    const mode = shunt ? bus ? modes.TRIGGERED_SHUNT_BUS : modes.TRIGGERED_SHUNT : bus ? modes.TRIGGERED_BUS : null;

  if(shunt && bus) { }
  if(shunt && !bus) {}
  if(!shunt && bus) {}
  if(!shunt && !bus)
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
    const cfg = (1 << offsets.RESET) & mask.CFG_RESET;
    return this._bus.write(registers.CONFIG, cfg);
  }

  setConfigCalibration(brng, pg, badc, sadc, mode) {
	let cfg = 0;

	cfg |= (brng << offsets.BRNG) & mask.CFG_BRNG;
	cfg |= (pga << offsets.PG) & mask.CFG_PG;
	cfg |= (badc << offsets.BADC) & mask.CFG_BADC;
	cfg |= (sadc << offsets.SADC) & mask.CFG_SADC;
        cfg |= mode & mask.CFG_MODE;


	const cal = 10240;

	return this._bus.write(registers.CONFIG, cfg)
		.then(() => this._bus.write(registers.CALIBRATION, cal));
  }

  // shorthand
  trigger(brng, pg, badc, sadc, shunt, bus) {
    const mode = makeMode(true, shunt, bus);
    if(mode === null) { throw Error('shunt, bus or both must be enab led for triggered mode'); }
    return this.setConfig(brng, pg, badc, sadc, mode);
  }

  // shorthand
  setContinuous(brng, pg, badc, sadc, shunt, bus) {
    const mode = makeMode(false, shunt, bus);
    return this.setConfig(brng, pg, badc, sadc, mode);
  }

  // shorthand
  powerdown() {
    return this.getConfig().then(cfg => {
	return this.setConfig(cfg.brng, cfg.pga, cfg.badc, cfg.sadc, modes.POWERDOWN);
    });
  }

  // shorthand
  disabledADC() {
    return this.getConfig().then(cfg => {
	return this.setConfig(cfg.brng, cfg.pga, cfg.badc, cfg.sadc, modes.DISABLEDADC);
    });
  }

  getConfig_raw() {
    return this._bus.read(registers.CONFIG, 2).then(buffer => {
      // console.log('config read', buffer);

      const cfg = buffer.readUInt16BE();

      const brng = (cfg & masks.CFG_BRNG) >> offsets.BRNG;
      const pg = (cfg & masks.CFG_PG) >> offsets.PG;
      const badc = (cfg & masks.CFG_BADC) >> offsets.BADC;
      const sadc = (cfg & masks.CFG_SADC) >> offsets.SADC;
      const mode = (cfg & masks.CFG_MODE);

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
        pg: config.pg,
        badc: config.badc,
        sadc: config.sadc,
        mode: config.mode
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
