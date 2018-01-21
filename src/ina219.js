

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
    return this._bus.write(registers.CONFIG, [(cfg >> 8) & 0xFF, 0x00]);
  }

  setConfigCalibration(brng, pg, sadc, badc, mode) {
	let cfg = 0;

        // todo validate params

	cfg |= (brng << offsets.BRNG) & masks.CFG_BRNG;
	cfg |= (pg << offsets.PG) & masks.CFG_PG;
	cfg |= (sadc << offsets.SADC) & masks.CFG_SADC;
	cfg |= (badc << offsets.BADC) & masks.CFG_BADC;
        cfg |= mode & masks.CFG_MODE;


	const cal = 10240;

        const calbuf = new Array(2);
        calbuf[0] = (cal >> 8) & 0xFF;
        calbuf[1] = (cal) & 0xFF;

        const cfgbuf = new Array(2);
        cfgbuf[0] = (cfg >> 8) & 0xFF;
        cfgbuf[1] = (cfg) & 0xFF;

	return this._bus.write(registers.CALIBRATION, calbuf)
		.then(this._bus.write(registers.CONFIG, cfgbuf));
  }

  // shorthand
  trigger(brng, pg, sadc, badc, shunt, bus) {
    const mode = makeMode(true, shunt, bus);
    return this.setConfigCalibration(brng, pg, sadc, badc, mode);
  }

  // shorthand
  continuous(brng, pg, sadc, badc, shunt, bus) {
    const mode = makeMode(false, shunt, bus);
    return this.setConfigCalibration(brng, pg, sadc, badc, mode);
  }

  // shorthand
  powerdown() {
    return this.getConfig().then(cfg => {
	return this.setConfigCalibration(cfg.brng, cfg.pg, cfg.sadc, cfg.badc, modes.POWERDOWN);
    });
  }

  // shorthand
  disableADC() {
    return this.getConfig().then(cfg => {
	return this.setConfigCalibration(cfg.brng, cfg.pg, cfg.sadc, cfg.badc, modes.DISABLEDADC);
    });
  }

  getConfig() {
    return this._bus.read(registers.CONFIG, 2).then(buffer => {
      //console.log('config read', buffer);

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

  getCalibration() {
    return this._bus.read(registers.CALIBRATION, 2).then(buffer => {
      return buffer.readInt16BE();
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

module.exports = {
	ina219: ina219,
	brng: brng,
	pg: pg,
	adc: adc,
	modes: modes
};
