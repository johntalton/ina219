const ina219lib = require('./src/ina219.js');

class Misc {
  static brngString(brng) {
    switch(brng) {
      case ina219lib.brng.BUS_16: return '16V';
      case ina219lib.brng.BUS_32: return '32V';
      default: throw Error('unknown brng value');
    }
  }

  static pgString(pg) {
    switch(pg) {
      case ina219lib.pg.GAIN_1: return '1';
      case ina219lib.pg.GAIN_2: return '/2';
      case ina219lib.pg.GAIN_4: return '/4';
      case ina219lib.pg.GAIN_8: return '/8';
      default: throw Error('unknown pg value');
    }
  }

  static adcString(adc) {
    switch(adc) {
      case ina219lib.adc.ADC_9_BIT: return '9 bit';
      case ina219lib.adc.ADC_10_BIT: return '10 bit';
      case ina219lib.adc.ADC_11_BIT: return '11 bit';
      case ina219lib.adc.ADC_12_BIT: return '12 bit';
      case ina219lib.adc.ADC_1_SAMPLE: return '1 sample';
      case ina219lib.adc.ADC_2_SAMPLES: return '2 samples';
      case ina219lib.adc.ADC_4_SAMPLES: return '4 samples';
      case ina219lib.adc.ADC_8_SAMPLES: return '8 samples';
      case ina219lib.adc.ADC_16_SAMPLES: return '16 samples';
      case ina219lib.adc.ADC_32_SAMPLES: return '32 samples';
      case ina219lib.adc.ADC_64_SAMPLES: return '64 samples';
      case ina219lib.adc.ADC_128_SAMPLES: return '128 samples';

      default: throw Error('unknown adc value');
    }
  }

  static  modeString(mode) {
    switch(mode) {
      case ina219lib.modes.POWERDOWN: return 'power-down';
      case ina219lib.modes.DISABLEDADC: return 'ADC off (disabled)';

      case ina219lib.modes.TRIGGERED_SHUNT: return 'triggered (shunt)';
      case ina219lib.modes.TRIGGERED_BUS: return 'triggered (bus)';
      case ina219lib.modes.TRIGGERED_SHUNT_BUS: return 'triggered (shunt/bus)';

      case ina219lib.modes.CONTINUOUS_SHUNT: return 'continuous (shunt)';
      case ina219lib.modes.CONTINUOUS_BUS: return 'continuous (bus)';
      case ina219lib.modes.CONTINUOUS_SHUNT_BUS: return 'continuous (shunt/bus)';

      default: throw Error('unknown mode value');
    }
  }

  static  configString(config) {
    let lines = [];
    lines.push('Bus Votage Range: ' + Misc.brngString(config.brng));
    lines.push('Gain: ' + Misc.pgString(config.pg));
    lines.push('Shunt ADC Resolution: ' + Misc.adcString(config.sadc));
    lines.push('Bus ADC Resolution: ' + Misc.adcString(config.badc));
    lines.push('Mode: ' + Misc.modeString(config.mode));
    return lines.join('\n');
  }

  static stringToPG(pgstr) {
    switch(pgstr) {
      case '1': return ina219lib.pg.GAIN_1;
      case '2': return ina219lib.pg.GAIN_2;
      case '4': return ina219lib.pg.GAIN_4;
      case '8': return ina219lib.pg.GAIN_8;
      default: throw Error('pg conversion error');
    }
  }

  static stringToBRNG(brngstr) {
    if(brngstr === '16') { return ina219lib.brng.BUS_16; }
    if(brngstr === '32') { return ina219lib.brng.BUS_32; }
    throw Error('brng conversion error');
  }
}

const trigger_config = [
  {
    name: 'brng',
    valids: ['16', '32'],
    toenum: Misc.stringToBRNG
  },
  {
    name: 'pg',
    valids: ['1', '2', '4', '8'],
    toenum: Misc.stringToPG
  },
  {
    name: 'sadc',
    valids: ['9b', '10b', '11b', '12b', '1', '2', '4', '8', '16', '32', '64', '128'],
    toenum: sadc => {
      switch(sadc) {
        case '9b': return ina219lib.adc.ADC_9_BIT;
        case '10b': return ina219lib.adc.ADC_10_BIT;
        case '11b': return ina219lib.adc.ADC_11_BIT;
        case '12b': return ina219lib.adc.ADC_12_BIT;
        case '1': return ina219lib.adc.ADC_1_SAMPLE;
        case '2': return ina219lib.adc.ADC_2_SAMPLES;
        case '4': return ina219lib.adc.ADC_4_SAMPLES;
        case '8': return ina219lib.adc.ADC_8_SAMPLES;
        case '16': return ina219lib.adc.ADC_16_SAMPLES;
        case '32': return ina219lib.adc.ADC_32_SAMPLES;
        case '64': return ina219lib.adc.ADC_64_SAMPLES;
        case '128': return ina219lib.adc.ADC_128_SAMPLES;
        default: throw Error('sadc converstion error');
      }
    }
  },
  {
    name: 'badc',
    valids: ['9b', '10b', '11b', '12b', '1', '2', '4', '8', '16', '32', '64', '128'],
    toenum: badc => {
      switch(badc) {
        case '9b': return ina219lib.adc.ADC_9_BIT;
        case '10b': return ina219lib.adc.ADC_10_BIT;
        case '11b': return ina219lib.adc.ADC_11_BIT;
        case '12b': return ina219lib.adc.ADC_12_BIT;
        case '1': return ina219lib.adc.ADC_1_SAMPLE;
        case '2': return ina219lib.adc.ADC_2_SAMPLES;
        case '4': return ina219lib.adc.ADC_4_SAMPLES;
        case '8': return ina219lib.adc.ADC_8_SAMPLES;
        case '16': return ina219lib.adc.ADC_16_SAMPLES;
        case '32': return ina219lib.adc.ADC_32_SAMPLES;
        case '64': return ina219lib.adc.ADC_64_SAMPLES;
        case '128': return ina219lib.adc.ADC_128_SAMPLES;
        default: throw Error('badc converstion error');
      }
    }
  },
  {
    name: 'shunt',
    valids: ['t', 'true', 'f', 'false'],
    toenum: shunt => {
      if(['t', 'true'].includes(shunt.toLowerCase())) { return true; }
      return false;
    }
  },
  {
    name: 'bus',
    valids: ['t', 'true', 'f', 'false'],
    toenum: bus => {
      if(['t', 'true'].includes(bus)) { return true; }
      return false;
    }
  }
];

function comp(value, cfg, idx) {
  if(value === undefined || value.trim() === ''){ return false; }
  if(!cfg[idx].valids.includes(value.toLowerCase())) { return false; }
  return true;
}

function call(value, cfg, idx) {
  if(!cfg[idx].valids.includes(value.toLowerCase())) { throw Error('invalid ' + cfg[idx].name); }
  return cfg[idx].toenum(value);
}





module.exports = {
  configString: Misc.configString,
  stringToPG: Misc.stringToPG,
  stringToBRNG: Misc.stringToBRNG,

  trigger_config: trigger_config,
  comp: comp,
  call: call
};
